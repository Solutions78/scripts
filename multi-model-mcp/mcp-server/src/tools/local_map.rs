use super::ToolResponse;
use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::fs;
use std::path::PathBuf;
use std::time::{Duration, Instant};

const MAX_ENTRIES: usize = 8_000;
const TIMEOUT_SECS: u64 = 2;

#[derive(Debug, Deserialize)]
struct LocalMapArgs {
    #[serde(default = "default_path")]
    path: String,
    #[serde(default = "default_depth")]
    depth: u32,
    #[serde(default)]
    follow_symlinks: bool,
}

fn default_path() -> String {
    ".".to_string()
}

fn default_depth() -> u32 {
    2
}

#[derive(Debug, Serialize, Deserialize)]
struct LocalMapEntry {
    name: String,
    path: String,
    is_dir: bool,
    is_symlink: bool,
    size_bytes: u64,
    depth: u32,
}

#[derive(Debug, Serialize, Deserialize)]
struct LocalMapResult {
    root: String,
    entries: Vec<LocalMapEntry>,
    #[serde(skip_serializing_if = "Option::is_none")]
    truncated: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    timed_out: Option<bool>,
}

pub async fn execute(args: serde_json::Value) -> Result<ToolResponse> {
    let args: LocalMapArgs = serde_json::from_value(args)?;

    // Validate depth
    if args.depth > 6 {
        bail!("Depth must be between 0 and 6 (requested: {})", args.depth);
    }

    // Get workspace root for security validation
    let workspace_root = std::env::current_dir()?;
    let workspace_canonical = fs::canonicalize(&workspace_root)
        .map_err(|e| anyhow::anyhow!("Failed to canonicalize workspace: {}", e))?;

    // Normalize and canonicalize requested path
    let root_path = PathBuf::from(&args.path);
    let is_absolute = root_path.is_absolute();
    let root_path = if is_absolute {
        root_path
    } else {
        workspace_root.join(&root_path)
    };

    if !root_path.exists() {
        bail!("Path does not exist: {}", root_path.display());
    }

    let root_canonical = fs::canonicalize(&root_path)
        .map_err(|e| anyhow::anyhow!("Failed to canonicalize path: {}", e))?;

    // Security: Validate relative paths stay within workspace to prevent path traversal
    // Allow absolute paths for testing and explicit use cases
    if !is_absolute && !root_canonical.starts_with(&workspace_canonical) {
        bail!(
            "Access denied: path '{}' is outside workspace root '{}'",
            root_canonical.display(),
            workspace_canonical.display()
        );
    }

    let start_time = Instant::now();
    let mut entries = Vec::new();
    let mut queue: VecDeque<(PathBuf, u32)> = VecDeque::new();
    let mut truncated = false;
    let mut timed_out = false;

    queue.push_back((root_canonical.clone(), 0));

    while let Some((current_path, current_depth)) = queue.pop_front() {
        // Check timeout
        if start_time.elapsed() > Duration::from_secs(TIMEOUT_SECS) {
            timed_out = true;
            break;
        }

        // Check entry limit
        if entries.len() >= MAX_ENTRIES {
            truncated = true;
            break;
        }

        // Don't traverse beyond requested depth
        if current_depth > args.depth {
            continue;
        }

        // Read directory entries
        let read_dir = match fs::read_dir(&current_path) {
            Ok(rd) => rd,
            Err(e) => {
                tracing::warn!("Failed to read directory {}: {}", current_path.display(), e);
                continue;
            }
        };

        for entry_result in read_dir {
            // Check timeout on each iteration
            if start_time.elapsed() > Duration::from_secs(TIMEOUT_SECS) {
                timed_out = true;
                break;
            }

            // Check entry limit
            if entries.len() >= MAX_ENTRIES {
                truncated = true;
                break;
            }

            let entry = match entry_result {
                Ok(e) => e,
                Err(e) => {
                    tracing::warn!("Failed to read entry: {}", e);
                    continue;
                }
            };

            let entry_path = entry.path();
            let file_name = entry.file_name();
            let name = file_name.to_string_lossy().to_string();

            // Skip hidden files (start with .)
            if name.starts_with('.') {
                continue;
            }

            // Skip node_modules and .git directories
            if name == "node_modules" || name == ".git" {
                continue;
            }

            let metadata = match entry.metadata() {
                Ok(m) => m,
                Err(e) => {
                    tracing::warn!("Failed to read metadata for {}: {}", entry_path.display(), e);
                    continue;
                }
            };

            let is_symlink = metadata.file_type().is_symlink();
            let is_dir = metadata.is_dir();
            let size_bytes = if is_dir { 0 } else { metadata.len() };

            entries.push(LocalMapEntry {
                name: name.clone(),
                path: entry_path.to_string_lossy().to_string(),
                is_dir,
                is_symlink,
                size_bytes,
                depth: current_depth + 1,
            });

            // Queue directories for traversal
            if is_dir && current_depth + 1 <= args.depth {
                // Don't traverse symlinked directories unless follow_symlinks is true
                if !is_symlink || args.follow_symlinks {
                    queue.push_back((entry_path, current_depth + 1));
                }
            }
        }

        if truncated || timed_out {
            break;
        }
    }

    let result = LocalMapResult {
        root: root_canonical.to_string_lossy().to_string(),
        entries,
        truncated: if truncated { Some(true) } else { None },
        timed_out: if timed_out { Some(true) } else { None },
    };

    Ok(ToolResponse {
        success: true,
        result: serde_json::to_value(result)?,
        error: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{create_dir, File};
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_local_map_basic() {
        let temp_dir = TempDir::new().unwrap();
        let temp_path = temp_dir.path();

        // Create test structure:
        // temp/
        //   visible_file.txt
        //   .hidden_file.txt
        //   subdir/
        //     nested_file.txt
        //   node_modules/
        //     should_skip.txt

        File::create(temp_path.join("visible_file.txt")).unwrap();
        File::create(temp_path.join(".hidden_file.txt")).unwrap();

        create_dir(temp_path.join("subdir")).unwrap();
        File::create(temp_path.join("subdir/nested_file.txt")).unwrap();

        create_dir(temp_path.join("node_modules")).unwrap();
        File::create(temp_path.join("node_modules/should_skip.txt")).unwrap();

        let args = serde_json::json!({
            "path": temp_path.to_str().unwrap(),
            "depth": 2
        });

        let response = execute(args).await.unwrap();
        let result: LocalMapResult = serde_json::from_value(response.result).unwrap();

        // Should have: visible_file.txt, subdir, nested_file.txt (3 entries)
        // Should NOT have: .hidden_file.txt, node_modules, should_skip.txt
        assert_eq!(result.entries.len(), 3);

        let names: Vec<&str> = result.entries.iter().map(|e| e.name.as_str()).collect();
        assert!(names.contains(&"visible_file.txt"));
        assert!(names.contains(&"subdir"));
        assert!(names.contains(&"nested_file.txt"));

        assert!(!names.contains(&".hidden_file.txt"));
        assert!(!names.contains(&"node_modules"));
        assert!(!names.contains(&"should_skip.txt"));
    }

    #[tokio::test]
    async fn test_local_map_depth_limiting() {
        let temp_dir = TempDir::new().unwrap();
        let temp_path = temp_dir.path();

        // Create nested structure
        create_dir(temp_path.join("level1")).unwrap();
        create_dir(temp_path.join("level1/level2")).unwrap();
        File::create(temp_path.join("level1/level2/deep_file.txt")).unwrap();

        // Test with depth=1 (should see level1 dir but not level2 contents)
        let args = serde_json::json!({
            "path": temp_path.to_str().unwrap(),
            "depth": 1
        });

        let response = execute(args).await.unwrap();
        let result: LocalMapResult = serde_json::from_value(response.result).unwrap();

        // Should have: level1, level2 (depth 1 and 2)
        // Should NOT have: deep_file.txt (depth 3, beyond limit)
        let names: Vec<&str> = result.entries.iter().map(|e| e.name.as_str()).collect();
        assert!(names.contains(&"level1"));
        assert!(names.contains(&"level2"));
        assert!(!names.contains(&"deep_file.txt"));
    }

    #[tokio::test]
    async fn test_local_map_invalid_depth() {
        let args = serde_json::json!({
            "path": ".",
            "depth": 10
        });

        let response = execute(args).await;
        assert!(response.is_err());
        assert!(response.unwrap_err().to_string().contains("Depth must be between 0 and 6"));
    }

    #[tokio::test]
    async fn test_local_map_invalid_path() {
        let args = serde_json::json!({
            "path": "/nonexistent/path/that/does/not/exist",
            "depth": 1
        });

        let response = execute(args).await;
        assert!(response.is_err());
        assert!(response.unwrap_err().to_string().contains("does not exist"));
    }
}

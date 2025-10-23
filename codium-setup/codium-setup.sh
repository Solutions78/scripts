#!/bin/bash
# VS Codium post-install setup for Raspberry Pi (aarch64)

# Core extensions for Python and tooling
EXTENSIONS=(
    "ms-python.python"
    "ms-python.vscode-pylance"
    "ms-toolsai.jupyter"
    "ms-toolsai.jupyter-keymap"
    "ms-toolsai.jupyter-renderers"
    "ms-azuretools.vscode-docker"
    "ms-vscode.cpptools"
    "eamodio.gitlens"
    "mhutchie.git-graph"
    "ms-vscode.vscode-typescript-next"
    "VisualStudioExptTeam.vscodeintellicode"
    "esbenp.prettier-vscode"
    "streetsidesoftware.code-spell-checker"
)

echo "Installing extensions..."
for ext in "${EXTENSIONS[@]}"; do
    codium --install-extension "$ext" --force
done

echo "All extensions installed successfully."

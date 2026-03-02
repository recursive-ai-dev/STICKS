## 2023-10-27 - [Path Traversal in Animation Loading]
**Vulnerability:** The `loadAnimation` function in `modular_stickman/animations.js` allowed arbitrary file reads on the host system by accepting unsanitized `animationName` inputs (e.g., `../../package.json`).
**Learning:** Using `path.join` with user-controlled input without validation can lead to path traversal, even when a base directory is specified.
**Prevention:** Always validate file names against directory traversal sequences (`..`, `/`, `\`) and ensure they are of the expected type (string) before performing file system operations.

## 2024-05-15 - [Path Traversal in Procedural Animation Generation]
**Vulnerability:** The `procedural_animation_generator.js` accepted a `--name` argument that was used to construct an output file path without any validation, allowing arbitrary file overwrites.
**Learning:** Security vulnerabilities can exist in generator/build scripts, not just in the main application logic. If these scripts are exposed or can be triggered with user-controlled parameters, they pose a significant risk.
**Prevention:** Apply the same rigorous input validation to CLI tools and scripts as to production APIs, especially when they involve file system operations or command execution.

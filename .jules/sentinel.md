## 2023-10-27 - [Path Traversal in Animation Loading]
**Vulnerability:** The `loadAnimation` function in `modular_stickman/animations.js` allowed arbitrary file reads on the host system by accepting unsanitized `animationName` inputs (e.g., `../../package.json`).
**Learning:** Using `path.join` with user-controlled input without validation can lead to path traversal, even when a base directory is specified.
**Prevention:** Always validate file names against directory traversal sequences (`..`, `/`, `\`) and ensure they are of the expected type (string) before performing file system operations.

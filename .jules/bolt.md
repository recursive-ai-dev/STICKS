## 2024-05-24 - [Animation System Cache]
**Learning:** High-frequency rendering loops that call synchronous disk I/O and JSON parsing (like `loadAnimation` on every frame) create a significant performance bottleneck. In Node.js environments where these files are accessed frequently, an in-memory cache provides an order-of-magnitude speedup.
**Action:** Always check if frequently called resource-loading functions can benefit from memoization or simple caching, especially when they involve synchronous I/O.

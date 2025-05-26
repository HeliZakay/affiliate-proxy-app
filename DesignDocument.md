# System Design and Implementation

_For quickstart and setup instructions, see [README.md](README.md)._

## 1. Architecture and Design Choices

- **Modular Service**

  - **`config.js`**, **`redisClient.js`**, **`routes.js`**, **`app.js`**, **`server.js`**
  - Promotes separation of concerns, testability, and easy maintenance.

- **Containerization & Build**

  - Docker Compose for local dev (Node + Redis).
  - Multi-stage Dockerfile for CI/CD: builds dependencies in a builder stage, prunes devDeps in the final image.

- **Redis as Storage**

  - High-throughput in-memory key/value store.
  - Uses **hashes** (`HSET`/`HGETALL`) and **atomic operations** (`MULTI`/`EXEC`) for consistency.

- **Health & Observability**
  - **`/health`** endpoint checks Redis connectivity.
  - Graceful shutdown on `SIGINT`/`SIGTERM`.
  - Structured JSON logs via Pino at HTTP, Redis, and server layers.

## 2. Data Structures and Storage Mechanism

- **Forward Mapping Key**: `map:{keyword}:{src}:{creative}` (Redis hash)

  - Fields:

    - `our_param`: the internal identifier (10-char NanoID)
    - `created_at`: ISO timestamp of generation or last refresh

- **Reverse Mapping Key**: `rev:{our_param}` (Redis hash)

  - Fields:

    - `payload`: JSON string of `{ keyword, src, creative }`
    - `created_at`: ISO timestamp matching forward mapping

## 3. Methods for Consistency and Reversibility

- **Atomic Writes**: Using `MULTI` or `HSET` on hashes guarantees that both forward and reverse mappings are written together.
- **Idempotency**: Repeated requests for the same `keyword+src+creative` without `refresh` read from the existing hash, ensuring consistent `our_param`.
- **Reverse Lookup**: The retrieval endpoint reads from `rev:{our_param}` to reconstruct the original traffic parameters.

## 4. Refresh Mechanism

- When `?refresh=true` is passed:

  1. A brand-new `our_param` is generated via `nanoid(10)`
  2. Both hashes are overwritten with the new identifier and updated `created_at`
  3. Old values are not deleted, so a history of stale keys persists if desired for auditing

- **Tracking Refreshes**: Each refresh updates `created_at`—you could push old IDs into a Redis list for full history.

## 5. Security Considerations

- **Input Validation**
  - `express-validator` enforces presence and format of all query params.
- **API Key Protection**
  - `retrieve_original` requires `x-api-key` or `api_key` matching `API_KEY` env var.
- **Rate Limiting** (future)
  - Integrate `express-rate-limit` to throttle abusive traffic.
- **HTTPS & CORS**
  - Serve behind TLS-terminating proxy; restrict redirect origins via CORS.
- **Audit Logging**
  - Every refresh is timestamped; could be extended with Redis lists for full history.

## 6. Performance, Testing & CI/CD

- **Redis** for sub-ms lookups, 1M req/day throughput.
- **Connection Pooling** via singleton Redis client.
- **Lightweight Stack**: Express + NanoID + Pino.
- **Automated Tests**: Jest/Supertest cover redirect, retrieval, edge cases.
- **CI/CD**: Pipeline runs `npm test`, `docker build --target runtime`, and `docker compose up --build --abort-on-container-exit` for smoke tests.

---

# Future Improvements & Extensions

1. **Metrics & Monitoring**

   - Expose Prometheus metrics for request rates, latency, Redis errors, etc.

2. **Enhanced Refresh History**

   - Store an append-only log of previous `our_param` values for each composite key.

3. **Distributed Caching**

   - Add a local in-memory cache (e.g. LRU) to reduce Redis round-trips for hot keys.

4. **High Availability**

   - Deploy Redis in a clustered or replicated mode; container orchestrator with health probes.

5. **Security Hardening**

   - **API Key Protection**: Retrieval endpoint requires a valid `x-api-key` header or `api_key` query parameter, enforced via `API_KEY` from the environment.
   - **Rate Limiting**: Enforce rate limits using middleware (e.g. `express-rate-limit`).

6. **Feature Extensions**

   - Web UI for visualizing mappings and refresh history.
   - Bulk import/export of traffic mappings.

7. **Edge-Case Integration Tests**

   - Add tests for invalid `refresh` values, excessively long params, and Redis downtime to ensure robust error handling.

_This document accompanies the POC codebase for an Innovation Developer interview task._

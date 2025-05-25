# System Design and Implementation

## 1. Architecture and Design Choices

- **Service-Oriented**: We built a single Express-based microservice (`app.js`) responsible for:

  1. Accepting incoming traffic source requests
  2. Generating or retrieving an internal identifier (`our_param`)
  3. Redirecting users to the affiliate link
  4. Exposing a retrieval API

- **Containerization**: The entire stack (Node service + Redis) runs via Docker Compose, ensuring consistent environments and easy local testing.
- **Redis as Storage**: Chosen for high-throughput key/value operations. We leverage:

  - **Hashes** (`HSET`/`HGETALL`) to store mappings and metadata atomically
  - **Atomic operations** (`MULTI`/`EXEC`) to ensure consistency

- **Logging and Observability**: Instrumented with Pino for structured JSON logs at every layer (HTTP, Redis client, server lifecycle).

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

- **Parameter Validation**: `express-validator` enforces required types and whitelists allowed values, preventing injection attacks.
- **No Sensitive Data in Logs**: Only non-PII request metadata is logged.
- **Rate Limiting**: Though not implemented in POC, integrating rate-limit middleware (e.g. `express-rate-limit`) would prevent abuse.
- **HTTPS in Production**: The service should sit behind a TLS-terminating reverse proxy (e.g. NGINX or AWS ALB).

## 6. Performance Optimizations

- **Redis**: Chosen for sub-millisecond lookups and high write throughput (1M req/day easily handled).
- **Connection Pooling**: The Redis client is a singleton reused across requests.
- **Lightweight Framework**: Express + NanoID + Pino keeps the binary small and fast.
- **Docker Multi-stage**: (Optional) Use multi-stage builds to minimize container size in CI/CD.

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

   - Add authentication/authorization to the retrieval API.
   - Enforce rate limits and API keys for partner integrations.

6. **Feature Extensions**

   - Web UI for visualizing mappings and refresh history.
   - Bulk import/export of traffic mappings.

_This document accompanies the POC codebase for an Innovation Developer interview task._

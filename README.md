# Affiliate Redirect POC

This proof-of-concept implements a traffic-source redirect service with an internal parameter mapping to an affiliate link. It demonstrates:

- Accepting `keyword`, `src`, and `creative` query parameters
- Generating a 10‑character NanoID (`our_param`) for each unique combination
- Redirecting to the affiliate URL with only `our_param` exposed
- Retrieving original parameters via a secure API endpoint
- Refreshing mappings on demand
- Storing mappings and metadata in Redis using atomic hashes
- Health checks, structured logging (Pino), validation, and API-key protection

## 📂 Project Structure

```
affiliate-redirect-poc/
├── app.js               # Express app setup
├── server.js            # HTTP server bootstrap & graceful shutdown
├── routes.js            # All HTTP route handlers
├── redisClient.js       # Redis client initialization with logging
├── config.js            # Environment variable configuration
├── logger.js            # Pino logger configuration
├── validation.js        # express-validator chains
├── Dockerfile           # Multi-stage build for production image
├── docker-compose.yml   # Compose file for app + Redis
├── .env                 # Environment variables (not checked in)
├── __tests__/app.test.js# Jest/Supertest integration tests
└── README.md            # This file
```

## ⚡ Quickstart

### Prerequisites

- Docker & Docker Compose V2 installed
- Node.js & npm (for running tests locally)

### Setup

1. **Clone** the repository:

   ```bash
   git clone <repo-url>
   cd affiliate-redirect-poc
   ```

2. **Create** a `.env` file at the project root:

   ```ini
   PORT=3000
   REDIS_URL=redis://redis:6379
   AFFILIATE_BASE_URL=https://affiliate-network.com
   API_KEY=your_secret_key_here
   NODE_ENV=development
   ```

3. **Start** the stack (Redis + app) in detached mode:

   ```bash
   docker compose up --build -d
   ```

4. **Verify** services:

   ```bash
   docker compose ps
   ```

### Logs

To stream logs in real time:

```bash
docker compose logs -f app
```

## 🚀 Usage

### Health check

```bash
curl http://localhost:3000/health
# → {"status":"ok"}
```

### Redirect

```bash
# First-time mapping
curl -i "http://localhost:3000/?keyword=shoes&src=google&creative=1234"
# → HTTP 302 with Location: https://affiliate-network.com?our_param=XXXXXXXXXX
```

```bash
# Force a refresh of the mapping
curl -i "http://localhost:3000/?keyword=shoes&src=google&creative=1234&refresh=true"
```

### Retrieve Original Parameters

```bash
# Must include API key
curl -H "x-api-key: your_secret_key_here" \
  "http://localhost:3000/retrieve_original?our_param=XXXXXXXXXX"
# → {"keyword":"shoes","src":"google","creative":"1234","created_at":"..."}
```

## ✅ Testing

Run the full test suite locally (requires Node.js):

```bash
npm install
npm test
```

All integration tests use a real Redis instance and validate both happy paths and edge cases.

## 🛡️ Security

- Input validation via `express-validator`
- API-key protection on retrieval endpoint
- Structured JSON logging with Pino (no sensitive data)
- Graceful shutdown and global error handlers

## 📈 Future Improvements

- Rate limiting middleware (e.g. `express-rate-limit`)
- Prometheus metrics endpoint
- Audit trail and cache invalidation policies
- High-availability Redis cluster
- Web UI for mapping management

---

_© 2025 Innovation Developer POC_

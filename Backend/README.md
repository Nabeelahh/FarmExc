# FarmExchange — Backend

This directory contains the off-chain backend infrastructure for FarmExchange: the application server, the contract-event indexer, and the oracle bridge service. None of these services hold custody of funds — all value transfer happens on-chain in the Soroban contracts under `/contracts`. The backend exists to make that on-chain activity usable: authentication, KYC orchestration, off-chain data feeds, queryable history, and notifications.

```text
backend/
├── api/
├── indexer/
├── oracle-service/
└── README.md          # you are here
```

---

## Services Overview

| Service | Purpose | Talks to chain? |
|---|---|---|
| `api` | REST/WebSocket server for the frontend; campaign metadata, KYC orchestration, agent management, notifications | Reads + submits transactions via Stellar SDK |
| `indexer` | Subscribes to Soroban contract events, builds queryable historical views for dashboards | Reads only (event subscription) |
| `oracle-service` | Pulls weather/satellite data, formats and submits it on-chain for insurance triggers and milestone cross-checks | Submits oracle update transactions |

These are deployed as separate processes so the indexer and oracle service can scale, restart, and fail independently of the user-facing API.

---

## 1. `api/` — Application Server

### Responsibility

The `api` service is the system of record for everything that is **not** suitable to store on-chain: user profiles, campaign descriptions and media, agent assignments, KYC status, and notification preferences. It also acts as the orchestration layer that prepares and (where the user has delegated signing) submits Soroban transactions.

### Tech Stack

- **NestJS** (TypeScript) — modular structure, dependency injection, guards for auth
- **PostgreSQL** — primary datastore
- **Prisma ORM** — schema + migrations
- **Redis** — session cache, rate limiting, job queue backing (BullMQ)
- **Stellar SDK / Soroban client** — transaction building and submission
- **REST + WebSocket** — REST for standard CRUD, WebSocket for live campaign/funding status updates

### Folder Structure

```text
api/
├── src/
│   ├── modules/
│   │   ├── auth/                # Wallet-based auth (challenge-response signing), session management
│   │   ├── users/                # Farmer, investor, buyer, agent profiles
│   │   ├── kyc/                  # Stellar1KYC integration — see below
│   │   ├── campaigns/            # Campaign creation, milestone definitions, status
│   │   ├── investors/            # Funding contributions, position token tracking (read-side)
│   │   ├── agents/                # Field agent registration, staking status, attestation submission
│   │   ├── marketplace/          # Harvest listings, forward contracts (metadata + status)
│   │   ├── insurance/            # Risk reserve status, payout history (read-side)
│   │   ├── reputation/           # Reputation score read API
│   │   └── notifications/        # Email/SMS/push for milestone updates, payouts, disputes
│   ├── common/
│   │   ├── guards/                # Auth guards, role guards
│   │   ├── interceptors/
│   │   ├── filters/                # Exception filters
│   │   └── decorators/
│   ├── contracts-client/          # Thin wrapper around the Soroban SDK calls used across modules
│   ├── config/
│   └── main.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── test/
└── package.json
```

### Module Notes

**`auth`**
Authentication is wallet-based, not password-based. Flow: client requests a one-time challenge → signs it with their Stellar keypair → server verifies the signature and issues a session token (JWT, short-lived, refreshed via Redis-backed refresh tokens). Field agents and cooperative admins additionally carry a role claim used by route guards.

**`kyc`**
Wraps calls to the Stellar1KYC service rather than reimplementing identity verification. On registration, this module:
1. Checks if the user already has a valid Stellar1KYC credential (the "verify once, use everywhere" model).
2. If not, initiates the verification flow and stores only the resulting credential reference — never raw KYC documents — in our database.
3. Exposes a `kycStatus` field consumed by `campaigns` and `agents` to gate actions that require verified identity (e.g., a farmer cannot launch a campaign, an agent cannot stake, until KYC clears).

**`campaigns`**
Stores campaign metadata not suited for on-chain storage (descriptions, images, cooperative grouping, milestone narrative text). The actual funding-pool contract address, target amount, and on-chain status are fetched live via `contracts-client` and cached briefly in Redis — this module is intentionally not a second source of truth for fund amounts.

**`agents`**
Manages field agent lifecycle: registration, KYC gating, stake-bond status (read from the relevant contract), and the milestone attestation submission endpoint. Attestation submissions (GPS + photo + signature) are received here, validated, and forwarded to the escrow contract; the photo/GPS evidence itself is stored in object storage (not in Postgres) with only a reference hash kept in the database for audit purposes.

**`marketplace`**
Metadata layer for harvest listings and forward contracts. Listing creation here triggers the corresponding on-chain marketplace contract call; this module does not hold buyer funds at any point.

**`insurance`**
Read-side API for risk reserve balance and payout history, sourced from the indexer rather than querying the chain directly on every request (avoids redundant RPC load — see Indexer below).

**`notifications`**
Listens to indexer-emitted events (funding milestones hit, payout triggered, dispute opened) and a job queue (BullMQ on Redis) fans these out as email/SMS/push. SMS is treated as a first-class channel given the target user base may not reliably use a mobile app.

### Database Schema (high level)

```text
User            (id, role, wallet_address, kyc_status, kyc_credential_ref, ...)
Campaign        (id, farmer_id|cooperative_id, contract_address, status, milestones[], ...)
Agent           (id, user_id, stake_status, region, ...)
Attestation     (id, campaign_id, agent_id, milestone, evidence_hash, status, signed_at)
Listing         (id, campaign_id, product, quantity, price, status)
ForwardContract (id, listing_id, buyer_id, locked_price, status)
Notification    (id, user_id, type, payload, sent_at)
```

This is intentionally a thin schema — campaign financials, position-token ownership, and reputation scores are sourced from chain/indexer, not duplicated here, to avoid drift between on-chain truth and off-chain cache.

### Key REST Endpoints (representative, not exhaustive)

```text
POST   /auth/challenge
POST   /auth/verify
GET    /campaigns
POST   /campaigns
GET    /campaigns/:id
POST   /campaigns/:id/milestones/:milestoneId/attest
GET    /agents/:id/status
POST   /marketplace/listings
POST   /marketplace/forward-contracts
GET    /investors/:walletAddress/positions
GET    /reputation/:entityId
```

### WebSocket Events

```text
campaign.fundingUpdated
campaign.milestoneAttested
campaign.milestoneDisputed
insurance.payoutTriggered
marketplace.listingSold
```

Used by the frontend dashboard for live status without polling.

---

## 2. `indexer/` — Contract Event Indexer

### Responsibility

Soroban contract state is optimized for contract execution, not for analytics or historical queries ("show me this investor's funding history across all campaigns" is expensive to compute directly from chain state on every request). The indexer solves this by subscribing to contract events, persisting them into a queryable store, and serving aggregate views to the `api` service and notification pipeline.

### Tech Stack

- Node.js worker process
- Stellar RPC / Soroban event subscription
- PostgreSQL (separate schema or database from `api`, to isolate write load)
- Redis (for pub/sub fan-out to `notifications`)

### Folder Structure

```text
indexer/
├── src/
│   ├── listeners/
│   │   ├── fundingPool.listener.ts
│   │   ├── escrow.listener.ts
│   │   ├── marketplace.listener.ts
│   │   ├── repayment.listener.ts
│   │   ├── insurance.listener.ts
│   │   └── reputation.listener.ts
│   ├── aggregators/
│   │   ├── campaignHistory.ts
│   │   ├── investorPortfolio.ts
│   │   └── reputationTrend.ts
│   ├── db/
│   │   ├── schema/
│   │   └── migrations/
│   └── main.ts
└── package.json
```

### How It Works

1. Each `listener` subscribes to a specific contract's emitted events (deposit made, milestone released, payout distributed, position transferred, reputation updated).
2. Raw events are persisted append-only (event log, never mutated) for auditability.
3. `aggregators` run on a schedule or on-event to build denormalized views — e.g., `investorPortfolio` maintains a running per-wallet summary so `GET /investors/:walletAddress/positions` in `api` is a fast read rather than a chain scan.
4. New events are also published to Redis so `notifications` can react in near-real-time without polling Postgres.

### Reindexing & Recovery

The indexer tracks the last processed ledger sequence per contract. On restart, it resumes from that checkpoint. A full reindex (from contract genesis) is supported as a recovery path if aggregate tables ever need to be rebuilt — this is why raw events are kept append-only rather than only storing aggregates.

---

## 3. `oracle-service/` — Off-Chain Data Bridge

### Responsibility

Two parts of the protocol need real-world data the chain cannot natively access:

- **Parametric insurance** needs rainfall/weather data to evaluate payout triggers.
- **Milestone verification** is strengthened by satellite/NDVI crop-health data cross-checked against agent attestations (Phase 2).

This service is the only backend component that **submits** data on-chain (as opposed to only reading); it is treated as a higher-trust component and is run with its own restricted signing key, separate from the `api` service's operational key.

### Folder Structure

```text
oracle-service/
├── src/
│   ├── weather/
│   │   ├── provider.ts          # Weather data provider client
│   │   └── trigger-evaluator.ts # Compares observed data against campaign insurance thresholds
│   ├── satellite/
│   │   ├── provider.ts          # NDVI/imagery provider client
│   │   └── milestone-crosscheck.ts
│   ├── submission/
│   │   └── oracleTxBuilder.ts   # Builds and signs the on-chain oracle update transaction
│   └── main.ts
├── config/
│   └── providers.config.ts
└── package.json
```

### How It Works

1. On a schedule (e.g., daily during a campaign's growing window), `weather/provider.ts` pulls rainfall data for each active campaign's registered region.
2. `trigger-evaluator.ts` compares observed data against the campaign's insurance contract thresholds.
3. If a threshold condition is met (or for routine updates, regardless), `oracleTxBuilder.ts` constructs a signed transaction updating the relevant contract's oracle-readable state.
4. The `insurance` contract independently evaluates whether a payout condition is satisfied — this service supplies data, it does not decide payouts. That logic lives on-chain so it's auditable and not solely trusted from an off-chain process.

### Why This Is a Separate Service

Keeping oracle submission isolated from the general-purpose `api` service limits blast radius: a compromised or buggy API deployment cannot forge oracle data, and the oracle signing key never needs to be available to the broader application server.

---

## Environment Variables (representative)

```text
# api
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
STELLAR_NETWORK=testnet|mainnet
STELLAR_RPC_URL=
STELLAR1KYC_API_URL=
STELLAR1KYC_API_KEY=

# indexer
INDEXER_DATABASE_URL=
STELLAR_RPC_URL=
CONTRACT_ADDRESSES_JSON=

# oracle-service
ORACLE_SIGNING_KEY=          # restricted key, never shared with api
WEATHER_PROVIDER_API_KEY=
SATELLITE_PROVIDER_API_KEY=
STELLAR_RPC_URL=
```

Secrets are expected to be injected via the deployment environment (not committed) — see `.env.example` in each service for the full list.

---

## Local Development

```bash
# from backend/api
npm install
npx prisma migrate dev
npm run start:dev

# from backend/indexer
npm install
npm run start:dev

# from backend/oracle-service
npm install
npm run start:dev
```

All three can run concurrently against a local Postgres + Redis instance (a `docker-compose.yml` for these dependencies is recommended at the `backend/` root, even though service code stays split by directory).

---

## Testing

- **`api`**: unit tests per module (Jest), plus integration tests against a test Soroban network (Futurenet/testnet) for the `contracts-client` wrapper.
- **`indexer`**: replay-based tests using recorded contract event fixtures to verify aggregator correctness.
- **`oracle-service`**: trigger-evaluator logic is tested with historical weather data fixtures to confirm payout thresholds fire correctly without needing live provider calls in CI.

---

## Security Notes
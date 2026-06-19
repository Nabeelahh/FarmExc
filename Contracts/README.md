# FarmExchange — Smart Contracts

This directory contains the Soroban (Rust) smart contracts that hold and move funds, gate releases on milestone verification, and represent investor positions and reputation as on-chain assets. These contracts are the source of truth for the protocol — the `backend/` services read from and submit to them, but never hold custody themselves.

```text
contracts/
├── funding-pool/
├── escrow/
├── marketplace/
├── repayment/
├── insurance/
├── reputation/
├── shared/
└── README.md          # you are here
```

---

## Design Principles

- **No off-chain custody.** Funds move directly between investor, escrow, and farmer/buyer addresses via contract logic. The backend can prepare and relay transactions but cannot unilaterally move funds.
- **Oracles supply data, contracts decide outcomes.** The `oracle-service` submits weather/satellite readings; whether a payout or milestone release actually fires is evaluated by contract logic, not asserted by the off-chain submitter.
- **Composability over silos.** Investor positions and reputation are minted as transferable/non-transferable tokens respectively, so they're usable outside FarmExchange's own frontend.
- **Fail safe, not fail silent.** Disputed or ambiguous states (contested milestones, threshold edge cases) default to holding funds in escrow pending resolution, not releasing by default.

---

## Contract Overview

| Contract | Holds funds? | Mints tokens? | Depends on |
|---|---|---|---|
| `funding-pool` | Yes (until forwarded to escrow) | Yes — investor position tokens | `shared` |
| `escrow` | Yes | No | `funding-pool`, `reputation` (reads agent stake) |
| `marketplace` | Yes (buyer funds in transit) | No | `escrow`, `reputation` |
| `repayment` | Transiently (during distribution) | No | `funding-pool`, `escrow`, `insurance` |
| `insurance` | Yes (risk reserve) | No | `repayment`, oracle data feed |
| `reputation` | No | Yes — soulbound (non-transferable) score tokens | `shared` |
| `shared` | No | No | — |

---

## 1. `funding-pool/`

### Responsibility

Creates campaigns, accepts investor deposits, and mints a transferable token representing each investor's proportional claim on that campaign's eventual repayment.

### Key State

```text
Campaign {
    id: u64,
    farmer_or_cooperative: Address,
    target_amount: i128,
    raised_amount: i128,
    asset: Address,            // USDC or XLM contract address
    milestones: Vec<Milestone>,
    status: CampaignStatus,    // Open, Funded, Active, Completed, Defaulted
}
```

### Key Functions

```rust
fn create_campaign(env: Env, farmer: Address, target: i128, asset: Address, milestones: Vec<Milestone>) -> u64;
fn deposit(env: Env, investor: Address, campaign_id: u64, amount: i128);
fn close_funding(env: Env, campaign_id: u64);
fn get_position(env: Env, investor: Address, campaign_id: u64) -> i128;
fn transfer_position(env: Env, from: Address, to: Address, campaign_id: u64, amount: i128);
```

### Position Tokens

Each `deposit` mints (or increases) a position-token balance for the investor, scoped per campaign. `transfer_position` allows secondary transfer before the campaign settles — this is what gives investors exit liquidity instead of being locked in until harvest. Position tokens are implemented as a lightweight balance map within this contract rather than a separate SAC per campaign, to avoid the overhead of deploying a new asset contract for every campaign; a SAC-wrapped version is a Phase 2 consideration if secondary-market tooling needs standard token interfaces.

### Events Emitted

```text
campaign_created(campaign_id, farmer, target)
deposit_made(campaign_id, investor, amount)
funding_closed(campaign_id, raised_amount)
position_transferred(campaign_id, from, to, amount)
```

### Invariants

- `raised_amount` never exceeds `target_amount` (excess deposits rejected, not partially accepted).
- Funds only move to `escrow` once `close_funding` is called — `funding-pool` never pays a farmer or buyer directly.

---

## 2. `escrow/`

### Responsibility

Holds funds transferred from a closed `funding-pool` campaign and releases them incrementally as milestones are verified.

### Key State

```text
Milestone {
    name: Symbol,
    release_amount: i128,
    status: MilestoneStatus,   // Pending, Attested, Disputed, Released
    attestations: Vec<Attestation>,
}

Attestation {
    agent: Address,
    evidence_hash: BytesN<32>,  // hash of photo/GPS evidence stored off-chain
    signed_at: u64,
}
```

### Key Functions

```rust
fn fund_escrow(env: Env, campaign_id: u64, amount: i128);
fn submit_attestation(env: Env, campaign_id: u64, milestone_idx: u32, agent: Address, evidence_hash: BytesN<32>);
fn release_milestone(env: Env, campaign_id: u64, milestone_idx: u32);
fn raise_dispute(env: Env, campaign_id: u64, milestone_idx: u32, disputer: Address);
fn resolve_dispute(env: Env, campaign_id: u64, milestone_idx: u32, signers: Vec<Address>, approve: bool);
```

### Milestone Release Logic

1. A registered, staked agent calls `submit_attestation` with a hash of their off-chain evidence (GPS + photo, stored in object storage by the backend — only the hash lives on-chain for integrity verification).
2. For low-value milestones, a single agent attestation is sufficient and `release_milestone` can be called once attested.
3. For high-value or flagged milestones, `release_milestone` requires the multi-party threshold defined in `shared::DisputeConfig` (default: 2-of-3 independent agents) before funds move.
4. `raise_dispute` can be called by the farmer, an investor, or another agent within a defined window after attestation, freezing release pending `resolve_dispute`.
5. A fraudulent attestation that is later overturned via dispute resolution triggers a slashing call against the attesting agent's stake (held and enforced in `reputation`/agent-staking logic — see below).

### Why Evidence Hashes, Not Raw Evidence, On-Chain

Storing a hash rather than the photo/GPS payload keeps the contract cheap to call and avoids putting potentially large or sensitive media on a public ledger. The hash lets anyone verify that the evidence referenced by the backend hasn't been altered after the fact, without requiring the chain itself to store it.

### Events Emitted

```text
escrow_funded(campaign_id, amount)
milestone_attested(campaign_id, milestone_idx, agent)
milestone_released(campaign_id, milestone_idx, amount)
dispute_raised(campaign_id, milestone_idx, disputer)
dispute_resolved(campaign_id, milestone_idx, approved)
```

---

## 3. `marketplace/`

### Responsibility

Lists harvested products for sale, supports forward contracts agreed before harvest, and escrows buyer funds until delivery is confirmed.

### Key State

```text
Listing {
    id: u64,
    campaign_id: u64,
    product: Symbol,
    quantity: i128,
    price_per_unit: i128,
    status: ListingStatus,      // Open, ForwardLocked, Sold, Delivered, Disputed
}

ForwardContract {
    listing_id: u64,
    buyer: Address,
    locked_price: i128,
    locked_quantity: i128,
    delivery_deadline: u64,
}
```

### Key Functions

```rust
fn create_listing(env: Env, campaign_id: u64, product: Symbol, quantity: i128, price: i128) -> u64;
fn lock_forward_contract(env: Env, listing_id: u64, buyer: Address, quantity: i128, deadline: u64);
fn purchase(env: Env, listing_id: u64, buyer: Address, amount_paid: i128);
fn confirm_delivery(env: Env, listing_id: u64, buyer: Address);
fn raise_delivery_dispute(env: Env, listing_idx: u64, disputer: Address);
```

### Settlement Flow

1. Buyer funds are received into this contract's escrow on `purchase` or at forward-contract execution.
2. `confirm_delivery` (called by the buyer, or by an agent acting as a neutral confirming party for forward contracts) releases funds toward `repayment` for distribution.
3. If delivery is disputed, funds remain held pending the same multi-party resolution pattern used in `escrow`.

### Events Emitted

```text
listing_created(listing_id, campaign_id, quantity, price)
forward_contract_locked(listing_id, buyer, quantity, deadline)
purchase_made(listing_id, buyer, amount)
delivery_confirmed(listing_id)
delivery_disputed(listing_id, disputer)
```

---

## 4. `repayment/`

### Responsibility

Calculates and executes the final distribution once a campaign's harvest sale or forward contract settles: investor principal + profit, farmer proceeds, and protocol fee routing.

### Key Functions

```rust
fn distribute(env: Env, campaign_id: u64, total_revenue: i128);
fn calculate_investor_share(env: Env, campaign_id: u64, investor: Address) -> i128;
fn set_fee_bps(env: Env, new_fee_bps: u32); // governance-gated
```

### Distribution Logic

Given `total_revenue` received from `marketplace` (or a direct harvest sale path):

1. Protocol fee (`fee_bps`, e.g., 150 = 1.5%) is deducted first and routed to the treasury, with a configurable portion forwarded to `insurance`'s risk reserve.
2. Remaining revenue is split proportionally across all `funding-pool` position-token holders for that campaign, covering principal plus their share of profit.
3. Any remainder after investor repayment goes to the farmer/cooperative address.
4. If `insurance` reports an active payout for this campaign (e.g., partial crop failure), that payout is netted into the investor distribution so investors aren't double-counting insurance and harvest revenue.

### Events Emitted

```text
revenue_distributed(campaign_id, total_revenue, fee_amount)
investor_paid(campaign_id, investor, amount)
farmer_paid(campaign_id, amount)
```

### Why This Is a Separate Contract From `funding-pool`

Distribution logic is the most financially sensitive code path in the protocol and changes shape as new revenue sources are added (insurance payouts, carbon credits in Phase 3). Isolating it makes it auditable and upgradable independently of the deposit-taking logic in `funding-pool`, which should change far less often.

---

## 5. `insurance/`

### Responsibility

Holds a pooled risk reserve (funded by protocol fees) and issues parametric payouts when oracle-submitted weather data crosses a campaign's defined threshold — without requiring a manual claims process.

### Key State

```text
PolicyTerms {
    campaign_id: u64,
    trigger_metric: Symbol,      // e.g., "rainfall_mm"
    threshold: i128,
    window_start: u64,
    window_end: u64,
    payout_amount: i128,
}
```

### Key Functions

```rust
fn register_policy(env: Env, campaign_id: u64, terms: PolicyTerms);
fn submit_oracle_reading(env: Env, campaign_id: u64, metric: Symbol, value: i128, observed_at: u64); // oracle-service only
fn evaluate_trigger(env: Env, campaign_id: u64) -> bool;
fn execute_payout(env: Env, campaign_id: u64);
fn fund_reserve(env: Env, amount: i128); // fed by repayment's fee routing
```

### Trigger Evaluation

`submit_oracle_reading` can only be called by the address configured as the authorized oracle signer (the `oracle-service`'s dedicated key — see `backend/README.md`). The contract itself — not the oracle submitter — decides whether `evaluate_trigger` returns true, by comparing submitted readings against `PolicyTerms`. This separation means a compromised oracle key can submit bad *data*, but cannot directly authorize a payout outside the threshold logic; it's still a meaningful trust assumption on data integrity, which is why oracle key custody is treated as a high-sensitivity operational concern.

### Events Emitted

```text
policy_registered(campaign_id, terms)
oracle_reading_submitted(campaign_id, metric, value)
trigger_evaluated(campaign_id, triggered: bool)
payout_executed(campaign_id, amount)
reserve_funded(amount)
```

### Reserve Solvency

`evaluate_trigger` checks reserve balance before allowing `execute_payout` to proceed; if the reserve is insufficient, the payout is recorded as a partial/pending liability rather than silently failing, so it's visible on-chain and addressable via governance (top-up, or adjusted future fee allocation).

---

## 6. `reputation/`

### Responsibility

Issues non-transferable ("soulbound") score tokens for farmers, cooperatives, and field agents, and manages the stake bonds agents post to participate in milestone attestation.

### Key State

```text
ReputationRecord {
    entity: Address,
    role: EntityRole,           // Farmer, Cooperative, Agent
    completed_campaigns: u32,
    defaulted_campaigns: u32,
    successful_attestations: u32,
    slashed_attestations: u32,
    score: i128,
}

AgentStake {
    agent: Address,
    staked_amount: i128,
    locked_until: u64,
}
```

### Key Functions

```rust
fn record_campaign_outcome(env: Env, entity: Address, outcome: CampaignOutcome);
fn get_score(env: Env, entity: Address) -> i128;
fn stake(env: Env, agent: Address, amount: i128);
fn slash(env: Env, agent: Address, amount: i128, reason: Symbol); // callable only by escrow on confirmed dispute resolution
fn unstake(env: Env, agent: Address);
```

### Non-Transferability

Reputation tokens deliberately have no `transfer` function — they are write-once-per-event, read-many records bound to an address. This is what makes them usable by other protocols later as a portable credential rather than a FarmExchange-internal score: anyone can read `get_score`, but no one (including the entity itself) can move or sell reputation.

### Agent Staking & Slashing

Agents must `stake` before they're eligible to call `submit_attestation` in `escrow`. `slash` is restricted to being called by the `escrow` contract itself, and only following a confirmed dispute resolution against that agent — this prevents `reputation` from being a second, inconsistent source of truth about whether an attestation was fraudulent.

### Events Emitted

```text
reputation_updated(entity, new_score)
agent_staked(agent, amount)
agent_slashed(agent, amount, reason)
agent_unstaked(agent, amount)
```

---

## `shared/`

Common code used across contracts to avoid duplication and drift:

```text
shared/
├── src/
│   ├── types.rs         # Shared structs (Milestone, DisputeConfig, etc.)
│   ├── errors.rs         # Common error enum, consistent error codes across contracts
│   ├── access.rs         # Role-check helpers (is_oracle, is_registered_agent, etc.)
│   └── test_utils.rs      # Shared test fixtures/mocks for integration tests
└── Cargo.toml
```

Other contracts depend on `shared` as a library crate, not as a deployed contract — it has no callable entrypoints of its own.

---

## Cross-Contract Interaction Diagram (textual)

```text
funding-pool ──(on close_funding)──> escrow
escrow ──(on milestone_released)──> farmer / repayment
marketplace ──(on delivery_confirmed)──> repayment
repayment ──(fee routing)──> insurance (reserve)
repayment ──(reads positions)──> funding-pool
insurance ──(payout)──> repayment (netted into distribution)
escrow ──(on confirmed dispute)──> reputation (slash)
funding-pool / escrow / marketplace ──(on outcome)──> reputation (record_campaign_outcome)
oracle-service (off-chain) ──(submit_oracle_reading)──> insurance
agents (off-chain, via backend) ──(submit_attestation)──> escrow
```

---

## Access Control Summary

| Action | Who can call |
|---|---|
| `create_campaign` | KYC-verified farmer/cooperative (checked off-chain by backend before relay; contract also checks a verified-address allowlist) |
| `submit_attestation` | Registered, staked agent only |
| `release_milestone` | Anyone, but only succeeds if attestation threshold is met |
| `slash` | `escrow` contract only (cross-contract call) |
| `submit_oracle_reading` | Configured oracle signer address only |
| `set_fee_bps` | Governance address (multisig/DAO in Phase 4; single admin key in Phase 1, clearly flagged as a centralization point to be removed) |

---

## Build & Test

```bash
# from contracts/<contract-name>
cargo build --target wasm32-unknown-unknown --release
cargo test

# deploy to testnet (example)
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/<contract_name>.wasm \
  --network testnet \
  --source <deployer-identity>
```

Each contract has its own `Cargo.toml` and test suite. Integration tests that span multiple contracts (e.g., full campaign lifecycle from deposit through distribution) live in a top-level `contracts/integration-tests/` crate (not shown above as a deployed contract) that exercises the real cross-contract calls against a local Soroban test network rather than mocking contract boundaries.

---

## Security Notes

- **Phase 1 admin key**: `set_fee_bps` and a few other governance-style functions are gated behind a single admin key in the initial pilot, not a DAO. This is called out explicitly here because it's a real centralization/trust assumption, not an oversight — Phase 4 roadmap moves this to multisig/DAO control.
- **Reentrancy**: cross-contract calls (e.g., `escrow` → `reputation::slash`) follow checks-effects-interactions ordering; state is updated before external calls where Soroban's execution model requires it.
- **Oracle trust**: the protocol trusts data submitted by the configured oracle signer; it does not trust that signer to decide outcomes (see `insurance` notes above). Compromise of the oracle key is a credible risk and is treated as such in `backend/README.md`'s key-management notes.
- **Upgradability**: contracts are deployed with explicit version tracking; any upgrade path (Soroban contract upgrade or redeploy-and-migrate) requires the same governance gate as `set_fee_bps`, not a unilateral admin action outside that path.
- **Audit status**: this is pilot-stage code. A third-party audit is expected before mainnet deployment with real investor capital beyond the pilot's bounded scope — this should be stated plainly in any grant application rather than implied.
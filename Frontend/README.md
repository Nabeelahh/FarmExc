# FarmExchange — Frontend

> Fund. Grow. Trade.

This package contains the client applications for FarmExchange: a **Next.js web dashboard** (farmers, investors, buyers) and a **React Native mobile app** (field agents + farmers, offline-first).

This README covers frontend setup, structure, and conventions only. For protocol, contract, and backend details, see the root [`README.md`](../README.md).

---

## Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Wallet & Stellar Integration](#wallet--stellar-integration)
- [Offline-First (Mobile)](#offline-first-mobile)
- [Conventions](#conventions)
- [Scripts](#scripts)
- [Testing](#testing)

---

## Overview

The frontend is split into two apps that serve different user roles:

| App | Users | Purpose |
|---|---|---|
| `web/` | Farmers, cooperatives, investors, buyers | Campaign creation, funding, marketplace, dashboards, wallet connection |
| `mobile/` | Field agents, farmers | Milestone attestation (GPS + photo evidence), status checks, USSD fallback for low-connectivity areas |

Both apps talk to the same backend API and Soroban contracts, and share types/SDK code from the root `packages/` workspace.

---

## Tech Stack

### Web (`frontend/web`)
- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Stellar wallet integration** (Freighter / WalletConnect-style connectors)
- Consumes `packages/sdk` for typed contract calls and `packages/types` for shared interfaces

### Mobile (`frontend/mobile`)
- **React Native**
- Offline-first sync layer for attestation data captured in low-connectivity rural areas
- GPS + camera integration for milestone evidence capture
- USSD fallback path for farmers without smartphone/data access

---

## Folder Structure

```text
frontend/
│
├── web/
│   ├── src/
│   │   ├── app/                # Routes/pages (App Router)
│   │   │   ├── campaigns/      # Campaign creation, browsing, detail views
│   │   │   ├── dashboard/      # Investor/farmer performance dashboards
│   │   │   ├── marketplace/    # Harvest listings, forward contracts
│   │   │   └── auth/           # KYC / wallet connect flows
│   │   ├── components/         # Shared UI components
│   │   ├── hooks/               # useWallet, useCampaign, useContract, etc.
│   │   ├── lib/                 # Wallet connection, Stellar SDK client helpers
│   │   └── styles/
│   └── public/
│
└── mobile/
    ├── src/
    │   ├── screens/             # Attestation flow, farmer status, agent registration
    │   ├── components/
    │   └── offline-sync/        # Queues attestations locally, syncs when connectivity returns
    └── assets/
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- For mobile: Xcode (iOS) and/or Android Studio, plus a configured emulator or physical device

### Web

```bash
cd frontend/web
npm install
npm run dev
```

App runs at `http://localhost:3000`.

### Mobile

```bash
cd frontend/mobile
npm install

# iOS
npx pod-install
npm run ios

# Android
npm run android
```

---

## Environment Variables

Create a `.env.local` (web) or `.env` (mobile) from the example file in each app directory.

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` or `mainnet` |
| `NEXT_PUBLIC_HORIZON_URL` | Horizon RPC endpoint |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | Soroban RPC endpoint |
| `NEXT_PUBLIC_API_BASE_URL` | Backend (NestJS) API base URL |
| `NEXT_PUBLIC_FUNDING_POOL_CONTRACT_ID` | Deployed funding-pool contract ID |
| `NEXT_PUBLIC_ESCROW_CONTRACT_ID` | Deployed escrow contract ID |
| `NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID` | Deployed marketplace contract ID |
| `NEXT_PUBLIC_STELLAR1KYC_ENDPOINT` | Stellar1KYC service endpoint for identity verification |
| `MOBILE_API_BASE_URL` | Backend API base URL (mobile) |
| `MOBILE_OFFLINE_QUEUE_LIMIT` | Max queued attestations before forcing sync prompt |

Never commit real `.env` files — only `.env.example`.

---

## Wallet & Stellar Integration

- Web wallet connection is handled in `src/lib/wallet.ts`, wrapping Freighter (and other Stellar-compatible wallets) behind a common interface exposed via `useWallet()`.
- All contract calls go through `packages/sdk`, which wraps the Soroban contract clients — components should not call contract bindings directly.
- Transaction signing always happens client-side; the frontend never has access to private keys.

---

## Offline-First (Mobile)

Field agents often work in areas with spotty connectivity. The `offline-sync/` module:

1. Captures attestation submissions (GPS + photo + signature) locally first.
2. Queues them in local storage.
3. Syncs to the backend indexer/API as soon as connectivity is available.
4. Surfaces sync status to the agent so they know what's pending vs. confirmed.

USSD flows are handled separately as a fallback for farmers without the app installed, routed through the backend rather than the mobile client itself.

---

## Conventions

- **Components:** functional components + hooks only, no class components.
- **Styling:** Tailwind utility classes; avoid inline styles except for dynamic values.
- **Types:** shared types come from `packages/types` — don't redefine campaign/investor/contract shapes locally.
- **Contract calls:** always via `packages/sdk`, never raw RPC calls from components.
- **Naming:** camelCase for variables/functions, PascalCase for components, kebab-case for file names in `app/`.

---

## Scripts

| Command | App | Description |
|---|---|---|
| `npm run dev` | web | Start local dev server |
| `npm run build` | web | Production build |
| `npm run lint` | web/mobile | Run ESLint |
| `npm run ios` / `npm run android` | mobile | Run on simulator/device |
| `npm test` | web/mobile | Run test suite |

---

## Testing

- **Web:** component tests colocated with components; integration tests for campaign/funding flows against a local Soroban testnet deployment.
- **Mobile:** unit tests for the offline-sync queue logic are the highest priority, since sync correctness directly affects milestone verification integrity.

---
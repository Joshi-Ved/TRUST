# TRUST: Blockchain-Based Smart Escrow & Transparent Settlement Platform for Influencer Marketing

TRUST is a hybrid EVM + Internet Computer (ICP) trustless settlement network designed to eliminate influencer payment defaults, escrow lock friction, and fake engagement fraud in influencer marketing.

## Monorepo Architecture Overview

```
TRUST/
├── contracts/                  # EVM Smart Contracts (Foundry / Hardhat)
│   ├── contracts/
│   │   ├── TrustEscrow.sol     # Production USDC Escrow with t-ECDSA Release & Refund locks
│   │   └── interfaces/
│   │       └── IERC20.sol
│   ├── scripts/
│   └── test/
│       └── TrustEscrow.t.sol
├── icp-canisters/              # ICP Rust Canisters (State Machine & t-ECDSA Signer)
│   ├── src/
│   │   └── trust_order_engine/
│   │       ├── Cargo.toml
│   │       ├── src/
│   │       │   ├── lib.rs      # Order FSM, EVM RPC HTTP Outcalls, t-ECDSA signing
│   │       │   └── types.rs
│   └── dfx.json
├── backend/                    # Off-chain indexing, metadata caching & social graph
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── index.ts
│   │   └── routes/
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # Tier-1 Web3 Next.js App Router Interface
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # High-impact Web3 landing / role selector
│   │   ├── advertiser/         # Discovery engine, Campaign Drawer, Escrow Modal
│   │   │   └── page.tsx
│   │   └── influencer/         # Profile verification, Kanban, PoW Submissions
│   │       └── page.tsx
│   ├── components/
│   │   ├── ui/                 # Atomic design tokens (shadcn-inspired)
│   │   ├── web3/               # Wallet connect, t-ECDSA claim modals, transaction badges
│   │   ├── advertiser/
│   │   └── influencer/
│   ├── lib/
│   │   ├── contracts.ts        # Viem/Ethers bindings & ABI definitions
│   │   ├── icp-agent.ts        # @dfinity/agent actor integration
│   │   └── utils.ts
│   ├── styles/
│   │   └── globals.css         # Dark-mode dominant tokens (#09090b, frosted glass, emerald accents)
│   ├── tailwind.config.ts
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

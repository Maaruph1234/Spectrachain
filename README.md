# SpectraChain — Blockchain-Based Spectrum Sharing Framework

**AFIT Kaduna | Department of Telecommunications Engineering | U19TE1063**

---

## Project Structure

```
SpectraChain/
├── spectrachain-frontend/     React web application
├── spectrachain-contracts/    Foundry smart contracts (to be added)
└── spectrachain-backend/      Node.js + Express API (to be added)
```

---

## Running the Frontend

```bash
cd spectrachain-frontend
npm install
npm run dev
```

Open http://localhost:5173

### Demo Credentials (all use password: demo123)

| Username          | Role      | Operator        |
|-------------------|-----------|-----------------|
| mtn_operator      | primary   | MTN Nigeria     |
| glo_operator      | primary   | Glo Mobile      |
| airtel_user       | secondary | Airtel Nigeria  |
| ninemobile_user   | secondary | 9mobile Nigeria |
| ncc_admin         | regulator | NCC Regulator   |

---

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + React Router
- **Blockchain:** Solidity + Foundry (contracts) + Hardhat (local testnet)
- **Backend:** Node.js + Express + Ethers.js
- **Notifications:** Termii API (SMS + Email)
- **Auth:** JWT role-based (maps to Hardhat test accounts)

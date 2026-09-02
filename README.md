# Linvy V0.1

Connectivity orchestration MVP for managing mobile lines, incidents and replacements from one operational console.

## What is included

- Operational overview with availability, MTTR, inventory and event metrics
- Line inventory, search, filters, usage and detailed lifecycle view
- Connectivity Pool with provider, region and plan eligibility
- Incident center with client, Linvy and provider sources
- Replacement Engine with resource matching, simulated provider order and complete audit trail
- Mandatory Risk Review for policy, suspected abuse or fraud blocks
- People and assignment views
- Provider sandbox, API key, webhook and audit settings
- Browser persistence and resettable demo data

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Use the incident on `LIN-2187` to run the complete replacement flow.

## Production build

```bash
npm run build
```

The deployable static application is generated in `dist/`.

## MVP boundary

This release deliberately uses a deterministic sandbox provider and local persistence. It proves the complete business workflow without pretending a carrier integration exists. The domain model keeps phone number, subscription and SIM profile fields separate so a real API/database adapter can replace the demo store later.

# Linvy

> **Connectivity operations platform for managing mobile lines, incidents and replacements from one console.**

Linvy is a product exploration around connectivity orchestration.

The MVP models the operational lifecycle behind managed mobile connectivity:

- line inventory;
- assignments;
- incidents;
- provider events;
- replacement decisions;
- risk review;
- audit history.

The objective is to prove the workflow before introducing real carrier integrations.

---

## The operational problem

Managing a fleet of connectivity resources becomes difficult when information is spread across providers, spreadsheets and support channels.

A single incident may require understanding:

- who owns the line;
- which subscription is active;
- which SIM profile is assigned;
- what provider is responsible;
- whether replacement is allowed;
- what alternative inventory exists;
- whether policy or fraud risk blocks the action;
- what happened during the incident.

Linvy brings that lifecycle into one operational model.

---

## Product flow

```text
Line
  ↓
Assignment
  ↓
Usage / Health
  ↓
Incident
  ↓
Diagnosis
  ↓
Replacement Evaluation
  ↓
Risk Review
  ↓
Provider Action
  ↓
Audit Trail
```

---

## Main capabilities

### Operational overview

- availability metrics;
- MTTR indicators;
- inventory visibility;
- operational event metrics.

### Line inventory

- search;
- filters;
- lifecycle view;
- usage;
- assignment information.

### Connectivity Pool

Resources can be evaluated by:

- provider;
- region;
- plan;
- eligibility.

### Incident Center

Incidents can originate from:

- client reports;
- Linvy detection;
- provider events.

### Replacement Engine

The replacement flow includes:

- candidate matching;
- eligibility checks;
- simulated provider order;
- state transition;
- audit events.

### Risk Review

Sensitive replacement scenarios can require mandatory review for:

- policy restrictions;
- suspected abuse;
- fraud signals.

### People and assignments

The product models who is responsible for each connectivity resource instead of treating a phone number as an isolated asset.

---

## Domain modeling

One important design decision is keeping these concepts separate:

```text
Phone Number
Subscription
SIM Profile
Assignment
Provider
Incident
Replacement
```

They are related, but they are not the same entity.

Keeping them separate makes it possible to evolve from a deterministic sandbox into real provider adapters without distorting the domain model.

---

## Provider abstraction

The MVP uses a deterministic sandbox provider.

This is deliberate.

The goal is to validate:

- product flow;
- state transitions;
- matching rules;
- replacement lifecycle;
- auditability;

without pretending a carrier integration already exists.

A real provider API can later replace the sandbox adapter behind the same domain boundary.

---

## Architecture principle

```text
Operational UI
      ↓
Domain State
      ↓
Incident Engine
      ↓
Replacement Engine
      ↓
Risk Review
      ↓
Provider Adapter
      ↓
Audit Events
```

The MVP persists demo state in the browser and allows resettable scenarios for product testing.

---

## Running locally

```bash
npm install
npm run dev
```

Use the provided demo incident to execute the complete replacement flow.

### Production build

```bash
npm run build
```

The project produces a static deployable application.

---

## MVP boundaries

The current version deliberately does not claim:

- live carrier integration;
- real provisioning;
- production billing;
- autonomous fraud decisions;
- production-grade persistence.

Instead, it proves the end-to-end operational workflow with deterministic demo infrastructure.

---

## What this project demonstrates

Linvy demonstrates product and engineering work across:

- operational software;
- domain modeling;
- stateful workflows;
- incident management;
- matching engines;
- risk review;
- provider abstractions;
- audit trails;
- dashboard UX;
- product prototyping.

---

## Author

**João Mendes**  
AI, Automation & Software Technical Partner

I build software, automation, integrations and AI systems for companies, agencies and software teams.

GitHub: [@jvrm831720](https://github.com/jvrm831720)

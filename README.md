# Jonomot frontend

A React and TypeScript frontend for academic and applied research: a bilingual landing page, researcher workspace, participant journey, and admin review interface.

This repository is an isolated frontend project. It includes UI code, styles, local photographic assets, map data with provenance, and shared API TypeScript contracts.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

The frontend opens at `http://127.0.0.1:5173`. To use a different local port:

```sh
npm run dev -- --port 5175
```

For a self-contained demo without a backend, copy `.env.example` to `.env` and set `VITE_DEMO_MODE=browser`. Fictional demo state is saved in this browser and shared by the three personas. On browsers that restrict storage, the demo remains usable for the current page session.

Development uses API mode by default. Vite proxies `/api` to `http://127.0.0.1:3001`; that backend runs separately. Set `VITE_DEMO_MODE=api` to require an API explicitly.

## Build and host

```sh
npm run build
npm run preview
```

Deploy the generated `dist` directory. Configure your host to serve `index.html` for application routes such as `/researcher` and `/respondent`.

Production builds default to the browser demo when `VITE_API_BASE_URL` is empty and `VITE_DEMO_MODE` is not `api`. All three personas work without `/api` endpoints: onboarding, surveys, response review, simulated verification, rewards, reset, and CSV exports run as a client-side simulation.

For production API requests, set `VITE_DEMO_MODE=api` and either proxy `/api` to your backend on the same origin, or set `VITE_API_BASE_URL` to the backend origin before building. An external API origin must allow the frontend origin and required request headers through its CORS configuration. Vite's development proxy is not part of the production build. API errors do not silently switch into the browser demo.

## Deploy the demo to Vercel

Use the Vite preset, build command `npm run build`, and output directory `dist`. The included `vercel.json` handles direct links and refreshes under `/respondent`, `/researcher`, and `/admin`.

Leave `VITE_API_BASE_URL` empty for the self-contained demo, or explicitly set `VITE_DEMO_MODE=browser`. If an existing Vercel project has `VITE_DEMO_MODE=api`, change it to `browser` and redeploy. Environment settings are applied at build time.

Each visitor gets a separate fictional dataset. State is shared between tabs on the same origin when browser storage is available; Web Locks serialize simultaneous actions on supporting browsers. Pending verification and payment simulations finish when the demo next loads or refreshes its state. Use Demo controls to restore the fictional seed.

Browser mode is a presentation simulation. It is not secure authentication, a production database, or a payment system. Use fictional details during onboarding.

All `VITE_` variables are public browser configuration. Do not put credentials or secret keys in them.

## Backend contract

The existing frontend expects:

- `GET /api/health`
- `GET /api/state`
- `POST /api/commands`
- `GET /api/exports/surveys/:surveyId.csv`

The types and command payloads are in `shared/contracts.ts`. The `x-demo-user-id` header selects a fictional persona in the local demo; it is not production authentication. Real study data requires an authenticated, role-scoped backend.

In API mode, workspaces and persona actions require the backend. In browser mode, `src/shared/demo` provides fictional fixtures, state transitions, deferred operation simulation, and CSV formatting entirely in the browser. No server application, real participant records, real payments, or generated recordings are included.

## Features

- Academic landing theme with English/Bangla content and responsive photography.
- AI concept previews for questionnaire assistance, trust review, and escalation.
- Proposed data sanitization and engineering workflow.
- Researcher questionnaire editor, curated study templates, review and export interfaces.
- Regional maps, topic heatmaps, daily response trends, and review/reward analytics.
- Participant onboarding, questionnaires, verification preview, and demo rewards.
- Admin questionnaire review and account flag handling.
- Keyboard-accessible controls and reduced-motion support.

AI capabilities are concept previews. Verification and rewards are simulated in browser mode or by the separately hosted demo backend in API mode.

## Assets

Images in `public/images/landing` were generated as illustrative scenes; all depicted people are fictional. Captions disclose this in the interface. Bangladesh map provenance and license are documented in `public/maps/README.md`.

## Source layout

```text
src/app/                      Landing page, routing, and demo controls
src/features/researcher-admin/ Researcher and admin interfaces
src/features/respondent/      Participant interfaces
src/shared/                   Shared UI and API/state clients
src/shared/demo/              Browser-only fictional demo simulation
shared/contracts.ts           Frontend/API type contracts
public/                       Local brand, images, and map assets
```

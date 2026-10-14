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

The backend must run separately. By default, Vite proxies `/api` to `http://127.0.0.1:3001`. Copy `.env.example` to `.env` to configure another target.

## Build and host

```sh
npm run build
npm run preview
```

Deploy the generated `dist` directory. Configure your host to serve `index.html` for application routes such as `/researcher` and `/respondent`.

For production API requests, either proxy `/api` to your backend on the same origin, or set `VITE_API_BASE_URL` to the backend origin before building. An external API origin must allow the frontend origin and required request headers through its CORS configuration. Vite's development proxy is not part of the production build.

All `VITE_` variables are public browser configuration. Do not put credentials or secret keys in them.

## Backend contract

The existing frontend expects:

- `GET /api/health`
- `GET /api/state`
- `POST /api/commands`
- `GET /api/exports/surveys/:surveyId.csv`

The types and command payloads are in `shared/contracts.ts`. The `x-demo-user-id` header selects a fictional persona in the local demo; it is not production authentication. Real study data requires an authenticated, role-scoped backend.

With no API connected, the landing page can render, but workspaces and persona actions need the backend state and commands. No backend implementation, seed database, participant data, payment worker, or generated recordings are included here.

## Features

- Academic landing theme with English/Bangla content and responsive photography.
- AI concept previews for questionnaire assistance, trust review, and escalation.
- Proposed data sanitization and engineering workflow.
- Researcher questionnaire editor, curated study templates, review and export interfaces.
- Regional maps, topic heatmaps, daily response trends, and review/reward analytics.
- Participant onboarding, questionnaires, verification preview, and demo rewards.
- Admin questionnaire review and account flag handling.
- Keyboard-accessible controls and reduced-motion support.

AI capabilities are concept previews. Existing verification and reward flows are simulated by the separately hosted demo backend.

## Assets

Images in `public/images/landing` were generated as illustrative scenes; all depicted people are fictional. Captions disclose this in the interface. Bangladesh map provenance and license are documented in `public/maps/README.md`.

## Source layout

```text
src/app/                      Landing page, routing, and demo controls
src/features/researcher-admin/ Researcher and admin interfaces
src/features/respondent/      Participant interfaces
src/shared/                   Shared UI and API/state clients
shared/contracts.ts           Frontend/API type contracts
public/                       Local brand, images, and map assets
```

# CommSkill Pro

A web app for practising professional communication under pressure. You pick a channel — email, Slack, or a voice call — and the app drops you into a realistic workplace scenario: a hostile stakeholder, a vague brief, a difficult upward conversation. You respond. It scores you.

The idea is that most communication training is passive — you read tips, you nod. This makes you do the thing. Live. With feedback that actually tells you what to fix.

**Live app:** https://commproapp.netlify.app

---

## What it does

When you open the app, you go through a short onboarding to set your role and what you want to work on. Then you pick a channel and the app generates a scenario matched to your settings.

Scenarios have types — hostile, vague, upward, pushback, escalation — and intensity levels. The counterpart has a name, a persona, and a reason they are being difficult. Your job is to respond the way a skilled communicator would.

When the conversation ends, the app scores your response across dimensions (clarity, tone, handling of pressure, etc.) and gives you a readiness level, your strongest moment, your biggest gap, and a habit to build. If your response missed the mark, it shows you a rewrite so you can see exactly what better looks like.

---

## Tech

- **TypeScript** — the whole frontend is strictly typed. Types live in `src/types.ts`
- **Vite** — build tool and dev server
- **Netlify** — hosting + serverless functions for the AI proxy and Slack integration
- **Playwright** — end-to-end tests (88 tests, 8 spec files)
- **Newman** — Postman collection runner for API tests
- **Rest Assured (Java)** — API test suite for the serverless layer
- **Jenkins** — CI pipeline running on an Azure VM

---

## Project structure

```
src/
  api.ts          — all calls to the AI backend go through here
  state.ts        — app state (role, mode, sessions, busy flag)
  types.ts        — TypeScript interfaces and union types
  constants.ts    — scenario configs, scoring dimensions
  main.ts         — entry point
  theme.ts        — light/dark theme logic
  voice.ts        — voice channel handling
  style.css       — styles
  ui/             — UI components
  utils/          — shared helpers

tests/
  channels.spec.ts        — channel selection and switching
  conversation.spec.ts    — conversation flow end-to-end
  error-handling.spec.ts  — API errors, timeouts, edge cases
  onboarding.spec.ts      — role setup and initial state
  report.spec.ts          — scoring output and report display
  scenarios.spec.ts       — scenario generation and rendering
  security.spec.ts        — XSS, input sanitisation
  theme.spec.ts           — theme toggle and persistence
  helpers.ts              — shared test utilities

api-tests/
  CommSkillPro.postman_collection.json   — Postman collection
  CommSkillProApiTest.java               — Rest Assured Java suite
  mock-server.cjs                        — local mock server for API tests

netlify/functions/
  proxy.js    — proxies requests to the AI provider (keeps API key server-side)
  slack.js    — Slack integration endpoint

reporters/
  slack.cjs   — custom Playwright reporter that posts results to Slack
```

---

## Getting started

You need Node.js 20.

```bash
git clone https://github.com/Beryl01/CommProApp.git
cd CommProApp
npm ci
```

To run the dev server:

```bash
npm run dev
```

The app opens at http://localhost:5173. Note: the AI features call Netlify Functions, so full functionality requires a Netlify deployment or local function emulation.

---

## Running tests

### Playwright (end-to-end)

```bash
npx playwright install chromium   # first time only
npm test
```

Tests run against the live Netlify deployment (https://commproapp.netlify.app). They run sequentially — one worker — because the app hits a live AI API and parallel execution causes rate limit collisions. The test run includes 2 retries in CI and 1 locally.

To run in UI mode (useful when writing or debugging tests):

```bash
npm run test:ui
```

### API tests (Newman + Postman collection)

```bash
npm run mock:start
npm run test:api
npm run mock:stop
```

The mock server runs on localhost:3001. Newman generates an HTML report at `newman-report/report.html`.

### API tests (Java / Rest Assured)

The Java suite is in `api-tests/CommSkillProApiTest.java`. It covers the serverless endpoints with typed assertions — useful for validating complex nested response structures that are awkward to test with Postman scripting alone.

```bash
cd api-tests
mvn test
```

---

## CI pipeline (Jenkins)

The `Jenkinsfile` defines a pipeline that runs on every push:

1. **Checkout** — pulls the source
2. **Install Node.js** — checks for Node 20, installs via NodeSource if missing
3. **Install dependencies** — `npm ci --prefer-offline`
4. **Install Playwright** — `npx playwright install --with-deps chromium`
5. **Run Playwright tests** — publishes the HTML report to Jenkins
6. **Run API tests** — starts the mock server, runs Newman, tears down the mock server, generates the htmlextra report

The pipeline runs on an Azure VM. npm cache is set to `/tmp/npm-cache` to keep installs fast across builds.

---

## Build

```bash
npm run build
```

TypeScript compiles first, then Vite bundles. Output goes to `dist/`.

---

## Notes

- The AI calls go through `netlify/functions/proxy.js` so the API key never touches the client
- Scenarios are generated per session — no hardcoded scripts
- Tests hit the live deployed app, not a local mock, so they catch real deployment issues
- The custom Slack reporter (`reporters/slack.cjs`) posts test results directly to a Slack channel when configured

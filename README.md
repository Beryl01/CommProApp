# CommSkill Pro

A web app for practising professional communication. You pick a channel (email, Slack, or a voice call) and the app gives you realistic workplace scenarios. You respond. It scores you. It will generate a Readiness report and send it to you on Slack.

## What it does

When you open the app, you go through a short onboarding process to type in your role and what you want to be tested on. Then you pick a channel, and the app generates a scenario matched to your settings.

Scenarios have types: hostile, vague, upward, pushback, escalation, and intensity levels. The counterpart has a name, a persona, and a reason they are being difficult. Your job is to respond the way a skilled communicator would, using the skills you learnt during communication sessions.

When the conversation ends, the app scores your response across dimensions (clarity, tone, handling of pressure, etc.) and gives you a readiness report, detailing your strongest moment, your biggest gap, and a habit to build. If your response missed the mark, it shows you an example of how you would have rewritten your answer so you can see exactly what better looks like.

---

## Tech

- **TypeScript**: the whole frontend is strictly typed. Types live in `src/types.ts`
- **Netlify**: used for hosting and serverless functions for the AI proxy and Slack integration
- **Playwright**: used the framework for end-to-end tests.
- **Newman**: Postman collection runner for the API tests
- **Rest Assured (Java)**: API test suite for the serverless layer
- **Jenkins**: CI pipeline running on an Azure VM

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
---

## Running tests

### Playwright (end-to-end)

```bash
npx playwright install chromium   # first time only
npm test
```

Tests run against the live Netlify deployment (https://commproapp.netlify.app).

To run in UI mode 

```bash
npm run test:ui
```

### API tests (Newman + Postman collection)

```bash
npm run mock:start
npm run test:api
npm run mock:stop
```

Newman generates an HTML report at `newman-report/report.html`.

### API tests (Java / Rest Assured)

The Java suite covers the serverless endpoints with typed assertions: useful for validating complex nested response structures that are abit difficult to test with Postman scripting alone.

```bash
cd api-tests
mvn test
```

---

## CI pipeline (Jenkins)

The `Jenkinsfile` defines a pipeline that runs on every push:

1. **Checkout**: pulls the source
2. **Install Node.js**: checks for Node 20, installs via NodeSource if missing
3. **Install dependencies**: `npm ci --prefer-offline`
4. **Install Playwright**: `npx playwright install --with-deps chromium`
5. **Run Playwright tests**: publishes the HTML report to Jenkins
6. **Run API tests**: starts the mock server, runs Newman, tears down the mock server, and generates the htmlextra report

The pipeline runs on an Azure VM. npm cache is set to `/tmp/npm-cache` to keep installs fast across builds.

---

## Build

```bash
npm run build
```

## Notes

- Scenarios are generated per session: no hardcoded scripts
- The custom Slack reporter (`reporters/slack.cjs`) posts test results directly to a Slack channel when configured

# CommSkill Pro — Software Specification (CommProApp v2)

## 1. Overview

CommSkill Pro is a single-page application (SPA) built with **Vite + TypeScript**, deployed on **Netlify**.  
The app has two top-level screens: **Onboarding** and **Main App**.  
API calls go through two serverless functions:
- `/.netlify/functions/proxy` — Anthropic Claude API proxy
- `/.netlify/functions/slack` — Slack Incoming Webhook proxy

Dark mode is the default; the user can toggle to light via a fixed button.

---

## 2. Application URL & Entry State

| Property | Value |
|---|---|
| Base URL | Netlify production URL (set as `baseURL` in Playwright config) |
| Initial visible element | `#ob` (onboarding screen) |
| Initially hidden | `#app` (main app) |
| Default theme | `data-theme="dark"` on `<html>` |
| Local storage key | `commpro-theme` (`"dark"` or `"light"`) |

---

## 3. Onboarding Screen (`#ob`)

### 3.1 Elements

| Selector | Type | Purpose |
|---|---|---|
| `#ob` | div | Onboarding wrapper — visible on load |
| `#ob-role` | input[text] | Role field (required, max 100 chars enforced) |
| `#ob-learnt` | textarea | Learning goal (required, max 500 chars enforced) |
| `.mc[data-mode="slack"]` | div | Slack channel card (toggleable) |
| `.mc[data-mode="email"]` | div | Email channel card (toggleable) |
| `.mc[data-mode="call"]` | div | Live Call channel card (toggleable) |
| `#ob-start` | button | "Start Training →" — triggers generation |

### 3.2 Input Sanitisation

Before the form is submitted, both inputs are sanitised:
- `role` is sliced to **100 characters** and stripped of `< > "`
- `learnt` is sliced to **500 characters** and stripped of `< > "`

This prevents prompt injection attacks and XSS.

### 3.3 Channel Card State

- **Unselected**: `.mc` without `.sel` class
- **Selected**: `.mc.sel` — added on click, removed on second click (toggle)
- At least one channel must be selected to proceed

### 3.4 Validation (client-side alerts)

| Condition | Alert text |
|---|---|
| Role field empty | `Please enter your role.` |
| Learning goal empty | `Please describe what you want to practise.` |
| No channel selected | `Please select at least one channel.` |

### 3.5 Submit Flow

1. User fills `#ob-role`, `#ob-learnt`, selects at least one `.mc` card
2. Clicks `#ob-start`
3. Inputs are sanitised, state is set via `setUserProfile()` and `setMode()`
4. `#ob` gets `display: none`; `#app` gets `display: block`
5. `#hb-role` badge populates with role text (truncated at 22 chars + `…`)
6. First selected channel's scenarios generate (loading state shown in `#content`)
7. Once first channel loads: sidebar nav populates, scenario cards render
8. Remaining channels generate in background (parallel `Promise.all`)

---

## 4. Main App (`#app`)

### 4.1 Top Navigation Bar (`.topbar`)

| Selector | Content |
|---|---|
| `.tb-tana` | "tana" brand text |
| `.tb-name` | "CommSkill Pro" |
| `#prog-fill` | Progress bar fill — width% = done/total scenarios |
| `#hb-role` | User's role (badge, truncated) |
| `#hb-mode` | Current channel name + selected channel count e.g. `Slack (2)` |
| `#hb-done` | Completion count e.g. `0/3`, `1/3`, `3/3` |
| `#view-report-btn` | Hidden until **all scenarios across all selected channels** are done. Scrolls to `#session-sum` on click. |

### 4.2 Sidebar (`.sidebar`)

#### Channel Switcher (`#mode-nav`)

- Populated after onboarding with only selected channels
- Each item: `.mi[data-mode="slack|email|call"]`
- Active channel item has class `.a`
- Clicking a non-active channel: calls `setMode()`, re-renders `#content`

#### Scenario Navigator (`#sc-nav`)

- One `.ni` item per scenario in current channel
- Badge: scenario number (1/2/3) if not done, or readiness icon (🚀/✅/⚠️/📍) if done
- Clicking navigates to that scenario card and opens its body

#### Score History (`#hist-box`)

- Hidden (`display: none`) until at least one scenario is scored
- Shows one row per completed scenario across all channels
- Format: `S1 · Scenario Title…` + readiness icon

### 4.3 Theme Toggle (`#theme-toggle`)

| State | Button text | `<html>` attribute |
|---|---|---|
| Dark mode (default) | ☀️ | `data-theme="dark"` |
| Light mode | 🌙 | no `data-theme` attribute |

---

## 5. Scenario Cards

Scenarios are rendered inside `#content` → `.sc-list` → `.sc` cards.

### 5.1 Card IDs (idx = 0, 1, 2)

| Selector | Purpose |
|---|---|
| `#scc-{idx}` | Card root element |
| `#sch-{idx}` | Clickable header — toggles body open/closed |
| `#scb-{idx}` | Card body (collapsible) |
| `#gate-{idx}` | Gate section — shown before conversation starts |
| `#gatebn-{idx}` | Gate button ("Begin Conversation" / "Start Email Thread" / "Start Call") |
| `#conv-{idx}` | Conversation area — hidden until gate button clicked |
| `#msgs-{idx}` | Message list inside conversation |
| `#inp-{idx}` | User message textarea |
| `#snd-{idx}` | Send button |
| `#end-{idx}` | "End & Score" button |
| `#hint-{idx}` | Turn counter hint: `Turn 0/2 · Enter to send · Shift+Enter new line` |
| `#score-{idx}` | Feedback panel — populated after scoring |

### 5.2 Card States

| State | Class on `#scc-{idx}` | `#gate-{idx}` | `#conv-{idx}` |
|---|---|---|---|
| Not started | (none) | visible | hidden |
| Active / in progress | `.active` | hidden | visible |
| Done | `.done` | hidden | visible |

### 5.3 Card Header Badges

- Not done: small grey text "tap to open"
- Done: `✓ Done` in green

### 5.4 Scenario Brief (inside `#scb-{idx}`)

All AI-generated text is HTML-escaped before injection to prevent XSS.

| Element | Content |
|---|---|
| `.brief-desc` | Scenario description (escaped) |
| `.pill-ctx` | Context pill — only if `context` field is non-empty (escaped) |
| `.pill-task` | "Your task: …" (escaped) |
| `.pill-who` | "Speaking with: [Name] · [Persona]" (escaped) |
| `.ib-body` | Inbound message preview (escaped) |

### 5.5 Email-Specific Fields (Email channel only)

| Selector | CSS class | Purpose |
|---|---|---|
| `#ef-to-{idx}` | `.email-field-input` | "To:" recipient input |
| `#ef-sub-{idx}` | `.email-field-input` | "Sub:" subject line input |

Prepended to user's first message as: `To: …\nSubject: …\n\n{message body}`

### 5.6 Call-Specific Elements

| Selector | Purpose |
|---|---|
| `#mute-{idx}` | Mute/unmute TTS button. Text: `🔊 On` or `🔇 Off` |

---

## 6. Conversation Flow

### 6.1 Starting a Conversation

1. User clicks `#gatebn-{idx}`
2. `#gate-{idx}` hides; `#conv-{idx}` becomes `display: flex`
3. Session status set to `'opening'`
4. Typing indicator appears in `#msgs-{idx}`
5. AI counterpart sends opening message (`.msg.ai` bubble)
6. Typing indicator removed; status set to `'active'`
7. Focus moves to `#inp-{idx}`

### 6.2 Sending a Message

1. User types in `#inp-{idx}`
2. Send via: click `#snd-{idx}` OR press Enter (not Shift+Enter)
3. `state.busy` flag set via `setBusy(true)` — send button disabled
4. User message appears as `.msg.you` bubble
5. `#hint-{idx}` updates: `Turn 1/2 · …` → `Turn 2/2 · …`
6. AI typing indicator appears, then AI reply `.msg.ai`
7. `setBusy(false)` called in **`finally` block** — guaranteed even on error
8. After turn 2: system message `.msg.sys`: `2 exchanges reached — scoring your conversation…`
9. `#score-{idx}` populates with feedback panel
10. Session status set to `'scoring'` → `'completed'`

### 6.3 Ending Early

- User clicks `#end-{idx}` at any time
- Same scoring flow as auto-end after max turns
- `#foot-{idx}` hides after scoring begins

### 6.4 Busy Flag Behaviour

- `setBusy(true)` at the start of every `sendTurn` call
- `setBusy(false)` is in a **`finally`** block — released even if the API throws
- While busy: send button is `disabled`, further sends are blocked
- This prevents double-sends and permanent lock on API error

### 6.5 Message Bubble Classes

| Class | Sender |
|---|---|
| `.msg.ai` | Counterpart AI response |
| `.msg.you` | Trainee (user) message |
| `.msg.sys` | System notification |

---

## 7. Feedback Panel (`#score-{idx}`)

Appears after `endConv` completes. All AI-generated text is HTML-escaped.

| Element | Content |
|---|---|
| `.sp-title` | "Feedback" |
| `.sp-nlbl` | "Readiness" |
| Readiness label | One of: `🚀 Highly Ready` / `✅ Ready` / `⚠️ Partially Ready` / `📍 Needs Development` |
| `.sp-dim` (×3–5) | Dimension rows: name + level badge + explanation (all escaped) |
| `.ins.g` | "✓ Strongest moment" (escaped) |
| `.ins.r` | "↑ Biggest gap" (escaped) |
| `.ins.b` | "🎯 Habit to build" (escaped) |
| `.ins.b2` | "✎ Better version" (monospace rewrite, escaped) |

Dimension level badges: `✓ Strong` (green) / `~ Adequate` (amber) / `↑ Needs Work` (red)

---

## 8. Session Report (`#session-sum`)

Shown after **all scenarios across ALL selected channels** are completed.

### 8.1 Trigger

- `checkAllDone()` called after every scenario is scored
- Guard condition: `state.selectedChannels.every(ch => all scenarios done)`
- Only shows when **every channel the user selected** is fully complete
- `#view-report-btn` in topbar becomes visible on trigger

### 8.2 Report Structure

| Element | CSS class | Content |
|---|---|---|
| Overall readiness label | `.sum-title` | One of the 4 readiness labels |
| Overall description | (inline) | e.g. "Core skills present…" |
| Report date | (inline) | e.g. "20 May 2026" |
| Channels count | (inline) | Number of fully completed channels |
| Channel cards | `.channel-card` | One per completed channel with per-channel readiness |
| Type tags | `.report-tag` | Per scenario type, coloured by level |
| Strengths | `.dim-row.dim-green` | Up to 3 `strongestMoment` entries |
| Focus Areas | `.dim-row.dim-red` | Up to 3 `biggestGap` entries |
| Next 30 Days | `.next-step` | Up to 4 `habitToBuild` entries (numbered) |
| Summary text | `.report-section` | `{role} completed {n} channel(s). Overall: …` |
| `#slack-send-btn` | `.sd-btn` | "📤 Send to Slack" — posts to Slack via API |
| `#new-session-btn` | `.sd-btn.p` | "🔄 New Session" — reloads page |

### 8.3 Send to Slack Button (`#slack-send-btn`)

1. Click calls `postToSlack()` → `/.netlify/functions/slack` → Slack Incoming Webhook
2. Payload: Block Kit blocks (header, trainee name, overall readiness, channel results, date)
3. Button states:
   - Default: `📤 Send to Slack`
   - Loading: `📤 Sending…` (disabled)
   - Success: `✅ Sent to Slack!` (green, stays disabled)
   - Error: `❌ Failed — try again` (re-enabled)

---

## 9. Loading & Error States

### 9.1 Scenario Generation Loading

Shown in `#content` while `genScenarios` is running for the active channel:
```
⚙️  Building scenarios…
Tailoring {mode} scenarios for {role}
```

### 9.2 Generation Failure

If API call or JSON parse fails, the key is added to a `_failed` Set. Subsequent calls for that channel reject immediately (no infinite retry loop). If still the active channel:
```
⚠️  Could not load {mode} scenarios
[Reload page] button
```

### 9.3 Conversation Error

If an API call during conversation fails, `.msg.sys` appears:  
`Connection error — please try again.` (opening) or `Error — try again.` (send turn)  
`session.status` is set to `'error'`. The busy flag is released via `finally`.

### 9.4 Scoring Loading State

While `endConv` is running, `#score-{idx}` shows:  
`Analysing your conversation…`  
`session.status` is set to `'scoring'` for this period.

### 9.5 Slack Send Error

If `/.netlify/functions/slack` returns a non-OK response, `#slack-send-btn` shows `❌ Failed — try again` and re-enables.

---

## 10. Readiness Levels Reference

| Value | Display label | Icon | Color token |
|---|---|---|---|
| `highly_ready` | Highly Ready | 🚀 | `var(--green)` |
| `ready` | Ready | ✅ | `var(--green)` |
| `partially_ready` | Partially Ready | ⚠️ | `var(--amber)` |
| `needs_development` | Needs Development | 📍 | `var(--red)` |

Rank order (for averaging): `needs_development=0`, `partially_ready=1`, `ready=2`, `highly_ready=3`

---

## 11. Channel-Specific UI Differences

| Channel | Gate button | Conv bar label | Message placeholder | Extra |
|---|---|---|---|---|
| Slack | 🟣 Begin Conversation | #comm-training | "Your message…" | — |
| Email | 📧 Start Email Thread | Email Thread | "Your message…" | To: / Sub: fields above messages |
| Call | 📞 Start Call | Live Call | "Your spoken response…" | Mute button, TTS on AI messages |

---

## 12. Conversation Status State Machine

Each `Session` object has a `status: ConversationStatus` field:

```
'idle' → 'opening' → 'active' → 'scoring' → 'completed'
                           ↓
                        'error'
```

| Status | When set |
|---|---|
| `idle` | Session created (default) |
| `opening` | `openConv()` called, awaiting AI opening message |
| `active` | AI opening message received, user can type |
| `scoring` | `endConv()` called, awaiting score API response |
| `completed` | Score received, `markSessionDone()` called |
| `error` | Any API call in `openConv` or `sendTurn` throws |

---

## 13. Key User Flows for Test Cases

### Flow 1 — Happy Path (Single Channel)
1. Load page → onboarding visible
2. Fill role + goal → select Slack → click Start
3. Wait for 3 scenario cards to render
4. Click `#gatebn-0` → wait for AI opening message in `#msgs-0`
5. Type reply → send → wait for AI response
6. Type second reply → send → system message + `#score-0` panel appears
7. `#scc-0` has `.done` class
8. Repeat for scenarios 1 and 2
9. `#session-sum` appears; `#view-report-btn` visible
10. `#slack-send-btn` is present in the report

### Flow 2 — Validation Errors
1. Click Start with empty role → alert fires, remain on `#ob`
2. Fill role, click Start with empty goal → alert fires
3. Fill both, click Start with no channel selected → alert fires

### Flow 3 — Multi-Channel Report
1. Select Slack + Email → Start
2. Complete all 3 Slack scenarios
3. Report does NOT appear yet (Email not done)
4. Switch to Email → complete all 3 Email scenarios
5. Report NOW appears (all channels done)
6. Channel cards show both Slack and Email results

### Flow 4 — Theme Toggle
1. On load: `html[data-theme="dark"]`, button text = ☀️
2. Click `#theme-toggle` → `html` loses `data-theme`, button = 🌙
3. Click again → `html[data-theme="dark"]` restored, button = ☀️
4. Reload → theme persists from localStorage key `commpro-theme`

### Flow 5 — End & Score Early
1. Start a conversation (`#gatebn-0`)
2. Click `#end-0` before sending any messages
3. Scoring starts, feedback panel appears
4. `#foot-0` hides

### Flow 6 — New Session
1. Complete all scenarios → report appears
2. Click `#new-session-btn`
3. Page reloads → `#ob` visible, `#app` hidden

### Flow 7 — Send to Slack
1. Complete all scenarios → report appears
2. Click `#slack-send-btn`
3. Button shows `📤 Sending…` and is disabled
4. On success: button shows `✅ Sent to Slack!` in green
5. On failure: button shows `❌ Failed — try again` and re-enables

---

## 14. Timing & Wait Strategy for Playwright

| Event | Recommended Playwright wait |
|---|---|
| App screen after onboarding | `await expect(page.locator('#app')).toBeVisible({ timeout: 10_000 })` |
| Scenario cards rendered | `await expect(page.locator('.sc')).toHaveCount(3, { timeout: 10_000 })` |
| AI opening message | `await expect(page.locator('#msgs-0 .msg.ai .msg-bub')).toBeVisible({ timeout: 8_000 })` |
| AI reply after send | `await expect(page.locator('#msgs-0 .msg.ai').nth(1)).toBeVisible({ timeout: 8_000 })` |
| Scoring complete | `await expect(page.locator('#score-0 .sp')).toBeVisible({ timeout: 10_000 })` |
| Report visible | `await expect(page.locator('#session-sum')).toBeVisible({ timeout: 10_000 })` |

> Mock `/.netlify/functions/proxy` with `page.route()` for all fast/unit tests.  
> Mock `/.netlify/functions/slack` separately for Slack send tests.

---

## 15. Mocking the API (`page.route`) for Fast Tests

```typescript
import type { Route } from '@playwright/test';

// Mock Claude proxy — detects scenario generation vs conversation vs scoring
await page.route('/.netlify/functions/proxy', async (route: Route) => {
  const body = await route.request().postDataJSON() as { messages?: { content: string }[] };
  const isScenarioGen = Array.isArray(body.messages) && body.messages.length === 1;
  const isScoring = JSON.stringify(body).includes('FULL TRANSCRIPT');

  if (isScenarioGen) {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        content: [{ text: JSON.stringify([
          {
            title: 'Hostile Manager', type: 'hostile', intensity: 'high',
            desc: 'Manager is angry about a missed deadline.',
            counterpartName: 'Sarah', counterpartPersona: 'Aggressive manager',
            task: 'De-escalate and get clarity on next steps',
            context: 'Sprint deadline was missed.',
            inboundMessage: 'This is completely unacceptable. You had two weeks.',
            systemPrompt: 'You are Sarah, an angry manager.',
            scoringDimensions: [{ name: 'De-escalation', desc: 'Did trainee calm the situation?' }],
          },
          // ... two more scenarios (vague, escalation)
        ]) }]
      }),
    });
  } else if (isScoring) {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        content: [{ text: JSON.stringify({
          level: 'ready',
          dimensions: [
            { name: 'Empathy',    level: 'strong',    explanation: 'Good acknowledgement.' },
            { name: 'Clarity',    level: 'adequate',  explanation: 'Mostly clear.' },
            { name: 'Tone',       level: 'strong',    explanation: 'Professional.' },
            { name: 'Resolution', level: 'needs_work', explanation: 'No concrete next step.' },
            { name: 'Composure',  level: 'strong',    explanation: 'Stayed calm.' },
          ],
          strongestMoment: 'Acknowledged frustration immediately.',
          biggestGap: 'Did not propose a concrete timeline.',
          habitToBuild: 'Always close with a specific action and timeframe.',
          rewrite: 'I hear you. I take responsibility and will update you within the hour.',
        }) }]
      }),
    });
  } else {
    // AI conversation reply
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: [{ text: 'That is not good enough. Try again.' }] }),
    });
  }
});

// Mock Slack webhook
await page.route('/.netlify/functions/slack', async (route: Route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
});
```

---

## 16. File & Architecture Reference

| File | Role |
|---|---|
| `index.html` | Static HTML shell — all element IDs defined here |
| `src/main.ts` | Entry point — `initTheme()` + `initOnboarding()` |
| `src/types.ts` | All TypeScript interfaces including `ConversationStatus` |
| `src/constants.ts` | `CHANNEL_CONFIG`, `LEVEL_*`, `DIM_*`, `SCENARIO_ICONS`, `MAX_TURNS`, `rankToLevel()` |
| `src/state.ts` | Read-only `state` object + controlled setters (`setMode`, `setBusy`, `markSessionDone`…) |
| `src/api.ts` | `callClaude()` + `postToSlack()` |
| `src/voice.ts` | Web Speech API (`speak`, `stopSpeak`, `voiceOn`) |
| `src/theme.ts` | Dark/light toggle, localStorage key: `commpro-theme` |
| `src/utils/json.ts` | `repairJSON()`, `parseJsonObject()`, `parseJsonArray()` |
| `src/ui/dom.ts` | `el()` (throws on missing), `elMaybe()` (nullable), `esc()`, `appendMsg()` |
| `src/ui/nav.ts` | Sidebar channel nav, scenario nav, progress bar, score history |
| `src/ui/onboarding.ts` | Onboarding form, input sanitisation, channel toggle |
| `src/ui/scenarios.ts` | Scenario generation (`genScenarios`), card rendering (`buildCard`) |
| `src/ui/conversation.ts` | `openConv()`, `sendTurn()` with `try/finally`, `wireMuteButton()` |
| `src/ui/scoring.ts` | `endConv()`, `renderScore()` — all AI text escaped |
| `src/ui/report.ts` | `checkAllDone()` (guards all channels), readiness report, Slack send |
| `netlify/functions/proxy.js` | Anthropic API proxy — reads `ANTHROPIC_API_KEY` env var |
| `netlify/functions/slack.js` | Slack webhook proxy — reads `SLACK_WEBHOOK_URL` env var |
| `tests/onboarding.spec.ts` | 6 Playwright tests — onboarding validation and flow |
| `tests/scenarios.spec.ts` | 10 Playwright tests — scenarios, conversation, scoring, API |
| `playwright.config.ts` | Playwright config — `baseURL: localhost:5173`, webServer: `npm run dev` |

---

## 17. Environment Variables

| Variable | Set in | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Netlify → Site configuration → Env vars | Authorises Claude API calls via `proxy.js` |
| `SLACK_WEBHOOK_URL` | Netlify → Site configuration → Env vars | Slack Incoming Webhook URL for readiness report delivery via `slack.js` |

Neither variable is ever exposed to the frontend or committed to the repository.
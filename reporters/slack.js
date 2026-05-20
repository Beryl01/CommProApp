// Playwright reporter — posts test results to Slack when the run finishes.
// Requires SLACK_WEBHOOK_URL to be set as an environment variable.
// If the variable is not set the reporter silently does nothing.

'use strict';

const https = require('https');
const { URL } = require('url');

class SlackReporter {
  constructor() {
    this.passed      = 0;
    this.failed      = 0;
    this.skipped     = 0;
    this.failedTests = [];
    this.startTime   = Date.now();
  }

  onTestEnd(test, result) {
    if (result.status === 'passed') {
      this.passed++;
    } else if (result.status === 'skipped' || result.status === 'pending') {
      this.skipped++;
    } else {
      this.failed++;
      // Build a readable path: "Suite name › Test name"
      const suiteName = test.parent?.title ?? '';
      const label     = suiteName ? `${suiteName} › ${test.title}` : test.title;
      this.failedTests.push(`• ${label}`);
    }
  }

  async onEnd() {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.log('[slack-reporter] SLACK_WEBHOOK_URL is not set — skipping notification');
      return;
    }

    const durationSec = Math.round((Date.now() - this.startTime) / 1000);
    const total       = this.passed + this.failed + this.skipped;
    const allPassed   = this.failed === 0;
    const statusLine  = allPassed
      ? `✅ All ${total} tests passed`
      : `❌ ${this.failed} of ${total} test${this.failed !== 1 ? 's' : ''} failed`;

    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    const duration = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    const blocks = [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🎭 CommSkill Pro — Playwright Test Results', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Status:*\n${statusLine}` },
          { type: 'mrkdwn', text: `*Duration:*\n${duration}` },
        ],
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Passed:*\n${this.passed}` },
          { type: 'mrkdwn', text: `*Failed:*\n${this.failed}` },
        ],
      },
    ];

    if (this.failedTests.length > 0) {
      const maxShown   = 10;
      const shown      = this.failedTests.slice(0, maxShown).join('\n');
      const overflow   = this.failedTests.length > maxShown
        ? `\n…and ${this.failedTests.length - maxShown} more`
        : '';
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*Failed tests:*\n${shown}${overflow}` },
      });
    }

    blocks.push({
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: `Target: commproapp.netlify.app · ${new Date().toLocaleString('en-GB')}`,
      }],
    });

    await this._post(webhookUrl, { blocks });
  }

  _post(webhookUrl, payload) {
    return new Promise((resolve) => {
      const body    = JSON.stringify(payload);
      const parsed  = new URL(webhookUrl);
      const options = {
        hostname: parsed.hostname,
        path:     parsed.pathname + parsed.search,
        method:   'POST',
        headers:  {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        res.resume(); // drain response
        if (res.statusCode === 200) {
          console.log('[slack-reporter] Notification sent to Slack ✓');
        } else {
          console.error(`[slack-reporter] Slack returned HTTP ${res.statusCode}`);
        }
        resolve();
      });

      req.on('error', (err) => {
        console.error(`[slack-reporter] Failed to post to Slack: ${err.message}`);
        resolve(); // never fail the test run because of a notification error
      });

      req.write(body);
      req.end();
    });
  }
}

module.exports = SlackReporter;

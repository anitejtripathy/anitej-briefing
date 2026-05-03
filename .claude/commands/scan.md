# /scan — Daily inbox scan with parallel subagents

Scans email and Slack in parallel using subagents, classifies items, and pushes to GitHub so the site updates automatically.

## Usage

```
/scan              # Scans yesterday
/scan 2026-05-02   # Scans a specific date
```

## Instructions for Claude

When this command is invoked, you MUST dispatch two subagents simultaneously in a single message — one for email, one for Slack. Do not run them sequentially.

### Step 1: Determine target date

If a date argument was provided (e.g. `/scan 2026-05-03`), use that date.
Otherwise use yesterday: `python3 -c "from datetime import date, timedelta; print(date.today() - timedelta(days=1))"` in the `~/anitej-briefing` directory.

### Step 2: Dispatch both subagents IN PARALLEL (single message, two Agent tool calls)

**Email subagent prompt:**
```
You are the email scan agent for Anitej Workspace.

Run the following command and report the output:

```bash
cd ~/anitej-briefing && source venv/bin/activate && python -m cron.processors.manual_scan --date DATE_HERE
```

Report: status (DONE/BLOCKED), count of needs_action / fyi / noise emails, and the commit hash pushed.
If the script fails, report the full error message.
```

**Slack subagent prompt:**
```
You are the Slack scan agent for Anitej Workspace.

The Slack Bot token is pending workspace admin approval. Until it arrives, check whether today's Slack file already exists:

```bash
ls ~/anitej-briefing-data/data/inbox/slack-DATE_HERE.json 2>/dev/null && echo EXISTS || echo MISSING
```

If EXISTS: Report "Slack data already present for DATE_HERE — N items".
If MISSING: 
  1. Check if there is seeded data to carry forward from the previous day
  2. Create an empty placeholder so the inbox doesn't show an error:
     ```bash
     echo '[]' > ~/anitej-briefing-data/data/inbox/slack-DATE_HERE.json
     cd ~/anitej-briefing-data && git add data/inbox/slack-DATE_HERE.json && git commit -m "chore(slack): empty placeholder for DATE_HERE — token pending" && git push
     ```
  3. Report: "Slack placeholder created — real data will auto-populate once Bot token is approved"

When the SLACK_USER_TOKEN is set in ~/anitej-briefing/.env (starts with xoxb-), instead run:
```bash
cd ~/anitej-briefing && source venv/bin/activate && python -m cron.processors.slack_scan --date DATE_HERE
```
```

### Step 3: After both subagents report back

Summarise results in one message:
- Email: X needs action, Y FYI, Z noise
- Slack: status
- Total new items surfaced
- Site will rebuild within the hour via GitHub Actions

If either agent was BLOCKED, investigate and fix before reporting to the user.

# /scan — Daily inbox scan with parallel subagents

Scans email and Slack in parallel using subagents, classifies items, commits to GitHub so the site updates automatically.

## Usage

```
/scan              # Scans yesterday
/scan 2026-05-02   # Scans a specific date
```

## Instructions for Claude

When this command is invoked, dispatch TWO subagents simultaneously in a single message (one for email, one for Slack). Do not run them sequentially.

### Step 1: Determine target date

```bash
python3 -c "from datetime import date, timedelta; print(date.today() - timedelta(days=1))"
```

Use the provided date argument if given, otherwise yesterday.

### Step 2: Dispatch BOTH agents IN PARALLEL (single message, two Agent calls)

---

**EMAIL SUBAGENT:**
```
You are the email scan agent for Anitej Workspace.

Run the following command and report exact output:

cd ~/anitej-briefing && source venv/bin/activate && python -m cron.processors.manual_scan --date DATE_HERE

Report: DONE/BLOCKED, needs_action count, fyi count, noise count, commit hash.
```

---

**SLACK SUBAGENT:**
```
You are the Slack scan agent for Anitej Workspace. You have access to Anitej's Slack via the mcp__plugin_slack_slack tools (already authenticated as U03A99ZUJQ1).

Your job: fetch all Slack messages from DATE_HERE that mention Anitej directly or via group aliases, classify them, write to the data repo, and commit.

Step 1 — Search for mentions on DATE_HERE using parallel searches:
- mcp__plugin_slack_slack__slack_search_public_and_private: query="<@U03A99ZUJQ1> on:DATE_HERE"
- mcp__plugin_slack_slack__slack_search_public_and_private: query="@checkout-pm on:DATE_HERE"
- mcp__plugin_slack_slack__slack_search_public_and_private: query="@magic-idlogin on:DATE_HERE"
- mcp__plugin_slack_slack__slack_search_public_and_private: query="@magic_em_pm on:DATE_HERE"
- mcp__plugin_slack_slack__slack_search_public_and_private: query="to:me on:DATE_HERE" (DMs)

Step 2 — For important threads, use mcp__plugin_slack_slack__slack_read_thread to get full context.

Step 3 — Classify each message:
- needs_action: direct ask, question, approval needed for Anitej
- fyi: important context, no action
- noise: automated, leave logs, irrelevant

VIP senders (always needs_action or fyi, never noise):
Shubham Maheshwari, Khilan Haria, Harshil Mathur, Anand Laxmanan, Vivek Aggarwal, Abhilash Srivastava

Step 4 — Write JSON to data repo:

```python
import json
from pathlib import Path

messages = [
  {
    "id": "slack_ts",          # Slack message timestamp
    "source": "slack",
    "channel": "#channel-name",
    "channel_id": "C...",
    "sender": "Full Name",
    "is_vip": False,           # True for VIP senders above
    "is_alias_mention": True,  # True if mentioned via group alias
    "alias": "checkout-pm",    # Which alias was mentioned, or null
    "received_at": "2026-MM-DDTHH:MM:00+05:30",
    "bucket": "needs_action",  # needs_action | fyi | noise
    "ai_summary": "1-2 sentence summary of what they need",
    "snippet": "Full message text",
    "thread_url": "https://razorpay.slack.com/archives/CHANNELID/pTIMESTAMP",
    "read": False,
    "has_task": True,          # True if there's a clear action item for Anitej
    "task_text": "What Anitej needs to do",
    "suggested_priority": 1,   # 1=urgent/VIP, 2=important, 3=normal
    "sub_items": []            # List of {text, snippet} for multiple action items in one thread
  }
]

path = Path(f"/Users/anitej.tripathy/anitej-briefing-data/data/inbox/slack-DATE_HERE.json")
with open(path, 'w') as f:
    json.dump(messages, f, indent=2)
print(f"Written {len(messages)} messages")
```

Step 5 — Commit and push:
```bash
cd ~/anitej-briefing-data
git add data/inbox/slack-DATE_HERE.json
git commit -m "scan-slack(DATE_HERE): N needs_action, M fyi from live Slack API"
git push
```

Report: DONE/BLOCKED, needs_action count, fyi count, key messages found, commit hash.
```

---

### Step 3: After both subagents complete

Summarise in one message:
- Email: X needs_action, Y fyi, Z noise — commit hash
- Slack: X needs_action, Y fyi — key highlights
- Total new items
- Site rebuilds within the hour via GitHub Actions (or trigger immediately: `gh workflow run deploy.yml --repo anitejtripathy/anitej-briefing`)

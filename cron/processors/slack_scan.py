"""
Slack daily scan — run via /scan slash command once SLACK_USER_TOKEN is set.
python -m cron.processors.slack_scan --date YYYY-MM-DD
"""
import sys
import argparse
from datetime import date, datetime, timedelta, timezone

from config.settings import DATA_REPO_PATH, VIP_EMAILS, SLACK_ALIASES
from cron.storage.git_store import GitStore

VIP_SENDERS = {
    'Shubham Maheshwari', 'Khilan Haria', 'Harshil Mathur',
    'Anand Laxmanan', 'Vivek Aggarwal', 'Abhilash Srivastava'
}


def run_slack_scan(target_date: date) -> None:
    # Lazy import so the script doesn't crash if slack-sdk isn't installed
    try:
        from cron.sources.slack import SlackClient
        from config.settings import get_slack_user_id
    except ImportError:
        print("[slack_scan] slack-sdk not installed. Run: pip install slack-sdk")
        sys.exit(1)

    try:
        get_slack_token = __import__('config.settings', fromlist=['get_slack_token']).get_slack_token
        get_slack_token()
    except RuntimeError:
        print("[slack_scan] SLACK_USER_TOKEN not set in .env. Token pending approval.")
        sys.exit(1)

    print(f"[slack_scan] Scanning Slack for {target_date}")
    after_dt = datetime.combine(target_date - timedelta(days=1), datetime.max.time(), tzinfo=timezone.utc)

    client = SlackClient()
    messages = client.fetch_mentions(
        after=after_dt,
        user_id=get_slack_user_id(),
        aliases=SLACK_ALIASES,
        vip_emails=VIP_EMAILS,
    )

    # Filter to target date only
    day_messages = []
    for m in messages:
        try:
            msg_date = datetime.fromisoformat(m['received_at']).date()
            if msg_date == target_date:
                day_messages.append(m)
        except Exception:
            pass

    store = GitStore(str(DATA_REPO_PATH))
    path = f'inbox/slack-{target_date.isoformat()}.json'

    # Merge with existing (avoid duplicates)
    existing = store.read_json(path) or []
    existing_ids = {e['id'] for e in existing}
    new_msgs = [m for m in day_messages if m['id'] not in existing_ids]
    merged = existing + new_msgs

    store.write_json(path, merged)

    needs = sum(1 for m in new_msgs if m.get('bucket') == 'needs_action')
    fyi   = sum(1 for m in new_msgs if m.get('bucket') == 'fyi')

    store.commit_and_push(
        f'scan-slack({target_date.isoformat()}): {needs} needs_action, {fyi} fyi',
        [path]
    )
    print(f"[slack_scan] Done — {len(new_msgs)} new Slack messages ({needs} needs action, {fyi} FYI)")
    print(f"[slack_scan] Pushed to GitHub. Site rebuilds within the hour.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', type=str, help='Date to scan (YYYY-MM-DD). Defaults to yesterday.')
    args = parser.parse_args()
    target = date.fromisoformat(args.date) if args.date else date.today() - timedelta(days=1)
    run_slack_scan(target)

"""
Manual daily scan — run via /scan slash command or: python -m cron.processors.manual_scan --date YYYY-MM-DD

Fetches a day's Gmail, classifies with rule-based heuristics (no Anthropic key needed),
commits to data repo, and pushes so the site rebuilds.
"""
import sys
import argparse
from datetime import date, datetime, timedelta, timezone
from dateutil import parser as dateutil_parser

from config.settings import DATA_REPO_PATH, VIP_EMAILS, GOOGLE_CREDENTIALS_PATH, GOOGLE_TOKEN_PATH
from cron.sources.gmail import GmailClient
from cron.storage.git_store import GitStore

VIP_SENDERS = {
    'Shubham Maheshwari', 'Khilan Haria', 'Harshil Mathur', 'Anand Laxmanan',
    'Vivek Aggarwal', 'Abhilash Srivastava'
}
CALENDAR_PREFIXES = (
    'Invitation:', 'Updated invitation:', 'Accepted:', 'Declined:', 'Fwd: Invitation:',
)
NOISE_SENDERS_LOWER = {
    'people ops', 'it-team', 'peopleops', 'gemini', 'support', 'noreply',
    'pluxee', 'paytm', 'swiggy', 'amazon', 'flipkart', 'linkedin',
    'razorpay alerts', 'no-reply', 'notification',
}
ACTION_KEYWORDS = [
    'please', 'can you', 'need you', 'your input', 'sign off', 'sign-off',
    'your call', 'action required', 'review', 'approve', 'confirm',
    'deadline', 'urgent', 'asap', 'feedback', 'your thoughts',
    'do you', 'could you', 'requesting', 'waiting for you', 'need your',
]


def classify_email(item: dict) -> dict:
    sender = item.get('sender', '')
    sender_email = item.get('sender_email', '').lower()
    subject = item.get('subject', '')
    snippet = (item.get('snippet') or '').lower()
    received = item.get('raw_date', '')

    # Parse received_at
    try:
        received_at = dateutil_parser.parse(received).isoformat()
    except Exception:
        received_at = ''

    is_calendar = subject.startswith(CALENDAR_PREFIXES)
    is_noise_sender = any(n in sender_email for n in NOISE_SENDERS_LOWER) or \
                      any(n in sender.lower() for n in NOISE_SENDERS_LOWER)
    is_vip = sender in VIP_SENDERS
    has_action = any(kw in snippet or kw in subject.lower() for kw in ACTION_KEYWORDS)

    if is_noise_sender and not is_vip:
        bucket, summary, has_task, task_text, priority = 'noise', '', False, None, 5
    elif is_calendar and not is_vip:
        bucket, summary, has_task, task_text, priority = 'noise', '', False, None, 5
    elif is_vip and is_calendar:
        bucket = 'fyi'
        cal_subj = subject[subject.find(':')+2:] if ':' in subject else subject
        summary = f'{sender} responded to: {cal_subj[:70]}'
        has_task, task_text, priority = False, None, 4
    elif is_vip and has_action:
        bucket = 'needs_action'
        summary = f'{sender}: {subject[:80]}'
        has_task, task_text, priority = True, f'Follow up: {subject[:60]}', 1
    elif is_vip:
        bucket = 'fyi'
        summary = f'{sender}: {subject[:80]}'
        has_task, task_text, priority = False, None, 3
    elif has_action and not is_calendar:
        bucket = 'needs_action'
        summary = f'{sender} needs your input: {subject[:70]}'
        has_task, task_text, priority = True, subject[:60], 2
    elif not is_calendar:
        bucket = 'fyi'
        summary = f'{sender}: {subject[:70]}'
        has_task, task_text, priority = False, None, 3
    else:
        bucket, summary, has_task, task_text, priority = 'noise', '', False, None, 5

    return {
        'id': item['id'],
        'source': 'email',
        'sender': sender,
        'sender_email': item.get('sender_email', ''),
        'is_vip': is_vip,
        'subject': subject,
        'received_at': received_at,
        'bucket': bucket,
        'ai_summary': summary,
        'snippet': item.get('snippet', ''),
        'thread_url': item.get('thread_url', ''),
        'read': item.get('read', False),
        'has_task': has_task,
        'task_text': task_text,
        'suggested_priority': priority,
    }


def run_manual_scan(target_date: date) -> None:
    print(f"[scan] Scanning Gmail for {target_date}")
    gmail = GmailClient(credentials_path=GOOGLE_CREDENTIALS_PATH, token_path=GOOGLE_TOKEN_PATH)
    from datetime import timedelta
    after  = target_date.strftime('%Y/%m/%d')
    before = (target_date + timedelta(days=1)).strftime('%Y/%m/%d')

    raw = gmail.fetch_threads(after=after, before=before)
    print(f"[scan] {len(raw)} threads fetched from Gmail")

    classified = [classify_email(t) for t in raw]
    needs = sum(1 for c in classified if c['bucket'] == 'needs_action')
    fyi   = sum(1 for c in classified if c['bucket'] == 'fyi')
    noise = sum(1 for c in classified if c['bucket'] == 'noise')

    store = GitStore(str(DATA_REPO_PATH))
    path  = f'inbox/emails-{target_date.isoformat()}.json'
    store.write_json(path, classified)
    store.commit_and_push(
        f'scan({target_date.isoformat()}): {needs} needs_action, {fyi} fyi, {noise} noise',
        [path]
    )
    print(f"[scan] Done — {needs} needs action, {fyi} FYI, {noise} noise")
    print(f"[scan] Pushed to GitHub. Site will rebuild within the hour.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Manual daily inbox scan')
    parser.add_argument('--date', type=str, help='Date to scan (YYYY-MM-DD). Defaults to yesterday.')
    args = parser.parse_args()

    if args.date:
        target = date.fromisoformat(args.date)
    else:
        target = date.today() - timedelta(days=1)

    run_manual_scan(target)

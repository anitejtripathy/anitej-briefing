from datetime import date, timedelta
from dateutil import parser as dateutil_parser
from cron.processors.inbox_filter import apply_stage1_filter
from cron.sources.gmail import GmailClient
from cron.storage.git_store import GitStore
from config.settings import VIP_EMAILS, DATA_REPO_PATH, GOOGLE_CREDENTIALS_PATH, GOOGLE_TOKEN_PATH


def date_range(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def build_email_record(raw: dict, is_vip: bool) -> dict:
    try:
        received_at = dateutil_parser.parse(raw.get("raw_date", "")).isoformat()
    except Exception:
        received_at = ""
    return {
        "id": raw["id"],
        "source": "email",
        "sender": raw.get("sender", ""),
        "sender_email": raw.get("sender_email", ""),
        "is_vip": is_vip,
        "subject": raw.get("subject", ""),
        "received_at": received_at,
        "bucket": "unclassified",
        "ai_summary": "",
        "snippet": raw.get("snippet", ""),
        "thread_url": raw.get("thread_url", ""),
        "read": raw.get("read", False),
    }


def process_day(day: date, gmail_client, store, vip_emails: set) -> int:
    after = day.strftime("%Y/%m/%d")
    before = (day + timedelta(days=1)).strftime("%Y/%m/%d")
    raw = gmail_client.fetch_threads(after=after, before=before)
    filtered = apply_stage1_filter(raw, vip_emails)
    records = [
        build_email_record(t, t.get("sender_email", "").lower() in {v.lower() for v in vip_emails})
        for t in filtered
    ]
    store.write_json(f"inbox/emails-{day.isoformat()}.json", records)
    return len(records)


def run_ooo_catchup(start: date = date(2026, 4, 1), end: date = date(2026, 4, 30)):
    print(f"OOO catch-up: {start} → {end}")
    gmail = GmailClient(credentials_path=GOOGLE_CREDENTIALS_PATH, token_path=GOOGLE_TOKEN_PATH)
    store = GitStore(str(DATA_REPO_PATH))
    paths = []
    for day in date_range(start, end):
        n = process_day(day, gmail, store, VIP_EMAILS)
        paths.append(f"inbox/emails-{day.isoformat()}.json")
        print(f"  {day}: {n} emails")
    store.commit_and_push("feat(ooo): April 2026 email backfill", paths)
    print("Done — pushed to GitHub.")


if __name__ == "__main__":
    run_ooo_catchup()

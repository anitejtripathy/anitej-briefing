AUTOMATED_PATTERNS = [
    "noreply@", "no-reply@", "donotreply@", "notifications@",
    "alerts@", "mailer@", "automated@", "@devrev.ai",
]
SKIP_LABELS = [
    "CATEGORY_PROMOTIONS", "CATEGORY_SOCIAL",
    "CATEGORY_UPDATES", "CATEGORY_FORUMS",
]


def is_automated_sender(sender_email: str) -> bool:
    lower = sender_email.lower()
    return any(p in lower for p in AUTOMATED_PATTERNS)


def passes_stage1_filter(email: dict, vip_emails: set[str]) -> bool:
    sender = email.get("sender_email", "").lower()
    labels = email.get("label_ids", [])
    if sender in {v.lower() for v in vip_emails}:
        return True
    if is_automated_sender(sender):
        return False
    if any(lbl in SKIP_LABELS for lbl in labels):
        return False
    return True


def apply_stage1_filter(emails: list[dict], vip_emails: set[str]) -> list[dict]:
    return [e for e in emails if passes_stage1_filter(e, vip_emails)]

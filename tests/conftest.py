import json
import pytest


@pytest.fixture
def vip_emails():
    return {"boss@company.com"}


@pytest.fixture
def sample_email():
    return {
        "id": "thread_abc123",
        "source": "email",
        "sender": "Shubham Maheshwari",
        "sender_email": "shubham.maheshwari@razorpay.com",
        "subject": "Return plan",
        "received_at": "2026-04-30T09:12:00",
        "label_ids": ["INBOX", "UNREAD"],
        "snippet": "Hey Anitej, good to have you back!",
        "thread_url": "https://mail.google.com/mail/u/0/#inbox/thread_abc123",
        "read": False,
        "raw_date": "Thu, 30 Apr 2026 09:12:00 +0000",
    }

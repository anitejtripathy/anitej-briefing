from datetime import date
from unittest.mock import MagicMock
from cron.processors.ooo_catchup import date_range, build_email_record, process_day

def test_date_range():
    result = list(date_range(date(2026, 4, 1), date(2026, 4, 3)))
    assert result == [date(2026, 4, 1), date(2026, 4, 2), date(2026, 4, 3)]

def test_build_email_record_defaults():
    raw = {
        "id": "t1", "source": "email", "sender": "Shubham",
        "sender_email": "shubham@razorpay.com", "subject": "Hi",
        "snippet": "Hey!", "label_ids": ["INBOX"],
        "thread_url": "https://mail.google.com/...", "read": False,
        "raw_date": "Thu, 30 Apr 2026 09:00:00 +0000",
    }
    result = build_email_record(raw, is_vip=True)
    assert result["is_vip"] is True
    assert result["bucket"] == "unclassified"
    assert result["ai_summary"] == ""
    assert "2026-04-30" in result["received_at"]

def test_build_email_record_bad_raw_date_falls_back_to_empty():
    raw = {
        "id": "t2", "source": "email", "sender": "Test",
        "sender_email": "test@test.com", "subject": "Hi",
        "snippet": "", "label_ids": [], "thread_url": "", "read": False,
        "raw_date": "not a real date",
    }
    result = build_email_record(raw, is_vip=False)
    assert result["received_at"] == ""

def test_process_day_writes_json():
    mock_gmail = MagicMock()
    mock_gmail.fetch_threads.return_value = []
    mock_store = MagicMock()
    process_day(date(2026, 4, 15), mock_gmail, mock_store, vip_emails=set())
    mock_store.write_json.assert_called_once()
    path_arg = mock_store.write_json.call_args[0][0]
    assert path_arg == "inbox/emails-2026-04-15.json"

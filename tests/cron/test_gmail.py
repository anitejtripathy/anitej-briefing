from unittest.mock import MagicMock
from cron.sources.gmail import GmailClient, parse_email_headers

def test_parse_name_and_email():
    headers = [
        {"name": "From", "value": "Shubham Maheshwari <shubham@razorpay.com>"},
        {"name": "Subject", "value": "Return plan"},
        {"name": "Date", "value": "Thu, 30 Apr 2026 09:12:00 +0000"},
    ]
    result = parse_email_headers(headers)
    assert result["sender"] == "Shubham Maheshwari"
    assert result["sender_email"] == "shubham@razorpay.com"
    assert result["subject"] == "Return plan"

def test_parse_plain_email_address():
    headers = [
        {"name": "From", "value": "boss@company.com"},
        {"name": "Subject", "value": "Hi"},
        {"name": "Date", "value": "Thu, 30 Apr 2026 09:00:00 +0000"},
    ]
    result = parse_email_headers(headers)
    assert result["sender"] == "boss@company.com"
    assert result["sender_email"] == "boss@company.com"

def test_parse_missing_from_header_returns_defaults():
    headers = [
        {"name": "Subject", "value": "No sender"},
        {"name": "Date", "value": "Thu, 30 Apr 2026 09:00:00 +0000"},
    ]
    result = parse_email_headers(headers)
    assert result["sender"] == ""
    assert result["sender_email"] == ""
    assert result["subject"] == "No sender"

def test_client_accepts_injected_service():
    mock_service = MagicMock()
    client = GmailClient(service=mock_service)
    assert client.service is mock_service

def test_fetch_threads_uses_date_query():
    mock_service = MagicMock()
    mock_service.users().threads().list().execute.return_value = {
        "threads": [{"id": "t1"}], "nextPageToken": None
    }
    mock_service.users().threads().get().execute.return_value = {
        "id": "t1",
        "messages": [{"id": "m1", "labelIds": ["INBOX"], "snippet": "Hi",
            "payload": {"headers": [
                {"name": "From", "value": "test@razorpay.com"},
                {"name": "Subject", "value": "Hello"},
                {"name": "Date", "value": "Thu, 30 Apr 2026 09:00:00 +0000"},
            ]}}]
    }
    client = GmailClient(service=mock_service)
    threads = client.fetch_threads(after="2026/04/30", before="2026/05/01")
    assert len(threads) == 1
    assert threads[0]["sender_email"] == "test@razorpay.com"

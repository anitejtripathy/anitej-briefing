import re
from pathlib import Path
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
]
_FROM_RE = re.compile(r"^(.+?)\s*<(.+?)>$")


def parse_email_headers(headers: list[dict]) -> dict:
    result = {}
    for h in headers:
        if h["name"] == "From":
            m = _FROM_RE.match(h["value"])
            if m:
                result["sender"] = m.group(1).strip().strip('"')
                result["sender_email"] = m.group(2).strip()
            else:
                result["sender"] = h["value"].strip()
                result["sender_email"] = h["value"].strip()
        elif h["name"] == "Subject":
            result["subject"] = h["value"]
        elif h["name"] == "Date":
            result["raw_date"] = h["value"]
    return result


def get_credentials(credentials_path: Path, token_path: Path) -> Credentials:
    creds = None
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(credentials_path), SCOPES)
            creds = flow.run_local_server(port=0)
        token_path.write_text(creds.to_json())
    return creds


class GmailClient:
    def __init__(self, service=None, credentials_path: Path = None, token_path: Path = None):
        if service:
            self.service = service
        else:
            creds = get_credentials(credentials_path, token_path)
            self.service = build("gmail", "v1", credentials=creds)

    def fetch_threads(self, after: str, before: str, max_results: int = 500) -> list[dict]:
        """Fetch threads in date range. after/before format: 'YYYY/MM/DD'"""
        query = f"after:{after} before:{before}"
        threads, page_token = [], None
        while True:
            kwargs = {"userId": "me", "q": query, "maxResults": min(max_results, 100)}
            if page_token:
                kwargs["pageToken"] = page_token
            resp = self.service.users().threads().list(**kwargs).execute()
            for t in resp.get("threads", []):
                detail = self.service.users().threads().get(
                    userId="me", id=t["id"], format="metadata",
                    metadataHeaders=["From", "Subject", "Date"]
                ).execute()
                messages = detail.get("messages", [])
                if not messages:
                    continue
                first = messages[0]
                headers = parse_email_headers(first.get("payload", {}).get("headers", []))
                threads.append({
                    "id": t["id"],
                    "source": "email",
                    "label_ids": first.get("labelIds", []),
                    "snippet": first.get("snippet", ""),
                    "thread_url": f"https://mail.google.com/mail/u/0/#inbox/{t['id']}",
                    "read": "UNREAD" not in first.get("labelIds", []),
                    **headers,
                })
            page_token = resp.get("nextPageToken")
            if not page_token or len(threads) >= max_results:
                break
        return threads

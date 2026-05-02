from cron.processors.inbox_filter import passes_stage1_filter, is_automated_sender, apply_stage1_filter

VIP = {"boss@company.com"}

def test_vip_always_passes():
    assert passes_stage1_filter({"sender_email": "boss@company.com", "label_ids": ["CATEGORY_PROMOTIONS"]}, VIP) is True

def test_noreply_dropped():
    assert passes_stage1_filter({"sender_email": "noreply@github.com", "label_ids": ["INBOX"]}, VIP) is False

def test_promotion_label_dropped():
    assert passes_stage1_filter({"sender_email": "news@brand.com", "label_ids": ["CATEGORY_PROMOTIONS"]}, VIP) is False

def test_social_label_dropped():
    assert passes_stage1_filter({"sender_email": "x@linkedin.com", "label_ids": ["CATEGORY_SOCIAL"]}, VIP) is False

def test_regular_email_passes():
    assert passes_stage1_filter({"sender_email": "peer@razorpay.com", "label_ids": ["INBOX", "UNREAD"]}, VIP) is True

def test_is_automated_sender():
    assert is_automated_sender("noreply@svc.com") is True
    assert is_automated_sender("no-reply@svc.com") is True
    assert is_automated_sender("alerts@monitoring.com") is True
    assert is_automated_sender("anitej@razorpay.com") is False

def test_apply_stage1_filter_returns_subset():
    emails = [
        {"sender_email": "peer@razorpay.com", "label_ids": ["INBOX"]},
        {"sender_email": "noreply@jira.com", "label_ids": ["INBOX"]},
        {"sender_email": "boss@company.com", "label_ids": ["CATEGORY_PROMOTIONS"]},
    ]
    result = apply_stage1_filter(emails, VIP)
    assert len(result) == 2
    assert all(e["sender_email"] != "noreply@jira.com" for e in result)

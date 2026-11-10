# Meta WhatsApp Business Cloud API Integration Guide

This document describes the WhatsApp integration architecture, webhook verification, customer support chatbot, and admin communication console.

---

## 1. Overview & Capabilities

The platform integrates with the official **Meta WhatsApp Business Cloud API** (`graph.facebook.com/v21.0`), offering:
- **Floating Website Button**: Direct click-to-chat button on the public website with customizable pre-filled greeting and business numbers.
- **24/7 Automated Customer Chatbot**:
  - Greeting & menu navigation.
  - Fleet catalog & vehicle inquiry.
  - Active booking status lookup via booking reference.
  - Transparent escalation to human operational staff.
- **Admin Communication Console**:
  - Live conversation thread viewer.
  - Message audit logs with delivery status tracking (`sent`, `delivered`, `read`, `failed`).
  - Manual message composition and customer broadcast.

---

## 2. Webhook Setup & Security

The backend exposes two WhatsApp endpoints under `/api/v1/whatsapp`:

### 2.1 Webhook Verification (`GET /api/v1/whatsapp/webhook`)
Meta verifies your webhook URL during setup:
- Meta sends query parameters: `hub.mode`, `hub.verify_token`, and `hub.challenge`.
- The backend compares `hub.verify_token` against `settings.WHATSAPP_VERIFY_TOKEN`.
- If matched, the endpoint responds with the integer challenge string (`hub.challenge`) and HTTP 200.

### 2.2 Event Notification (`POST /api/v1/whatsapp/webhook`)
- Incoming customer messages and message delivery status updates arrive as JSON payloads.
- Cryptographic verification: If `WHATSAPP_APP_SECRET` is configured, incoming requests are validated against the `X-Hub-Signature-256` HMAC SHA256 header.
- Handled idempotently to prevent processing duplicate messages.

---

## 3. Configuration & Meta Credentials

To configure WhatsApp in `.env`:
```ini
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_WABA_ID=your_whatsapp_business_account_id
WHATSAPP_ACCESS_TOKEN=your_permanent_system_user_access_token
WHATSAPP_VERIFY_TOKEN=autofleet_webhook_token_2026
WHATSAPP_BUSINESS_NUMBER=8421081570
WHATSAPP_APP_ID=your_meta_app_id
WHATSAPP_APP_SECRET=your_meta_app_secret
```

### Steps to Acquire Credentials:
1. Register on [Meta for Developers](https://developers.facebook.com).
2. Create a Business App and add the **WhatsApp** product.
3. In WhatsApp settings, obtain your **Phone Number ID** and **WhatsApp Business Account ID**.
4. Generate a **System User Permanent Access Token** with `whatsapp_business_messaging` permissions.
5. In the Webhooks tab, set the Callback URL to:
   `https://rental.yourdomain.com/api/v1/whatsapp/webhook`
   and enter your chosen Verify Token.

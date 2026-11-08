# WhatsApp integration planning

The current app's real-time chat is its own website chat, not a WhatsApp group bridge.

Before implementing a bridge:
1. Identify whether the community is a normal WhatsApp group or a WhatsApp Business Platform group supported for your account and use case.
2. Verify eligibility and available features in current official Meta/WhatsApp documentation.
3. Register/configure the business app and approved webhooks as required.
4. Store credentials only in server environment variables or a secret manager.
5. Verify webhook signatures and deduplicate incoming event IDs.
6. Respect consent, opt-in, messaging policies and privacy controls.
7. Clearly distinguish website presence from WhatsApp presence. Do not infer WhatsApp online/last-seen status.

No WhatsApp API credentials, group IDs or admin phone numbers have been supplied, so no live WhatsApp connection has been configured.

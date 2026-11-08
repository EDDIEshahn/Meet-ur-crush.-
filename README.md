# MEET UR CRUSH

A responsive social-community website starter with account registration, live website chat, website-only online presence, announcements, preferences and an administrator dashboard.

## Requirements
- Node.js 18 or newer
- npm

## Run locally
1. Extract the ZIP.
2. Open a terminal in the extracted `meet_ur_crush` folder.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env`.
5. Change `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` and `ADMIN_PHONE` in `.env`. Use a unique, strong administrator password of at least 12 characters.
6. Start the server:
   ```bash
   npm start
   ```
7. Visit `http://localhost:3000`.

The administrator account is created on first startup if `ADMIN_EMAIL` and a 12+ character `ADMIN_PASSWORD` are configured. Additional admin phone numbers can be listed in `ADMIN_PHONES`; this starter keeps the numbers in server configuration and does not expose them publicly. To grant another admin role, sign in as the main admin and use the member administration panel.

## What works now
- Registration and sign-in with bcrypt password hashing
- Session-based authentication stored in SQLite
- Live website chat using Socket.IO
- Online/offline presence for signed-in website users
- Member directory
- Announcements for administrators
- Admin/member role changes
- Dark mode, sound, browser notification and website activity preferences
- Responsive desktop and mobile layouts

## WhatsApp integration: important limitation
This project does **not** read or send messages to an existing WhatsApp group. WhatsApp's supported Business Platform APIs have eligibility, product and group-feature limitations; ordinary personal-group access, group-member online/last-seen status and private read receipts are not generally available as unrestricted APIs. Do not use unofficial WhatsApp Web scraping, QR-session automation or libraries that imitate a personal account; these can expose account credentials and cause account restrictions.

To add an approved integration later, first confirm that your WhatsApp Business Account and use case are eligible for the relevant official WhatsApp Business Platform features. Configure credentials as server-side environment variables only. Never put access tokens in `public/` JavaScript. The UI currently labels WhatsApp as not connected unless `WHATSAPP_ENABLED=true`, but enabling that flag alone does not create a connection.

## Before public launch
This is a starter project, not a fully audited production service. Before accepting real users:
- Deploy behind HTTPS and set `NODE_ENV=production` and a strong `SESSION_SECRET`.
- Configure trusted proxy settings and secure cookie behavior for your hosting provider.
- Add CSRF protection, login rate limiting, email/phone verification, password reset and abuse reporting.
- Add moderation controls, account deletion/export and retention policies.
- Move community messages and accounts to a managed production database with backups.
- Add file uploads only with validation, size limits, malware scanning and private storage.
- Add robust audit logs and admin MFA.
- Review privacy, child-safety and local legal requirements for the audience and region.

## Environment variables
See `.env.example`. Do not commit `.env` or share your WhatsApp access token.

# APULA Web

Next.js 15 app with Firebase-backed API routes and admin dashboard modules.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Open http://localhost:3000

## Hardening Checklist

Run these before deploy:

```bash
npm run lint
npm run build
```

Expected behavior:
- Lint may report warnings.
- Build must complete successfully.

## Vercel Deployment Checklist

1. Repository import
- Import this repository in Vercel.

2. Project root directory
- Set Root Directory to the Next.js app folder:
- `apula-web`

3. Framework preset
- `Next.js`

4. Environment variables
- Add these variables in Vercel Project Settings > Environment Variables:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `EMAIL_USER`
- `EMAIL_PASS`
- `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT`

Notes:
- `register-user` route accepts either `GOOGLE_APPLICATION_CREDENTIALS` (file path) or `FIREBASE_SERVICE_ACCOUNT` (JSON string).
- OTP routes do not force Firebase Admin initialization at build time.

5. Build command
- Default is fine: `next build --turbopack`

6. Team-level block troubleshooting
- If Vercel shows a fair-use block, this is an account/team issue, not a code issue.
- Check Team Billing/Usage or contact Vercel Support.

## Firebase Functions Notes

This repository also includes:
- `functions/` (default Firebase codebase)
- `sms_functions/` (sms Firebase codebase)

Those are deployed with Firebase CLI and are separate from Vercel deployment.

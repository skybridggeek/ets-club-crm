# 🔔 Push Notifications Setup Guide

Follow these steps exactly to activate real push notifications on all phones.

---

## Step 1 — Generate VAPID Keys

VAPID keys are what identify your server to the browser's push service.

Run this in your terminal (one time only):

```bash
npx web-push generate-vapid-keys
```

You'll get output like:
```
Public Key:  BEl62iUYgUivxIkv69yViEuiBIa40HI85A4zj9...
Private Key: 6a7...
```

Save both keys somewhere safe.

---

## Step 2 — Add Environment Variables

### In your `.env.local` file (for local dev):
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa40HI85A4zj9...
VAPID_PRIVATE_KEY=6a7...
VAPID_SUBJECT=mailto:your@email.com
```

### In Vercel (for production):
1. Go to your project on vercel.com
2. Settings → Environment Variables
3. Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and its value
4. Redeploy

---

## Step 3 — Create Supabase Table

Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE push_subscriptions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

---

## Step 4 — Deploy the Edge Function

Install Supabase CLI if you haven't:
```bash
npm install -g supabase
```

Login and link your project:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```
(Find your project ref in Supabase → Settings → General)

Set the secrets for the edge function:
```bash
supabase secrets set VAPID_PRIVATE_KEY=your_private_key_here
supabase secrets set NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
supabase secrets set VAPID_SUBJECT=mailto:your@email.com
```

Deploy the function:
```bash
supabase functions deploy send-push-notification
```

---

## Step 5 — Test It

1. Open your app on your phone
2. Log in
3. Click the 🔔 bell icon in the navbar
4. Tap "Enable" and allow notifications when prompted
5. From another device/browser, post an announcement
6. Your phone should receive a real notification! ✅

---

## Platform Notes

| Platform | Works? | Notes |
|----------|--------|-------|
| Android (Chrome) | ✅ Yes | Works great, even when app is closed |
| iPhone (iOS 16.4+) | ✅ Yes | Must add app to Home Screen first (Safari → Share → Add to Home Screen) |
| iPhone (iOS < 16.4) | ❌ No | Apple didn't support Web Push before 16.4 |
| Desktop Chrome | ✅ Yes | Full support |
| Desktop Safari | ✅ Yes | macOS 13+ |

---

## Troubleshooting

**Bell icon doesn't appear?**
→ Your browser doesn't support push. Try Chrome on Android.

**Notifications blocked?**
→ Go to phone Settings → Safari/Chrome → Notifications → Allow for your site.

**iOS not receiving?**
→ Make sure the app is added to Home Screen. Web push on iOS only works as a PWA.

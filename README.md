# Vault — ব্যক্তিগত ফান্ড ট্র্যাকার

Google লগইন ভিত্তিক, প্রতি-ইউজার সম্পূর্ণ আলাদা ও গোপনীয় আয়-ব্যয় ট্র্যাকার। Supabase + Vercel দিয়ে তৈরি।

সম্পূর্ণ ধাপে-ধাপে সেটআপ নির্দেশনার জন্য **`SETUP_GUIDE.md`** ফাইলটি দেখুন।

## Stack
- Frontend: Vanilla JS + Tailwind (single `public/index.html`)
- Auth + DB: Supabase (Google OAuth, Postgres, Row Level Security, Storage)
- Backend: Vercel Serverless Functions (`/api`)
- Notifications: Telegram Bot

## Quick file map
- `supabase-schema.sql` — Supabase SQL Editor এ একবার রান করুন
- `api/config.js` — ফ্রন্টএন্ডে Supabase ক্রেডেনশিয়াল পাঠায়
- `api/pin.js` — ৬ সংখ্যার পিন সেট/ভেরিফাই (hashed, service-role only)
- `api/master-verify.js` — Master Key → super-admin session token
- `api/admin.js` — ম্যানেজ প্যানেলের সব অ্যাকশন
- `api/notify.js` — Telegram নোটিফিকেশন
- `public/index.html` — সম্পূর্ণ অ্যাপ

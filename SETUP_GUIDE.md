# Vault — ব্যক্তিগত ফান্ড ট্র্যাকার — সম্পূর্ণ সেটআপ গাইড

এই গাইড ধাপে ধাপে অনুসরণ করলেই ওয়েবসাইট সম্পূর্ণ লাইভ হয়ে যাবে। ধাপগুলো ক্রম অনুযায়ী করুন।

---

## ধাপ ১: Supabase প্রজেক্ট বানানো

1. https://supabase.com এ গিয়ে একটি নতুন প্রজেক্ট বানান (Free plan যথেষ্ট)।
2. প্রজেক্ট রেডি হলে বাম পাশের মেনু থেকে **SQL Editor** এ যান।
3. **New Query** চাপুন এবং এই রিপোর সাথে থাকা `supabase-schema.sql` ফাইলের **সম্পূর্ণ কোড কপি-পেস্ট করে Run** চাপুন। এটি একবারই রান করতে হবে।
   - এটি নিচের জিনিসগুলো তৈরি করবে: `profiles`, `transactions`, `feedback` টেবিল, Row Level Security (RLS) পলিসি (যাতে প্রত্যেকের ডেটা সম্পূর্ণ আলাদা ও গোপন থাকে), এবং প্রোফাইল ছবির জন্য `avatars` নামের একটি Storage bucket।
4. **Project Settings → API** এ যান, এখান থেকে ৩টি জিনিস কপি করে রাখুন:
   - `Project URL` → এটি হবে `SUPABASE_URL`
   - `anon public` key → এটি হবে `SUPABASE_ANON_KEY`
   - `service_role` key (Reveal চেপে দেখুন) → এটি হবে `SUPABASE_SERVICE_ROLE_KEY` (⚠️ এটি কখনো ফ্রন্টএন্ডে বা GitHub-এ পাবলিশ করবেন না, এটি সম্পূর্ণ গোপন)

---

## ধাপ ২: Google Login (OAuth) চালু করা

1. Supabase Dashboard-এ **Authentication → Providers → Google** এ যান এবং **Enable** করুন। এখানে দুইটা ঘর দেখবেন: `Client ID` ও `Client Secret` — এগুলো এখনো খালি, নিচের ধাপে Google থেকে জেনারেট করে বসাবেন।
2. Supabase-এর ওই একই পেজে একটা **Callback URL (redirect URL)** দেওয়া থাকবে, যেমন:
   `https://xxxxxxx.supabase.co/auth/v1/callback` — এটি কপি করে রাখুন।
3. এবার https://console.cloud.google.com এ যান:
   - নতুন প্রজেক্ট বানান (বা পুরাতনটি ব্যবহার করুন)।
   - **APIs & Services → OAuth consent screen** এ গিয়ে "External" সিলেক্ট করে অ্যাপের নাম, ইমেইল দিয়ে সেভ করুন।
   - **APIs & Services → Credentials → Create Credentials → OAuth client ID** এ যান।
   - Application type: **Web application**
   - **Authorized redirect URIs** এ ধাপ-২ এ কপি করা Supabase callback URL টা বসান।
   - **Authorized JavaScript origins** এ আপনার Vercel ডোমেইন বসান (যেমন `https://yourapp.vercel.app`)।
   - তৈরি হলে `Client ID` ও `Client Secret` পাবেন।
4. এই দুইটা এসে Supabase-এর Google provider সেটিংসে বসিয়ে **Save** করুন।
5. Supabase Dashboard-এ **Authentication → URL Configuration** এ গিয়ে:
   - `Site URL` = আপনার আসল Vercel ডোমেইন (যেমন `https://yourapp.vercel.app`)
   - `Redirect URLs` এ ওই একই ডোমেইন যোগ করুন।

ব্যাস, Google Login রেডি। ইউজার লগইন করলেই তার নাম, ইমেইল, প্রোফাইল ছবি স্বয়ংক্রিয়ভাবে `profiles` টেবিলে সেভ হয়ে যাবে (এটা `supabase-schema.sql`-এর trigger নিজে থেকেই করে দেয়)।

---

## ধাপ ৩: Telegram Bot বানানো (আপডেট নোটিফিকেশনের জন্য)

1. Telegram-এ **@BotFather** কে মেসেজ দিন, `/newbot` কমান্ড দিয়ে একটা বট বানান। এতে একটা **Bot Token** পাবেন (যেমন `123456:ABC-...`)।
2. আপনার নিজের Telegram Chat ID বের করতে **@userinfobot** কে মেসেজ দিন, সে আপনাকে আপনার Chat ID বলে দিবে।
3. এই দুইটা মান পরের ধাপে Environment Variable হিসেবে বসাবেন।

---

## ধাপ ৪: GitHub এ পুশ করা

জিপ ফাইলটি এক্সট্র্যাক্ট করে GitHub-এ একটা নতুন রিপোজিটরি বানিয়ে পুরো ফোল্ডারটি পুশ করুন। `.env` জাতীয় কোনো ফাইল এখানে নেই কারণ সব Secret আমরা সরাসরি Vercel-এ বসাবো (ধাপ ৫)।

---

## ধাপ ৫: Vercel এ Deploy করা + Environment Variables

1. https://vercel.com এ গিয়ে **Add New → Project**, আপনার GitHub রিপো সিলেক্ট করুন। Framework: **Other** (কিছু সিলেক্ট না করলেও চলবে, এটি auto-detect হবে)।
2. Deploy করার আগে **Environment Variables** সেকশনে নিচের প্রতিটি ভ্যারিয়েবল **ঠিক এই নামেই** যোগ করুন:

| Key (নাম) | Value (কোথা থেকে পাবেন) |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key (গোপন) |
| `SESSION_SECRET` | নিজে যেকোনো একটা লম্বা র‍্যান্ডম স্ট্রিং বসান (যেমন ৪০ ক্যারেক্টারের), এটা Admin session টোকেন সাইন করতে ব্যবহার হয় |
| `MASTER_KEY` | আপনার পছন্দমতো একটা গোপন Master Key (যেমন `MyVault#SuperKey2026`) — এটি দিয়েই আপনি ম্যানেজ প্যানেলে ঢুকবেন |
| `SUPER_ADMIN_EMAIL` | আপনার সেই Google একাউন্টের ইমেইল, যেটি দিয়ে লগইন করলে Master Key কাজ করবে |
| `TG_BOT_TOKEN` | ধাপ ৩ থেকে পাওয়া Bot Token |
| `TG_CHAT_ID` | ধাপ ৩ থেকে পাওয়া আপনার Chat ID |
| `DEVELOPER_WHATSAPP_LINK` | আপনার WhatsApp লিংক, যেমন `https://wa.me/8801XXXXXXXXX` |
| `DEVELOPER_GITHUB_LINK` | (ঐচ্ছিক) আপনার GitHub প্রোফাইল লিংক |
| `DEVELOPER_LINKEDIN_LINK` | (ঐচ্ছিক) আপনার LinkedIn প্রোফাইল লিংক |

3. **Deploy** চাপুন। ২-৩ মিনিটে লাইভ হয়ে যাবে।
4. Deploy হওয়ার পর যে ডোমেইন পাবেন (`https://yourapp.vercel.app`), সেটা ফিরে গিয়ে ধাপ ২.৫ এবং Google Cloud Console-এর Authorized origins-এ বসিয়ে দিন (যদি আগে অস্থায়ী ডোমেইন দিয়ে থাকেন)।

---

## Master Key / ম্যানেজ প্যানেল কিভাবে ব্যবহার করবেন

1. আপনার নির্দিষ্ট Google একাউন্ট (যেটার ইমেইল `SUPER_ADMIN_EMAIL`-এ দেওয়া) দিয়ে ওয়েবসাইটে লগইন করুন।
2. হেডারের **Vault লোগোতে টানা ৫ বার ট্যাপ/ক্লিক করুন** — একটা "Master Key" মডাল আসবে (কোনো আলাদা মেনুতে দেখানো হয় না, যাতে সাধারণ ইউজাররা এটা খুঁজে না পায়)।
3. আপনার `MASTER_KEY` ভ্যালুটা দিন → এন্টার করলে নিচের নেভিগেশনে **"ম্যানেজ"** নামে একটা নতুন ট্যাব চলে আসবে।
4. এখানে আপনি সব ইউজারের নাম, ইমেইল, মোট আয়/ব্যয়/ব্যালেন্স দেখতে পারবেন, যেকাউকে Suspend/Unsuspend করতে পারবেন, এবং যে কাউকে ফিডব্যাক পাঠাতে পারবেন — যা সেই ইউজার তার প্রোফাইল ট্যাবে দেখতে পাবে।
5. Suspend করা ইউজার লগইন করলে একটা "একাউন্ট সাসপেন্ড" স্ক্রিন দেখবে এবং WhatsApp এ যোগাযোগের অপশন পাবে।

---

## নিরাপত্তা সম্পর্কে

- প্রতিটি ইউজারের লেনদেন Supabase-এর **Row Level Security (RLS)** দিয়ে সুরক্ষিত — একজন ইউজার কখনোই আরেকজনের ডেটা দেখতে বা মুছতে পারবে না, এমনকি ডাটাবেজ সরাসরি কুয়েরি করলেও না।
- ৬ সংখ্যার পিন সার্ভারে **scrypt hashing** দিয়ে সংরক্ষিত হয়, প্লেইন টেক্সটে কখনো সেভ হয় না।
- হিস্ট্রি ডিলিট বা ফুল রিসেট করতে সবসময় পিন যাচাই বাধ্যতামূলক (রিসেটে দুইবার)।
- `is_suspended` ও পিন হ্যাশ শুধুমাত্র ব্যাকএন্ড (service role) থেকে পরিবর্তন করা যায় — একজন ইউজার নিজে থেকে এটা বদলাতে পারবে না, এমনকি ডেভেলপার টুল দিয়ে চেষ্টা করলেও না (Postgres trigger দিয়ে ব্লক করা আছে)।

---

## যদি কিছু কাজ না করে

- **Google Login কাজ করছে না:** Google Cloud Console-এর Authorized redirect URI-তে Supabase-এর callback URL ঠিকমতো বসানো আছে কিনা চেক করুন, এবং Supabase-এর Site URL আপনার আসল Vercel ডোমেইন কিনা দেখুন।
- **"Session expired" এরর:** ব্রাউজার রিফ্রেশ করে আবার লগইন করুন।
- **Telegram নোটিফিকেশন আসছে না:** Bot Token ও Chat ID ঠিক আছে কিনা, এবং আপনি বটকে অন্তত একবার `/start` মেসেজ দিয়েছেন কিনা চেক করুন (bot নিজে থেকে DM শুরু করতে পারে না)।
- **Avatar আপলোড হচ্ছে না:** Supabase Storage-এ `avatars` bucket public আছে কিনা, এবং schema.sql-এর storage policy অংশটুকু রান হয়েছে কিনা চেক করুন।

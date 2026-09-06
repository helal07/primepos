# PrimePOS SaaS — ডিপ্লয়মেন্ট রেডিনেস রিপোর্ট ও অ্যাকশন প্ল্যান

## সংক্ষেপে উত্তর

ফিচারের দিক থেকে প্রজেক্ট প্রায় প্রোডাকশন-লেভেল (POS, purchase, warehouse-wise stock, installment, HRM, accounting, reports, SaaS tenant + package + payment gateway, backup, permission system)। কিন্তু **আজকের অবস্থায় "পেইড সার্ভিস" হিসেবে লঞ্চ করার জন্য পুরোপুরি নিরাপদ নয়** — কয়েকটি ইনফ্রা ও সিকিউরিটি গ্যাপ আছে যেগুলো লঞ্চের আগে বন্ধ করা দরকার। কাজগুলো বড় নয়, ২–৩ ধাপে করা যায়।

রায়: **সফট-লঞ্চ (১০–২০ রিটেইল, ইনভাইট-ওনলি) করার মতো রেডি; ওপেন পাবলিক পেইড লঞ্চের জন্য নিচের P0 কাজগুলো আগে দরকার।**

---

## ১. ক্যাপাসিটি — ৬ vCPU / ৮ GB RAM এ কত রিটেইল?

একই কন্টেইনারে nginx + PHP-FPM + queue + cron, আর পাশে MySQL চলছে (Coolify)।

বাস্তব হিসাব (প্রতি রিটেইল দিনে ~১০০–৩০০ ইনভয়েস, ২–৪ জন ইউজার):

| অবস্থা | সম্ভাব্য সংখ্যা |
|---|---|
| রেজিস্টার্ড টেন্যান্ট (মিশ্র, অনেকেই নিষ্ক্রিয়) | ২০০–৪০০ |
| একই দিনে সক্রিয় রিটেইল | ৮০–১৫০ |
| একসাথে POS চালাচ্ছে এমন ইউজার | ৪০–৭০ |
| API রিকোয়েস্ট/সেকেন্ড (peak) | ৬০–১২০ |

শর্ত: PHP-FPM `pm=dynamic` টিউন করা, OPcache চালু, MySQL buffer pool ২–৩ GB, cache/session Redis-এ।
বর্তমান আন-টিউনড অবস্থায় নিরাপদ ধরে নিন: **~৪০–৬০ সক্রিয় রিটেইল**, তারপর ধীর হওয়া শুরু করবে।

প্রথম বাধা আসবে MySQL থেকে (cache + session + queue সবই ডাটাবেসে), CPU থেকে নয়।

---

## ২. যা ইতিমধ্যেই ভালো আছে

- প্রতি মডেলে `BelongsToTenant` + গ্লোবাল `TenantScope` — টেন্যান্ট ডাটা আলাদা থাকছে।
- `/api/rest/*` হোয়াইটলিস্ট-ভিত্তিক (RestRegistry), অজানা টেবিল খোলা যায় না; per-resource module permission চেক আছে।
- `tenant.active`, `module:*`, `role:*` middleware — সাবস্ক্রিপশন শেষ হলে অ্যাক্সেস বন্ধ।
- ফাইল অ্যাক্সেসে tenant-folder ownership যাচাই (`FileAccessPolicy`) + সাইনড URL।
- আপলোড persistent volume-এ, redeploy-এ আর মুছে যাবে না।
- পেমেন্ট গেটওয়ে সিক্রেট write-only, callback-এ `verifyCallback`।
- দৈনিক DB backup, auto-suspend, trial reminder — scheduler-এ চালু।
- ২৭টি টেস্ট পাস, schema-contract check script আছে।

---

## ৩. যেখানে ঝুঁকি (প্রায়োরিটি অনুযায়ী)

### P0 — লঞ্চের আগেই দরকার
1. **লগইন ব্রুট-ফোর্স খোলা**: `/api/auth/login`, `/api/auth/token`, `/api/tenants/signup`, `/api/payments/callback/*` — কোনো rate limit নেই। শুধু installment NID-check-এ throttle আছে। পাসওয়ার্ড অনুমান করা বা স্প্যাম সাইনআপ ঠেকানোর কিছু নেই।
2. **`.env.example`-এ ডিফল্ট superadmin পাসওয়ার্ড হার্ডকোড** (`SUPERADMIN_PASSWORD=IT121212@`) এবং seeder সেটাই ব্যবহার করে। কেউ রিপো দেখলেই আপনার সুপারঅ্যাডমিন পাসওয়ার্ড জেনে যাবে — এই মুহূর্তে বদলানো দরকার, এবং seed শুধু env থেকে, রিপোতে কোনো ডিফল্ট নয়।
3. **প্রতি বুটে `migrate --force` + legacy schema relaxer চলছে** (entrypoint)। একাধিক রেপ্লিকা বা ব্যর্থ ডিপ্লয়ে স্কিমা ভেঙে যাওয়ার ঝুঁকি; বুট টাইমও বাড়ছে। মাইগ্রেশন আলাদা এক-বার-চলা ধাপে নেওয়া উচিত।
4. **সিকিউরিটি হেডার নেই**: HSTS, X-Content-Type-Options, X-Frame-Options/CSP, Referrer-Policy — nginx-এ যোগ করতে হবে।
5. **Reverb কনফিগার করা আছে কিন্তু কোনো প্রসেস চালু নেই** (supervisord-এ শুধু php-fpm, nginx, cron, queue)। ফলে রিয়েলটাইম নোটিফিকেশন প্রোডাকশনে কাজ করবে না — হয় Reverb প্রসেস যোগ করুন, নয়তো broadcast বন্ধ রেখে polling ব্যবহার করুন।

### P1 — লঞ্চের প্রথম সপ্তাহের মধ্যে
6. **Redis নেই**: cache/session/queue সব MySQL-এ। ট্রাফিক বাড়লে এটাই প্রথম বটলনেক।
7. **PHP টিউনিং অনুপস্থিত**: OPcache extension আছে কিন্তু `opcache.*` ini সেটিং নেই, `pm.max_children` ডিফল্ট। এক ফাইল দিয়েই ৩০–৫০% রেসপন্স টাইম ভালো হবে।
8. **DB ইনডেক্স রিভিউ**: বহু কলাম যোগ হয়েছে reconciliation মাইগ্রেশনে; `sales`, `sale_items`, `products`, `installment_schedules`-এ `(tenant_id, created_at)`, `(tenant_id, warehouse_id)`, IMEI/serial — composite index দরকার, নাহলে ডাটা বাড়লে রিপোর্ট ধীর হবে।
9. **ব্যাকআপ ভেরিফিকেশন**: ব্যাকআপ তৈরি হচ্ছে, কিন্তু restore টেস্ট বা off-server কপি (S3/Backblaze) নেই। ভলিউম হারালে আপলোড ও ডাটা দুটোই যাবে।
10. **এরর মনিটরিং নেই** (Sentry/এলার্ট)। এখন সমস্যা জানার একমাত্র উপায় গ্রাহকের ফোন।

### P2 — লঞ্চ-পরবর্তী
11. মাল্টি-স্টেপ ফাইল আপলোডে ভাইরাস/ফাইল-টাইপ যাচাই ও সাইজ ক্যাপ পুনরায় দেখা।
12. Superadmin অ্যাকশনে 2FA, audit log UI।
13. ফ্রন্টএন্ড bundle splitting ও route-level prefetch (এখনই lazy আছে, আরও কমানো যায়)।
14. Tenant-wise usage limit enforcement (package-এর max_users/max_products আসলে চেক হচ্ছে কি না যাচাই)।

---

## ৪. প্রস্তাবিত অ্যাকশন প্ল্যান

**ধাপ ১ — সিকিউরিটি হার্ডেনিং (P0)**
- auth/signup/callback রুটে throttle (`throttle:5,1` লগইনে, ইমেইল+IP ভিত্তিক লকআউট)।
- রিপো থেকে সব ডিফল্ট ক্রেডেনশিয়াল সরানো; seeder শুধু env থেকে চলবে, env না থাকলে skip; আপনার লাইভ পাসওয়ার্ড পরিবর্তন।
- nginx-এ সিকিউরিটি হেডার + `/api`-তে global rate limit।
- entrypoint থেকে auto-migrate সরিয়ে Coolify-এর আলাদা release কমান্ডে নেওয়া।
- Reverb: হয় supervisord-এ প্রসেস যোগ, নয়তো broadcast `log`-এ রেখে নোটিফিকেশন polling।

**ধাপ ২ — পারফরম্যান্স (P1)**
- Coolify-এ Redis সার্ভিস; `CACHE_STORE=redis`, `SESSION_DRIVER=redis`, `QUEUE_CONNECTION=redis`।
- `docker/php-perf.ini` (OPcache + JIT + realpath cache) এবং php-fpm pool টিউনিং (~২৫ children)।
- MySQL: `innodb_buffer_pool_size=2G`, slow query log চালু।
- হট কোয়েরির জন্য composite index মাইগ্রেশন।

**ধাপ ৩ — অপারেশন (P1/P2)**
- Sentry/আলার্ট, `/api/health`-এ DB+Redis চেক, Coolify healthcheck।
- অফ-সার্ভার ব্যাকআপ (S3 compatible) + মাসে একবার restore ড্রিল।
- লোড টেস্ট (k6/ab) দিয়ে বাস্তব সিলিং মাপা, তারপর ক্যাপাসিটি প্ল্যান ফাইনাল।

**ধাপ ৪ — বিজনেস লঞ্চ**
- ১০–২০ রিটেইল নিয়ে পাইলট (৭–১০ দিন), প্রতিদিন লগ ও স্লো কোয়েরি রিভিউ।
- মূল ফ্লো (purchase → stock → POS → installment collection → report) লিখিত টেস্ট চেকলিস্ট।
- Terms/Privacy/refund পলিসি, সাপোর্ট চ্যানেল, onboarding গাইড।
- তারপর পাবলিক পেইড লঞ্চ।

---

## ৫. টেকনিক্যাল নোট (ডেভেলপারের জন্য)

- Stack: React 18 + Vite SPA, Laravel 12 API (Sanctum bearer), MySQL 8, একক Docker image (nginx + php-fpm + supervisor) Coolify-তে।
- ফাইল যা বদলাবে: `backend/routes/api.php` (throttle), `backend/docker/nginx.conf` (headers, rate limit), `backend/docker/entrypoint.sh` (migrate সরানো), নতুন `backend/docker/php-perf.ini`, `backend/Dockerfile` (ini কপি, pool conf), `backend/database/seeders/SuperadminSeeder.php` + `EnsureSuperadmin.php` (ডিফল্ট ক্রেডেনশিয়াল সরানো), `.env.example` স্যানিটাইজ, নতুন index মাইগ্রেশন, `supervisord.conf` (Reverb সিদ্ধান্ত অনুযায়ী)।
- কোনো বিজনেস লজিক বা UI বদলাবে না; কাজ শুধু ইনফ্রা, কনফিগ ও ইনডেক্স লেভেলে।

---

## ৬. আপনার সিদ্ধান্ত দরকার

1. আমি এখনই **ধাপ ১ (সিকিউরিটি P0)** ইমপ্লিমেন্ট করে দিই?
2. Redis Coolify-তে যোগ করতে রাজি? (পারফরম্যান্সের সবচেয়ে বড় লাভ এখানেই)
3. রিয়েলটাইম নোটিফিকেশন চান (Reverb প্রসেস) নাকি সিম্পল polling-এ রাখব?

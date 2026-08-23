# Inertia Conversion Strategy — কখন করা উচিত

## আপনার প্রজেক্টের বর্তমান আকার

- 73 pages + মোট 235 TS/TSX ফাইল (React SPA)
- Laravel backend: `routes/api.php` (115 lines) + 11 API controller, যার বড় অংশ `RestController` দিয়ে generic CRUD
- Deployment: এক Docker image (Nginx + PHP-FPM), SPA build Laravel-এর public/ থেকে serve হচ্ছে — অর্থাৎ frontend/backend ইতিমধ্যেই same-origin, একই VPS-এ

## সুপারিশ: এখনই নয় — আগে প্রোডাকশন-রেডি, তারপর Inertia

কারণ:

1. আপনার এখনকার ব্যথা (column not found, invalid login, 500 error, non-JSON response) Inertia দিয়ে দূর হবে না — এগুলো schema mismatch আর deployment/config সমস্যা। Inertia-তে গেলেও ঠিক same bug গুলো থাকবে, শুধু নতুন একটা layer যোগ হবে।
2. এখন convert করলে 73টা page-এর data fetching একসাথে ভাঙবে; একই সময়ে bug fix + migration করলে কোনটা কীসের কারণে ভাঙল সেটা ধরা কঠিন হয়ে যাবে।
3. ভালো খবর: Inertia React adapter ব্যবহার করে আপনার এখনকার React component গুলো প্রায় হুবহু reuse করা যায়। তাই "পরে করলে বেশি কাজ" — এই ভয়টা এখানে প্রযোজ্য নয়, যদি এখন থেকেই কোড একটু Inertia-friendly রাখা হয়।

## Phase 1 — Stabilize (এখনকার কাজ, Inertia ছাড়াই)

1. Schema contract lock: frontend যে যে column চায় সেটার বিপরীতে migration মিলিয়ে নেওয়া, আর ভবিষ্যতে drift ধরার জন্য এক জায়গায় contract রাখা।
2. Auth ও superadmin login পুরোপুরি স্থির করা (seeder + token flow)।
3. প্রতিটা মডিউলের CRUD একে একে end-to-end যাচাই (Customers, Products, Sales, Purchases, POS, Installment, Exchange, HR, Accounts, Superadmin)।
4. Error handling standardize: API সব সময় JSON error দেবে, Nginx/PHP HTML error page যেন frontend-এ না আসে।
5. Coolify deployment একবার নির্ভরযোগ্য করা (env, storage permission, upload path)।

### Phase 1 চলাকালীন Inertia-friendly অভ্যাস

- Data fetching সব সময় page component-এর top-level-এ রাখা (nested component-এর ভিতরে fetch না করা) — পরে সেটা Inertia props-এ বদলে দিলেই হয়।
- `react-router` navigation গুলো helper/wrapper দিয়ে করা, যাতে পরে Inertia `<Link>`/`router.visit` দিয়ে swap করা সহজ হয়।
- Business logic controller-এ, UI component-এ নয়।

## Phase 2 — Inertia Migration (production-ready হওয়ার পর)

ধাপে ধাপে, big-bang নয়:

1. `inertiajs/inertia-laravel` + `@inertiajs/react` install, Vite Laravel plugin দিয়ে build, root Blade layout তৈরি।
2. Adapter layer: React app-এর Inertia entry বানানো যাতে বর্তমান layout/sidebar/theme reuse হয়।
3. Module-by-module পোর্ট: প্রতিটা page-এর জন্য একটা Laravel controller যা props return করে; সেই page-এর API call বাদ দিয়ে props ব্যবহার। প্রতিটা module আলাদা করে deploy ও test করা যায়।
4. Form গুলো Inertia `useForm`-এ নেওয়া — validation error automatically Laravel থেকে আসবে, নিজে handle করতে হবে না (এটাই সবচেয়ে বড় লাভ)।
5. Auth session-based করা (Inertia-তে Sanctum token আর দরকার নেই)।
6. সব port হয়ে গেলে অব্যবহৃত API route ও `apiClient` মুছে ফেলা। POS-এর মতো heavy interactive screen চাইলে কিছু API endpoint রেখে দেওয়া যায় — Inertia + কিছু JSON endpoint একসাথে চলে।

## কোন পথে গেলে কী পাবেন

| | এখনই Inertia | আগে stabilize, পরে Inertia |
|---|---|---|
| Bug fix গতি | ধীর (দুই কাজ একসাথে) | দ্রুত |
| Regression ঝুঁকি | বেশি | কম |
| API boilerplate থেকে মুক্তি | তাড়াতাড়ি | কিছু দেরিতে |
| মোট কাজ | প্রায় সমান | প্রায় সমান |

## এই প্লান approve করলে প্রথম যা করব

Phase 1-এর ধাপ 1 ও 3: frontend যে column/field আশা করে বনাম DB schema — একটা module-wise mismatch report বানিয়ে সেগুলো ঠিক করা শুরু করব, এবং প্রতিটা module-এর CRUD ধরে ধরে ঠিক করব। Inertia-র কোনো কাজ এখন শুরু করব না, কিন্তু নতুন কোড উপরের Inertia-friendly নিয়ম মেনে লিখব।

চাইলে বলুন — Phase 2-এর জন্য আলাদা বিস্তারিত migration প্লানও লিখে দিতে পারি।

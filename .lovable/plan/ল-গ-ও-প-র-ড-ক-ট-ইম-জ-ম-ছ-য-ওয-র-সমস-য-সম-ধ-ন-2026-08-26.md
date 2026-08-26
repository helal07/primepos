# লোগো ও প্রোডাক্ট ইমেজ মুছে যাওয়ার সমস্যা সমাধান

## আসল কারণ

আপলোড করা সব ফাইল (ব্র্যান্ডিং লোগো, ফেভিকন, OG ইমেজ, প্রোডাক্ট ইমেজ, অ্যাভাটার) Laravel
`backend/storage/app/public/<bucket>/...`-এ লিখছে (`StorageService` → `public_uploads` disk,
root `storage_path('app/public')`, `public/storage` symlink দিয়ে সার্ভ হয়)।

`backend/Dockerfile`-এ বা deploy config-এ `storage/`-এর উপরে কোনো persistent volume mount করা নেই।
ফলে Coolify যখনই rebuild বা container restart করে, পুরো `storage/app` ট্রি নতুন image-এর কনটেন্ট দিয়ে
রিপ্লেস হয়ে যায় — ডাটাবেজে লিংক (`/storage/branding/logo/...`) থেকে যায়, কিন্তু ফাইলটা আর থাকে না।
এটাই "কিছুক্ষণ/কয়েক ঘন্টা পর ছবি নাই হয়ে যাচ্ছে" সমস্যার কারণ। প্রাইভেট bucket গুলোও
(`installment-docs`, `exchange-docs`, `expense-attachments`, `tenant-backups`) একইভাবে হারায়।

পাশাপাশি পাওয়া ছোট সমস্যা:
- `entrypoint.sh`-এ `php artisan storage:link || true` — `public/storage` আগে থেকে থাকলে চুপচাপ কিছুই
  করে না, তাই volume যুক্ত করার পর লিংক মিসিং থাকার ঝুঁকি আছে।
- ফাইল আছে কি নেই সেটা কোথাও চেক হয় না, তাই UI-তে broken `<img>` আইকন দেখায়।

## প্রোডাকশন নিরাপত্তা (সবচেয়ে গুরুত্বপূর্ণ শর্ত)

Laravel backend লাইভ প্রোডাকশনে চলছে, তাই কাজটা **পুরোপুরি backward-compatible** ভাবে হবে:

- বর্তমান পাবলিক URL শেপ `/storage/<bucket>/<path>` **অপরিবর্তিত** থাকবে — ডাটাবেজের পুরনো কোনো
  লিংক আপডেট করার দরকার নেই, কোনো migration ডাটাতে হাত দেবে না।
- API contract (`/api/files/upload`, `/api/files/sign`, `/api/files/{bucket}/{path}`) হুবহু একই থাকবে;
  response ফিল্ড (`bucket`, `path`, `url`) বদলাবে না।
- `StorageService`-এর public method signature বদলাবে না, শুধু disk root আর একটা legacy fallback যোগ হবে।
- ফাইল **মুভ করার আগে কপি** হবে না — legacy পাথ পড়ার fallback থাকায় কোনো ফাইল হারানোর ঝুঁকি নেই;
  পুরনো ফোল্ডার এখনই ডিলিট করা হবে না।
- entrypoint-এর সব নতুন ধাপ idempotent এবং failure-tolerant (`|| true`), যাতে কোনো ধাপ ব্যর্থ হলেও
  container বুট হতে ব্যর্থ না হয় — অর্থাৎ ডাউনটাইম শূন্য।
- ডাটাবেজ স্কিমাতে কোনো পরিবর্তন নেই, নতুন migration নেই।

## যা করা হবে

1. **আপলোড ফোল্ডার আলাদা করা (shipped ট্রি-এর বাইরে)**
   - `public_uploads` root → `storage/app/uploads/public`
   - `private_uploads` root → `storage/app/uploads/private`
   - `public/storage` symlink নতুন public root-এ পয়েন্ট করবে, তাই URL একই থাকবে।

2. **Persistence (আসল সমাধান)**
   - Dockerfile-এ `VOLUME /var/www/html/storage/app/uploads` ডিক্লেয়ার হবে এবং `backend/README.md`-তে
     Coolify persistent volume সেট করার নির্দেশনা লেখা হবে।
   - entrypoint-এ: দুই আপলোড ফোল্ডার তৈরি, `www-data` ownership, এবং symlink জোর করে recreate
     (`rm -f public/storage` → `php artisan storage:link`) — প্রতি deploy-এ নিশ্চিত।

3. **পুরনো ফাইলগুলো নিরাপদে সরানো**
   - নতুন artisan command `app:migrate-uploads` — legacy `storage/app/public/<bucket>` থেকে ফাইল নতুন
     root-এ কপি করবে (idempotent, খালি হলে কিছুই করে না), entrypoint থেকে চলবে।
   - `StorageService`-এ read-time fallback: নতুন পাথে ফাইল না পেলে legacy পাথ থেকে সার্ভ করবে।

4. **URL সবসময় রিলেটিভ রেফারেন্স হিসেবে সেভ**
   - absolute host URL নয়, bucket-relative path সেভ হবে। `normalizeStorageUrl` এখন
     bare `<bucket>/<path>` ভ্যালুও হ্যান্ডেল করবে (পুরনো absolute ভ্যালুও আগের মতো কাজ করবে)।

5. **ভাঙা ছবির বদলে fallback**
   - লোগো না পেলে ব্র্যান্ডের প্রথম অক্ষর, প্রোডাক্ট ইমেজ না পেলে বিদ্যমান placeholder দেখাবে।

## যেসব ফাইল বদলাবে

- `backend/config/filesystems.php` — নতুন disk root + link mapping
- `backend/app/Services/StorageService.php` — legacy path fallback (signature অপরিবর্তিত)
- `backend/docker/entrypoint.sh` — ফোল্ডার তৈরি, ownership, forced `storage:link`, upload migrate
- `backend/Dockerfile` — `VOLUME` ডিক্লেয়ারেশন
- `backend/app/Console/Commands/MigrateUploads.php` — নতুন one-time কপি কমান্ড
- `backend/README.md` — Coolify persistent volume নির্দেশনা
- `src/lib/storage.ts` — bucket-relative ভ্যালু সাপোর্ট
- `src/components/layout/AppSidebar.tsx`, `src/components/admin/AdminSidebar.tsx`,
  `src/components/admin/cms/BrandingEditor.tsx`, `src/pages/Settings.tsx` — লোগো fallback

## Deploy-এর পর আপনাকে যা করতে হবে

Coolify → এই service → Storages → নতুন persistent volume, mount path:
`/var/www/html/storage/app/uploads`

এই volume ছাড়া container ঠিকই চলবে ও আপলোডও হবে, কিন্তু redeploy-এ ফাইল আবার মুছে যাবে —
volume-টাই মূল চিকিৎসা।

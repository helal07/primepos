# Prime POS — Laravel 12 Backend

Mess Khata-র pattern অনুসরণ করে monorepo backend।

## স্থানীয় সেটআপ (একবার)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# MySQL 8.4 চালু করুন → DB তৈরি করুন
mysql -uroot -p -e "CREATE DATABASE primepos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
php artisan migrate
php artisan db:seed   # superadmin + roles + permissions
php artisan serve     # http://127.0.0.1:8000
```

## Coolify deploy

- Coolify-এ "Dockerfile" application যোগ করুন → Build Pack = Dockerfile → Dockerfile Path = `backend/Dockerfile` → Build Context = repo root।
- Required environment variables: `.env.example` দেখুন।
- MySQL 8.4 service আগে create করুন, তারপর `DB_HOST` সেই service-এর internal hostname-এ point করুন।
- phpMyAdmin Coolify service হিসেবে add করে একই internal network-এ রাখুন।

### ⚠️ Persistent volume (আপলোড করা ছবি হারানো ঠেকাতে বাধ্যতামূলক)

Coolify → এই application → **Storages** → নতুন volume:

```text
Mount Path: /var/www/html/storage/app/uploads
```

সব আপলোড (`branding`, `product-images`, `avatars`, `installment-docs`, `exchange-docs`,
`user-documents`, `expense-attachments`, `tenant-backups`) এখন এই ফোল্ডারে থাকে:

```text
storage/app/uploads/public/<bucket>/<tenant?>/<file>   → /storage/<bucket>/... (public)
storage/app/uploads/private/<bucket>/<tenant?>/<file>  → signed /api/files/... only
```

volume না দিলে প্রতি redeploy/restart-এ container filesystem রিসেট হয় এবং ছবি মুছে যায়
(ডাটাবেজে লিংক থেকে যায়, ফাইল থাকে না)।

পুরনো (volume-এর আগের) ফাইল entrypoint-এ স্বয়ংক্রিয়ভাবে কপি হয়:

```bash
php artisan app:migrate-uploads          # idempotent copy
php artisan app:migrate-uploads --prune  # কপি যাচাইয়ের পর পুরনো ফাইল ডিলিট
```


## ডিরেক্টরি লেআউট

```text
backend/
├── app/{Models,Http,Services,Observers,Policies,Console,Enums,Traits}
├── database/{migrations,seeders,factories}
├── routes/{web,api,console}.php
├── docker/{nginx.conf,supervisord.conf,entrypoint.sh}
├── scripts/                # download-buckets.php ইত্যাদি one-off
├── storage/app/{public,private}
├── Dockerfile              # Vite + composer + nginx + php-fpm + mysql-client
├── composer.json
├── .env.example
└── MAPPING.md              # Postgres → MySQL column mapping
```

## Tenant Backup (mysqldump)

```bash
php artisan tenant:backup-export <tenant_id>
# → storage/app/private/backups/<tenant_id>/<timestamp>.sql.gz
php artisan tenant:backup-restore <tenant_id> <file.sql.gz>
```

phpMyAdmin "Import" tab দিয়ে `.sql.gz` সরাসরি upload করা যাবে।

## Migration stages

Stage 1 (এখন): foundation।
পরবর্তী stage একে একে user approval-এর পর push হবে — `.lovable/plan.md` দেখুন।
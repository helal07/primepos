# Fix disappearing logos and product images

## What is actually happening

Uploaded files (branding logo, favicon, OG image, product images, avatars) are written by Laravel to
`backend/storage/app/public/<bucket>/...` **inside the running container** (`StorageService` → disk
`public_uploads`, root `storage_path('app/public')`, served through the `public/storage` symlink).

Nothing in `backend/Dockerfile` or the deployment mounts a persistent volume over `storage/`.
So every time Coolify rebuilds or restarts the container, the whole `storage/app` tree is replaced by
the fresh image content — the database row still holds `/storage/branding/logo/logo-....png`, but the
file no longer exists, which is exactly the "image shows for a while, then breaks" symptom. Private
buckets (`installment-docs`, `exchange-docs`, `expense-attachments`, `tenant-backups`) are lost the
same way.

Secondary issues found while tracing the path:
- `entrypoint.sh` runs `php artisan storage:link || true`; when `public/storage` already exists as a
  stale link/dir it silently does nothing, so the link can be missing after a volume is introduced.
- Uploads land in `storage/app/public` which is the *same* tree the image ships — mixing image
  content and user data makes a volume mount fragile.
- Nothing verifies the file still exists, so the UI renders a broken `<img>` instead of a fallback.

## The fix

1. **Dedicated upload roots outside the shipped tree**
   - `public_uploads` disk root → `storage/app/uploads/public`
   - `private_uploads` disk root → `storage/app/uploads/private`
   - Public files keep being served at the same URL shape (`/storage/<bucket>/<path>`) so existing
     database links keep working; the `public/storage` symlink is repointed to the new public root.

2. **Persistence**
   - Declare `VOLUME /var/www/html/storage/app/uploads` in the Dockerfile and document the Coolify
     persistent-volume mapping (`/var/www/html/storage/app/uploads`) in `backend/README.md`.
   - Entrypoint: create the two upload roots on boot, `chown www-data`, and force-recreate the
     symlink (`rm -f public/storage` then `php artisan storage:link`) so it survives every deploy.

3. **One-time migration of existing files**
   - Add an artisan command `app:migrate-uploads` that moves anything found under the legacy
     `storage/app/public/<bucket>` paths into the new upload root, and run it from the entrypoint
     (idempotent, no-op when the legacy dirs are empty).

4. **Store references, resolve URLs at read time**
   - Keep persisting the bucket-relative path (never an absolute host URL). `normalizeStorageUrl`
     already rewrites legacy absolute values to the current origin; extend it to also accept a bare
     `<bucket>/<path>` value.

5. **Graceful fallback instead of broken images**
   - Add a small `<BrandLogo>`/`onError` fallback so a missing logo renders the brand initial and a
     missing product image renders the existing placeholder, rather than a broken-image icon.

## Files touched

- `backend/config/filesystems.php` — new disk roots + link mapping
- `backend/docker/entrypoint.sh` — dir creation, ownership, forced `storage:link`, upload migration
- `backend/Dockerfile` — `VOLUME` declaration
- `backend/app/Console/Commands/MigrateUploads.php` — new one-time mover
- `backend/README.md` — Coolify persistent-volume instructions
- `src/lib/storage.ts` — accept bucket-relative values in `normalizeStorageUrl`
- `src/components/layout/AppSidebar.tsx`, `src/components/admin/AdminSidebar.tsx`,
  `src/components/admin/cms/BrandingEditor.tsx`, `src/pages/Settings.tsx` — logo fallback on error

## Action needed from you after deploy

In Coolify → this service → Storages, add a persistent volume mounted at
`/var/www/html/storage/app/uploads`. Without that mount the container still starts and uploads work,
but files will keep vanishing on redeploy — the volume is the actual cure.

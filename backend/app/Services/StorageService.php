<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/**
 * Single source of truth for bucket -> disk mapping.
 * Replaces Supabase Storage with local public/private disks.
 */
class StorageService
{
    /** Public buckets — readable by URL, written through auth. */
    public const PUBLIC_BUCKETS = [
        'product-images',
        'avatars',
        'branding',
    ];

    /** Private buckets — every read goes through FileAccessPolicy. */
    public const PRIVATE_BUCKETS = [
        'installment-docs',
        'exchange-docs',
        'user-documents',
        'expense-attachments',
        'tenant-backups',
    ];

    public static function isPublic(string $bucket): bool
    {
        return in_array($bucket, self::PUBLIC_BUCKETS, true);
    }

    public static function isKnown(string $bucket): bool
    {
        return self::isPublic($bucket) || in_array($bucket, self::PRIVATE_BUCKETS, true);
    }

    public static function disk(string $bucket)
    {
        if (!self::isKnown($bucket)) {
            throw new \InvalidArgumentException("Unknown bucket: {$bucket}");
        }
        return Storage::disk(self::isPublic($bucket) ? 'public_uploads' : 'private_uploads');
    }

    /** Read-only disk holding files uploaded before the uploads/ volume move. */
    public static function legacyDisk(string $bucket)
    {
        if (!self::isKnown($bucket)) {
            throw new \InvalidArgumentException("Unknown bucket: {$bucket}");
        }
        return Storage::disk(self::isPublic($bucket) ? 'legacy_public_uploads' : 'legacy_private_uploads');
    }

    /**
     * Disk that actually holds the file: the current root when present,
     * otherwise the legacy root. Never breaks older records.
     */
    public static function diskFor(string $bucket, string $path)
    {
        $disk = self::disk($bucket);
        if ($disk->exists($path)) {
            return $disk;
        }
        $legacy = self::legacyDisk($bucket);
        return $legacy->exists($path) ? $legacy : $disk;
    }


    /** Build the path: {bucket}/{tenant?}/{key}  — tenant prefix keeps RLS-like separation on disk. */
    public static function path(string $bucket, string $key, ?string $tenantId = null): string
    {
        $key = ltrim($key, '/');
        $tenant = $tenantId ? trim($tenantId, '/').'/' : '';
        return "{$bucket}/{$tenant}{$key}";
    }

    /** Store an uploaded file. Returns the storage path (relative to its disk). */
    public function put(string $bucket, UploadedFile $file, ?string $tenantId = null, ?string $filename = null): string
    {
        $name = $filename ?: (Str::uuid().'.'.$file->getClientOriginalExtension());
        $path = self::path($bucket, $name, $tenantId);
        self::disk($bucket)->putFileAs(dirname($path), $file, basename($path));
        return $path;
    }

    /** Public buckets -> host-relative URL. Private -> short-lived signed API URL. */
    public function url(string $bucket, string $path, int $ttlMinutes = 10): string
    {
        if (self::isPublic($bucket)) {
            // Host-relative on purpose: APP_URL may not match the host the app is
            // actually served from (apex vs. subdomain), which would 404 the asset.
            return '/storage/'.ltrim($path, '/');
        }
        return URL::temporarySignedRoute(
            'files.download',
            now()->addMinutes($ttlMinutes),
            ['bucket' => $bucket, 'path' => $path]
        );
    }


    public function delete(string $bucket, string $path): bool
    {
        return self::disk($bucket)->delete($path);
    }

    public function exists(string $bucket, string $path): bool
    {
        return self::disk($bucket)->exists($path);
    }
}
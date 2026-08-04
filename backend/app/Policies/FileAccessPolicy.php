<?php

namespace App\Policies;

use App\Models\User;
use App\Services\StorageService;

/**
 * Authorizes reads/writes against buckets.
 *
 *  Rules:
 *   - Superadmin: full access.
 *   - tenant-backups: tenant owner or tenant_admin only.
 *   - Every other bucket (public or private): the object path MUST live under the
 *     user's tenant_id folder. Public buckets stay world-readable, but writes and
 *     deletes are still tenant-scoped so one tenant cannot overwrite another's
 *     branding or product images.
 */
class FileAccessPolicy
{
    /**
     * Stored paths are "{bucket}/{tenant}/{key}" (see StorageService::path()).
     * Accepts paths with or without the leading bucket segment.
     */
    private function ownsPath(User $user, string $bucket, string $path): bool
    {
        $tenantId = $user->tenant_id ?? null;
        if (!$tenantId) return false;

        $segments = array_values(array_filter(explode('/', ltrim($path, '/')), fn ($s) => $s !== ''));
        if (($segments[0] ?? null) === $bucket) {
            array_shift($segments);
        }
        return ($segments[0] ?? null) === (string) $tenantId;
    }

    public function view(User $user, string $bucket, string $path): bool
    {
        if ($user->hasRole('superadmin')) return true;
        if (!StorageService::isKnown($bucket)) return false;
        if (StorageService::isPublic($bucket)) return true;

        if (!$this->ownsPath($user, $bucket, $path)) return false;

        if ($bucket === 'tenant-backups') {
            return $user->hasRole('tenant_admin', 'tenant_owner');
        }
        return true;
    }

    public function upload(User $user, string $bucket): bool
    {
        if ($user->hasRole('superadmin')) return true;
        if (!StorageService::isKnown($bucket)) return false;
        if ($bucket === 'tenant-backups') {
            return $user->hasRole('tenant_admin', 'tenant_owner');
        }
        // Branding restricted to tenant admins
        if ($bucket === 'branding') {
            return $user->hasRole('tenant_admin', 'tenant_owner');
        }
        return $user->tenant_id !== null;
    }

    public function delete(User $user, string $bucket, string $path): bool
    {
        if ($user->hasRole('superadmin')) return true;
        if (!StorageService::isKnown($bucket)) return false;

        // Tenant ownership is required for every bucket, public ones included.
        if (!$this->ownsPath($user, $bucket, $path)) return false;

        if ($bucket === 'tenant-backups') {
            return $user->hasRole('tenant_admin', 'tenant_owner');
        }
        if (StorageService::isPublic($bucket)) {
            return $user->hasRole('tenant_admin', 'tenant_owner');
        }
        return true;
    }
}
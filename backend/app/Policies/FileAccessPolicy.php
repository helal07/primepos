<?php

namespace App\Policies;

use App\Models\User;
use App\Services\StorageService;

/**
 * Authorizes reads/writes against private buckets.
 *
 *  Rules:
 *   - Superadmin: full access.
 *   - tenant-backups: tenant owner or tenant_admin only.
 *   - Any other private bucket: file path MUST start with the user's tenant_id segment.
 */
class FileAccessPolicy
{
    public function view(User $user, string $bucket, string $path): bool
    {
        if ($user->hasRole('superadmin')) return true;
        if (!StorageService::isKnown($bucket)) return false;
        if (StorageService::isPublic($bucket)) return true;

        $tenantId = $user->tenant_id ?? null;
        if (!$tenantId) return false;

        // path layout = {bucket-not-included}/{tenant}/{rest}
        $segments = explode('/', ltrim($path, '/'));
        $pathTenant = $segments[0] ?? null;
        if ($pathTenant !== (string)$tenantId) return false;

        if ($bucket === 'tenant-backups') {
            return $user->hasAnyRole(['tenant_admin', 'tenant_owner']);
        }
        return true;
    }

    public function upload(User $user, string $bucket): bool
    {
        if ($user->hasRole('superadmin')) return true;
        if (!StorageService::isKnown($bucket)) return false;
        if ($bucket === 'tenant-backups') {
            return $user->hasAnyRole(['tenant_admin', 'tenant_owner']);
        }
        // Branding restricted to tenant admins
        if ($bucket === 'branding') {
            return $user->hasAnyRole(['tenant_admin', 'tenant_owner']);
        }
        return $user->tenant_id !== null;
    }

    public function delete(User $user, string $bucket, string $path): bool
    {
        // Same scope as view + must be admin/owner for shared buckets
        if (!$this->view($user, $bucket, $path)) return false;
        if (StorageService::isPublic($bucket)) {
            return $user->hasAnyRole(['superadmin', 'tenant_admin', 'tenant_owner']);
        }
        return true;
    }
}
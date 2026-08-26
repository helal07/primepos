<?php

return [
    'default' => env('FILESYSTEM_DISK', 'local'),
    'disks' => [
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
        ],
        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        // ===== Migrated Supabase buckets =====
        // Uploads live in storage/app/uploads/* — a directory that is NOT part of
        // the shipped image, so it can be mounted as a persistent volume in
        // Coolify/Docker. Public URL shape stays /storage/<bucket>/<path>.
        'public_uploads' => [
            'driver'     => 'local',
            'root'       => storage_path('app/uploads/public'),
            'url'        => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw'      => false,
        ],
        // Private — served only via signed /api/files/{bucket}/{path} (FileAccessPolicy)
        'private_uploads' => [
            'driver'     => 'local',
            'root'       => storage_path('app/uploads/private'),
            'visibility' => 'private',
            'throw'      => false,
        ],

        // Legacy roots (pre-volume). Read-only fallback so files uploaded before
        // the move keep working until app:migrate-uploads has copied them over.
        'legacy_public_uploads' => [
            'driver'     => 'local',
            'root'       => storage_path('app/public'),
            'url'        => env('APP_URL').'/storage-legacy',
            'visibility' => 'public',
            'throw'      => false,
        ],
        'legacy_private_uploads' => [
            'driver'     => 'local',
            'root'       => storage_path('app/private/uploads'),
            'visibility' => 'private',
            'throw'      => false,
        ],
    ],
    'links' => [public_path('storage') => storage_path('app/uploads/public')],
];

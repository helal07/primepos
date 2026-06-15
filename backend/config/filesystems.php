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
        // Public — served via /storage/<bucket>/<path> (symlink: public/storage -> storage/app/public)
        'public_uploads' => [
            'driver'     => 'local',
            'root'       => storage_path('app/public'),
            'url'        => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw'      => false,
        ],
        // Private — served only via signed /api/files/{bucket}/{path} (FileAccessPolicy)
        'private_uploads' => [
            'driver'     => 'local',
            'root'       => storage_path('app/private/uploads'),
            'visibility' => 'private',
            'throw'      => false,
        ],
    ],
    'links' => [public_path('storage') => storage_path('app/public')],
];
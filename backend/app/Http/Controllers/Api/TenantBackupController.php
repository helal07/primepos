<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TenantBackup;
use App\Services\TenantBackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class TenantBackupController extends Controller
{
    public function __construct(protected TenantBackupService $svc) {}

    public function index(Request $request): JsonResponse
    {
        $auth = $request->user();
        abort_unless($auth->isSuperadmin() || $auth->hasRole('tenant_admin'), 403);

        $q = TenantBackup::query()->withoutGlobalScopes()->orderByDesc('created_at');
        if (! $auth->isSuperadmin()) $q->where('tenant_id', $auth->tenant_id);

        $items = $q->limit(100)->get()->map(fn ($b) => [
            'id'         => $b->id,
            'file_name'  => $b->file_name,
            'size_bytes' => $b->size_bytes,
            'sha256'     => $b->sha256,
            'status'     => $b->status,
            'notes'      => $b->notes,
            'created_at' => $b->created_at?->toIso8601String(),
            'download_url' => $this->svc->signedDownloadUrl($b),
        ]);

        return response()->json(['items' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $auth = $request->user();
        abort_unless($auth->isSuperadmin() || $auth->hasRole('tenant_admin'), 403);

        $tenantId = $auth->isSuperadmin() && $request->filled('tenant_id')
            ? (string) $request->string('tenant_id')
            : $auth->tenant_id;

        $backup = $this->svc->export($tenantId, $auth->id, $request->input('notes'));
        return response()->json(['backup' => $backup], 201);
    }

    public function restore(Request $request, string $backupId): JsonResponse
    {
        $auth = $request->user();
        abort_unless($auth->isSuperadmin() || $auth->hasRole('tenant_admin'), 403);

        $backup = TenantBackup::query()->withoutGlobalScopes()->findOrFail($backupId);
        if (! $auth->isSuperadmin() && $backup->tenant_id !== $auth->tenant_id) abort(403);

        $abs = storage_path('app/private/' . $backup->file_path);
        $this->svc->restore($backup->tenant_id, $abs, $auth->id);

        return response()->json(['ok' => true, 'restored_from' => $backup->id]);
    }

    public function upload(Request $request): JsonResponse
    {
        $auth = $request->user();
        abort_unless($auth->isSuperadmin() || $auth->hasRole('tenant_admin'), 403);

        $request->validate([
            'file'      => ['required', 'file', 'mimetypes:application/gzip,application/x-gzip,application/octet-stream'],
            'tenant_id' => ['nullable', 'uuid'],
        ]);

        $tenantId = $auth->isSuperadmin() && $request->filled('tenant_id')
            ? (string) $request->string('tenant_id')
            : $auth->tenant_id;

        $stamp = date('Ymd_His');
        $filename = "uploaded_{$stamp}.sql.gz";
        $path = $this->svc->exportPath($tenantId, $filename);
        $request->file('file')->move(dirname($path), basename($path));

        $size = filesize($path) ?: 0;
        $backup = TenantBackup::query()->withoutGlobalScopes()->create([
            'id'         => (string) \Illuminate\Support\Str::uuid(),
            'tenant_id'  => $tenantId,
            'file_path'  => "backups/{$tenantId}/{$filename}",
            'file_name'  => $filename,
            'size_bytes' => $size,
            'sha256'     => hash_file('sha256', $path) ?: null,
            'status'     => 'uploaded',
            'created_by' => $auth->id,
            'notes'      => 'manual upload',
        ]);

        return response()->json(['backup' => $backup], 201);
    }

    /** Signed-URL download endpoint. */
    public function download(string $backupId): BinaryFileResponse
    {
        $backup = TenantBackup::query()->withoutGlobalScopes()->findOrFail($backupId);
        $abs = storage_path('app/private/' . $backup->file_path);
        abort_unless(is_file($abs), 404, 'Backup file missing.');

        return response()->download($abs, $backup->file_name, [
            'Content-Type' => 'application/gzip',
        ]);
    }
}
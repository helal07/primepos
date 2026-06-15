<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Policies\FileAccessPolicy;
use App\Services\StorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FileController extends Controller
{
    public function __construct(
        private readonly StorageService $storage,
        private readonly FileAccessPolicy $policy,
    ) {}

    /**
     * POST /api/files/upload
     * body: bucket (string), file (binary), filename? (string)
     */
    public function upload(Request $request)
    {
        $data = $request->validate([
            'bucket'   => 'required|string',
            'file'     => 'required|file|max:51200',  // 50MB
            'filename' => 'nullable|string|max:255',
        ]);

        $bucket = $data['bucket'];
        $user   = $request->user();

        abort_unless(StorageService::isKnown($bucket), 404, 'Unknown bucket');
        abort_unless($this->policy->upload($user, $bucket), 403);

        $path = $this->storage->put(
            $bucket,
            $request->file('file'),
            $user->tenant_id,
            $data['filename'] ?? null,
        );

        return response()->json([
            'bucket' => $bucket,
            'path'   => $path,
            'url'    => $this->storage->url($bucket, $path),
        ], 201);
    }

    /**
     * GET /api/files/{bucket}/{path}  (signed URL OR authenticated request)
     * Streams the file when the user is allowed.
     */
    public function download(Request $request, string $bucket, string $path)
    {
        abort_unless(StorageService::isKnown($bucket), 404);

        // Path is encoded as a single param; restore slashes
        $path = trim($path, '/');

        // Public bucket files: redirect to the static URL (cacheable)
        if (StorageService::isPublic($bucket) && !$request->hasValidSignature()) {
            return redirect()->away(StorageService::disk($bucket)->url($path));
        }

        // Private — either a valid signed URL (anyone holding the link) or auth + policy
        if (!$request->hasValidSignature()) {
            $user = Auth::user();
            abort_unless($user, 401);
            abort_unless($this->policy->view($user, $bucket, $path), 403);
        }

        $disk = StorageService::disk($bucket);
        abort_unless($disk->exists($path), 404);

        return $disk->response($path);
    }

    /**
     * DELETE /api/files/{bucket}/{path}
     */
    public function destroy(Request $request, string $bucket, string $path)
    {
        $user = $request->user();
        $path = trim($path, '/');
        abort_unless(StorageService::isKnown($bucket), 404);
        abort_unless($this->policy->delete($user, $bucket, $path), 403);

        $this->storage->delete($bucket, $path);
        return response()->json(['ok' => true]);
    }
}
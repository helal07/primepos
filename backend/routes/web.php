<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\SpaController;

Route::get('/sitemap.xml', [SitemapController::class, 'sitemap']);
Route::get('/robots.txt',  [SitemapController::class, 'robots']);

/**
 * Legacy public upload fallback. nginx serves public/storage/... straight from
 * disk; when a file predates the uploads/ volume move it is missing there, so
 * the request falls through to Laravel and we stream it from the old root.
 */
Route::get('/storage/{path}', function (string $path) {
    $path = ltrim($path, '/');
    abort_if(str_contains($path, '..'), 404);

    foreach (['public_uploads', 'legacy_public_uploads'] as $diskName) {
        $disk = Storage::disk($diskName);
        if ($disk->exists($path)) {
            return $disk->response($path);
        }
    }
    abort(404);
})->where('path', '.*');

Route::get('/', [SpaController::class, 'index']);

Route::get('/{path}', [SpaController::class, 'fallback'])
    ->where('path', '^(?!api|sanctum|up|storage|sitemap\.xml|robots\.txt).*$');

<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SitemapController;

Route::get('/', function () {
    return response()->json(['app' => 'Prime POS API', 'status' => 'ok']);
});

Route::get('/sitemap.xml', [SitemapController::class, 'sitemap']);
Route::get('/robots.txt',  [SitemapController::class, 'robots']);
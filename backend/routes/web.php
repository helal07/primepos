<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\SpaController;

Route::get('/sitemap.xml', [SitemapController::class, 'sitemap']);
Route::get('/robots.txt',  [SitemapController::class, 'robots']);

Route::get('/', [SpaController::class, 'index']);

Route::get('/{path}', [SpaController::class, 'fallback'])
    ->where('path', '^(?!api|sanctum|up|sitemap\.xml|robots\.txt).*$');
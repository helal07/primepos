<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['status' => 'ok', 'time' => now()->toIso8601String()]);

Route::middleware('auth:sanctum')->get('/user', fn (Request $r) => $r->user());
<?php

namespace App\Models\Concerns;

use App\Models\Scopes\TenantScope;
use Illuminate\Support\Facades\Auth;

trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope());

        static::creating(function ($model) {
            if (! $model->tenant_id && Auth::check()) {
                $tid = Auth::user()->tenant_id;
                if ($tid) {
                    $model->tenant_id = $tid;
                }
            }
        });
    }
}
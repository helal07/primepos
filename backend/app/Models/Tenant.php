<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $guarded = [];

    protected $casts = [
        'enabled_modules' => 'array',
        'branding' => 'array',
        'domain_verified_at' => 'datetime',
        'subscription_start' => 'date',
        'subscription_end' => 'date',
        'trial_ends_at' => 'date',
    ];

    public function package(): BelongsTo
    {
        return $this->belongsTo(SaasPackage::class, 'package_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function isActive(): bool
    {
        if (in_array($this->status, ['suspended', 'cancelled'], true)) {
            return false;
        }
        if ($this->status === 'trial' && $this->trial_ends_at && $this->trial_ends_at->isPast()) {
            return false;
        }
        if ($this->subscription_end && $this->subscription_end->isPast() && $this->status !== 'trial') {
            return false;
        }
        return true;
    }

    /**
     * Merge enabled_modules from package + tenant overrides.
     * @return array<int, string>
     */
    public function effectiveModules(): array
    {
        $pkg = $this->package?->enabled_modules ?? [];
        $own = $this->enabled_modules ?? [];
        return array_values(array_unique(array_merge((array) $pkg, (array) $own)));
    }

    public function hasModule(string $module): bool
    {
        return in_array($module, $this->effectiveModules(), true);
    }
}
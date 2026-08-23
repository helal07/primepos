<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'products';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = [
        'gallery_urls' => 'array',
        'has_warranty' => 'boolean',
        'is_active' => 'boolean',
        'serial_tracking' => 'boolean',
        'show_on_website' => 'boolean',
    ];

    public function category(): BelongsTo { return $this->belongsTo(Category::class); }
    public function brand(): BelongsTo    { return $this->belongsTo(Brand::class); }
    public function unit(): BelongsTo     { return $this->belongsTo(Unit::class); }
    public function variations(): HasMany { return $this->hasMany(ProductVariation::class); }
}

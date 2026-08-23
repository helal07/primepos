<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class LandingReview extends Model
{
    use HasUuids;

    protected $table = 'landing_reviews';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
    protected $casts = [
        'is_active' => 'boolean',
    ];
}

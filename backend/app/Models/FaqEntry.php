<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class FaqEntry extends Model
{
    use HasUuids;
    protected $table = 'faq_entries';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
    protected $casts = [
        'is_active' => 'boolean',
    ];
}

<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ExpenseCategory extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'expense_categories';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = [
        'is_active' => 'boolean',
    ];
    public $timestamps = false;

}

<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ExpensePayment extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'expense_payments';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = [
        'paid_on' => 'datetime',
    ];
    public $timestamps = false;

}

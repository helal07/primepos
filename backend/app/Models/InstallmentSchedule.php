<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class InstallmentSchedule extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'installment_schedules';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = [
        'due_date' => 'date',
    ];
}

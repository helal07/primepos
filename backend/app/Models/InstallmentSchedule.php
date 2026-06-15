<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    public function installmentSale(): BelongsTo { return $this->belongsTo(InstallmentSale::class, 'installment_sale_id'); }
}

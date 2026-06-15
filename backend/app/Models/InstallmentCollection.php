<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InstallmentCollection extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'installment_collections';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    public function schedule(): BelongsTo         { return $this->belongsTo(InstallmentSchedule::class, 'schedule_id'); }
    public function installmentSale(): BelongsTo  { return $this->belongsTo(InstallmentSale::class, 'installment_sale_id'); }
}

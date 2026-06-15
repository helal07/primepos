<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payroll extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'payroll';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = ['paid_date' => 'date'];

    public function employee(): BelongsTo { return $this->belongsTo(Employee::class, 'employee_id'); }
}
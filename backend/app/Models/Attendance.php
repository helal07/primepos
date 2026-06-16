<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\BroadcastsTenantChanges;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    use HasUuids, BelongsToTenant, BroadcastsTenantChanges;

    public static function broadcastResource(): string { return 'attendance'; }

    protected $table = 'attendance';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
    public $timestamps = false;

    protected $casts = ['date' => 'date'];

    public function employee(): BelongsTo { return $this->belongsTo(Employee::class, 'employee_id'); }
}
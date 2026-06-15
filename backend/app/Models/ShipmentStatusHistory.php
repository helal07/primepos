<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ShipmentStatusHistory extends Model
{
    use HasUuids, BelongsToTenant;
    protected $table = 'shipment_status_history';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
}

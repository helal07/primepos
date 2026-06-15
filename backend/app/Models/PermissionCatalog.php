<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PermissionCatalog extends Model
{
    use HasUuids;

    protected $table = 'permission_catalog';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
}
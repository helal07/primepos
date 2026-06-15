<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SitemapEntry extends Model
{
    use HasUuids;

    protected $table = 'sitemap_entries';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
    protected $casts = ['last_modified' => 'datetime'];
}
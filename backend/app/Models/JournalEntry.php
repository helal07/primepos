<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JournalEntry extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'journal_entries';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = ['entry_date' => 'date'];

    public function lines(): HasMany { return $this->hasMany(JournalEntryLine::class, 'journal_entry_id'); }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class TrialReminderLog extends Model
{
    use HasUuids;

    protected $table = 'trial_reminders_log';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = [
        'sent_at' => 'datetime',
    ];
}
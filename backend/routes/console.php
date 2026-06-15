<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled tasks (runs via supervisord "cron" loop calling schedule:run).
|--------------------------------------------------------------------------
*/
Schedule::command('tenants:auto-suspend')->dailyAt('00:30');
Schedule::command('tenants:send-trial-reminders')->dailyAt('09:00');
Schedule::command('db:backup')->dailyAt('02:00');
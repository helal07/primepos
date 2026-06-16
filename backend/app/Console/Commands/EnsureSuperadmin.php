<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class EnsureSuperadmin extends Command
{
    protected $signature = 'app:ensure-superadmin
        {--email= : Superadmin email (defaults to SUPERADMIN_EMAIL env)}
        {--password= : Superadmin password (defaults to SUPERADMIN_PASSWORD env)}
        {--name=Super Admin : Display name}
        {--reset-password : Reset password if user already exists}';

    protected $description = 'Create or update the platform superadmin user.';

    public function handle(): int
    {
        $email = $this->option('email') ?: env('SUPERADMIN_EMAIL', 'admin@primepos.xyz');
        $password = $this->option('password') ?: env('SUPERADMIN_PASSWORD', 'ChangeMe@12345');
        $name = $this->option('name') ?: 'Super Admin';

        if (! $email || ! $password) {
            $this->error('Email and password are required.');
            return self::FAILURE;
        }

        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            $user = new User();
            $user->id = (string) Str::uuid();
            $user->name = $name;
            $user->email = $email;
            // User model casts 'password' => 'hashed' — assign plain text, cast hashes it.
            $user->password = $password;
            $user->is_superadmin = true;
            $user->status = 'active';
            $user->tenant_id = null;
            $user->save();
            $this->info("Superadmin created: {$email}");
            return self::SUCCESS;
        }

        $changed = false;
        if (! $user->is_superadmin) { $user->is_superadmin = true; $changed = true; }
        if ($user->status !== 'active') { $user->status = 'active'; $changed = true; }
        if ($this->option('reset-password')) { $user->password = $password; $changed = true; }

        if ($changed) {
            $user->save();
            $this->info("Superadmin updated: {$email}");
        } else {
            $this->info("Superadmin already exists: {$email}");
        }
        return self::SUCCESS;
    }
}
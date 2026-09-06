<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class SuperadminSeeder extends Seeder
{
    /**
     * Bootstraps the platform superadmin.
     *
     * Credentials come exclusively from the environment — no defaults are
     * baked into the repository, so a leaked source tree never reveals a
     * working superadmin login. If the env vars are absent the seeder is a
     * no-op instead of creating a predictable account.
     */
    public function run(): void
    {
        $email = trim((string) env('SUPERADMIN_EMAIL', ''));
        $password = (string) env('SUPERADMIN_PASSWORD', '');
        $name = (string) env('SUPERADMIN_NAME', 'Super Admin');

        if ($email === '' || $password === '') {
            $this->command?->warn('Superadmin seed skipped: set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD.');
            return;
        }

        if (strlen($password) < 10) {
            $this->command?->warn('Superadmin seed skipped: SUPERADMIN_PASSWORD must be at least 10 characters.');
            return;
        }

        $email = strtolower($email);
        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            $user = new User();
            $user->id = (string) Str::uuid();
        }

        $user->name = $user->name ?: $name;
        $user->email = $email;
        // 'password' is cast to 'hashed' on the model — assign plain text.
        $user->password = $password;
        $user->is_superadmin = true;
        $user->status = 'active';
        $user->tenant_id = null;
        $user->email_verified_at = $user->email_verified_at ?: now();
        $user->save();

        $this->command?->info("Superadmin ready: {$email}");
    }
}

<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class SuperadminSeeder extends Seeder
{
    public function run(): void
    {
        $email = (string) env('SUPERADMIN_EMAIL', 'email2itsolution@gmail.com');
        $password = (string) env('SUPERADMIN_PASSWORD', 'IT121212@');
        $name = (string) env('SUPERADMIN_NAME', 'Super Admin');

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

<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Database\Seeders\SuperadminSeeder;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_returns_user_payload(): void
    {
        $user = User::create([
            'id'       => (string) \Str::uuid(),
            'email'    => 'owner@example.test',
            'name'     => 'Owner',
            'password' => Hash::make('secret-pass'),
        ]);

        $this->postJson('/api/auth/token', [
                'identifier'  => 'owner@example.test',
                'password'    => 'secret-pass',
                'device_name' => 'phpunit',
            ])
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'email']]);

        $this->actingAs($user)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'owner@example.test');
    }

    public function test_login_rejects_bad_password(): void
    {
        User::create([
            'id'       => (string) \Str::uuid(),
            'email'    => 'owner2@example.test',
            'name'     => 'Owner',
            'password' => Hash::make('secret-pass'),
        ]);

        $this->postJson('/api/auth/token', [
                'identifier'  => 'owner2@example.test',
                'password'    => 'wrong',
                'device_name' => 'phpunit',
            ])
            ->assertStatus(422);
    }

    public function test_seeded_superadmin_can_log_in_with_bootstrap_credentials(): void
    {
        putenv('SUPERADMIN_EMAIL=bootstrap-super@example.test');
        putenv('SUPERADMIN_PASSWORD=Bootstrap#Pass123');
        $this->seed(SuperadminSeeder::class);

        $this->postJson('/api/auth/token', [
                'identifier'  => 'bootstrap-super@example.test',
                'password'    => 'Bootstrap#Pass123',
                'device_name' => 'phpunit',
            ])
            ->assertOk()
            ->assertJsonPath('user.email', 'bootstrap-super@example.test')
            ->assertJsonPath('user.is_superadmin', true);
    }

    public function test_login_normalizes_email_case_and_whitespace(): void
    {
        User::create([
            'id'       => (string) \Str::uuid(),
            'email'    => 'owner@example.test',
            'name'     => 'Owner',
            'password' => 'secret-pass',
        ]);

        $this->postJson('/api/auth/token', [
                'identifier'  => ' OWNER@EXAMPLE.TEST ',
                'password'    => 'secret-pass',
                'device_name' => 'phpunit',
            ])
            ->assertOk()
            ->assertJsonPath('user.email', 'owner@example.test');
    }

    public function test_change_password_requires_current(): void
    {
        $user = User::create([
            'id'       => (string) \Str::uuid(),
            'email'    => 'owner3@example.test',
            'name'     => 'Owner',
            'password' => Hash::make('secret-pass'),
        ]);

        $this->actingAs($user)
            ->postJson('/api/auth/password', [
                'current_password' => 'wrong',
                'new_password'     => 'new-secret-pass',
            ])
            ->assertStatus(422);
    }
}
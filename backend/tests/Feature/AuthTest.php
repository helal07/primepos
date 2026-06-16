<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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

        $this->postJson('/api/auth/login', [
                'identifier' => 'owner@example.test',
                'password'   => 'secret-pass',
            ])
            ->assertOk()
            ->assertJsonStructure(['user' => ['id', 'email']]);

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

        $this->postJson('/api/auth/login', [
                'identifier' => 'owner2@example.test',
                'password'   => 'wrong',
            ])
            ->assertStatus(422);
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
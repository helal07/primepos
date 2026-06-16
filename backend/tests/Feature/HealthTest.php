<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_endpoint_returns_ok(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJson(['status' => 'ok'])
            ->assertJsonStructure(['status', 'time']);
    }

    public function test_protected_route_requires_auth(): void
    {
        $this->getJson('/api/auth/me')->assertStatus(401);
        $this->getJson('/api/dashboard/stats')->assertStatus(401);
        $this->getJson('/api/rest/products')->assertStatus(401);
    }

    public function test_unknown_rest_resource_is_rejected(): void
    {
        $this->getJson('/api/rest/__not_a_real_table__')->assertStatus(401);
    }
}
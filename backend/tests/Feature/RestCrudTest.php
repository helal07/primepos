<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Round-trip CRUD tests against /api/rest/{resource}.
 *
 * We log in as a superadmin user that is also pinned to a tenant. That gives us:
 *   - bypass for the Postgres-only has_perm() helper (RestController short-circuits)
 *   - bypass for the EnsureTenantActive middleware
 *   - automatic tenant_id stamping by the BelongsToTenant trait on create
 *   - TenantScope returns unfiltered (superadmin), so reads see what we wrote.
 */
class RestCrudTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'id'     => (string) Str::uuid(),
            'name'   => 'Test Tenant',
            'slug'   => 'test-tenant-' . Str::random(6),
            'status' => 'active',
        ]);

        $this->user = User::create([
            'id'            => (string) Str::uuid(),
            'name'          => 'Tester',
            'email'         => 'tester@example.test',
            'password'      => Hash::make('secret-pass'),
            'tenant_id'     => $this->tenant->id,
            'is_superadmin' => true,
            'status'        => 'active',
        ]);
    }

    private function api()
    {
        return $this->actingAs($this->user, 'sanctum');
    }

    public function test_rest_rejects_unknown_resource(): void
    {
        $this->api()->getJson('/api/rest/not_a_resource')->assertStatus(404);
    }

    public function test_brand_crud_round_trip(): void
    {
        // CREATE
        $created = $this->api()
            ->postJson('/api/rest/brands', ['name' => 'Acme'])
            ->assertStatus(201)
            ->assertJsonPath('name', 'Acme')
            ->assertJsonPath('tenant_id', $this->tenant->id)
            ->json();

        $id = $created['id'];

        // INDEX (paginated envelope)
        $this->api()
            ->getJson('/api/rest/brands')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['page', 'per_page', 'total', 'last_page']])
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $id);

        // SHOW
        $this->api()
            ->getJson("/api/rest/brands/{$id}")
            ->assertOk()
            ->assertJsonPath('id', $id);

        // PATCH
        $this->api()
            ->patchJson("/api/rest/brands/{$id}", ['name' => 'Acme Renamed'])
            ->assertOk()
            ->assertJsonPath('name', 'Acme Renamed');

        // FILTER eq
        $this->api()
            ->getJson('/api/rest/brands?filter[is_active]=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        // DELETE
        $this->api()->deleteJson("/api/rest/brands/{$id}")->assertOk();
        $this->api()->getJson("/api/rest/brands/{$id}")->assertStatus(404);
    }

    public function test_category_create_stamps_tenant(): void
    {
        $resp = $this->api()
            ->postJson('/api/rest/categories', ['name' => 'Phones'])
            ->assertStatus(201)
            ->assertJsonPath('name', 'Phones')
            ->assertJsonPath('tenant_id', $this->tenant->id);

        $this->assertDatabaseHas('categories', [
            'id'        => $resp->json('id'),
            'tenant_id' => $this->tenant->id,
            'name'      => 'Phones',
        ]);
    }

    public function test_customer_crud_and_filter(): void
    {
        $a = $this->api()->postJson('/api/rest/customers', [
            'name' => 'Alice', 'phone' => '01700000001',
        ])->assertStatus(201)->json();

        $this->api()->postJson('/api/rest/customers', [
            'name' => 'Bob', 'phone' => '01700000002',
        ])->assertStatus(201);

        $this->api()
            ->getJson('/api/rest/customers')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        $this->api()
            ->getJson('/api/rest/customers?filter[phone]=01700000001')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $a['id']);

        // Sort by name asc (default), confirm order
        $rows = $this->api()->getJson('/api/rest/customers?sort=name')
            ->assertOk()->json('data');
        $this->assertSame('Alice', $rows[0]['name']);
        $this->assertSame('Bob',   $rows[1]['name']);
    }

    public function test_index_rejects_unknown_filter_and_sort(): void
    {
        $this->api()->postJson('/api/rest/brands', ['name' => 'Keep'])->assertStatus(201);

        // Unknown filter column is silently dropped → total unchanged
        $this->api()
            ->getJson('/api/rest/brands?filter[evil_col]=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        // Unknown sort column is silently dropped (no SQL error)
        $this->api()
            ->getJson('/api/rest/brands?sort=evil_col')
            ->assertOk();
    }
}
<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\InstallmentCustomer;
use App\Models\InstallmentSale;
use App\Models\Purchase;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Sale;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Per-module CRUD tests exercising the NON-superadmin permission path
 * through RestController::authorizePerm().
 *
 * In sqlite the controller falls back to User::canModule(), which reads
 * role_permissions rows linked through user_roles. Each test below
 * grants a precise subset of (module, action) capabilities and asserts
 * both allowed and forbidden routes.
 */
class RestPermsTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;
    private Role $role;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'id'     => (string) Str::uuid(),
            'name'   => 'Perm Tenant',
            'slug'   => 'perm-' . Str::random(6),
            'status' => 'active',
        ]);

        $this->user = User::create([
            'id'            => (string) Str::uuid(),
            'name'          => 'Cashier',
            'email'         => 'cashier@example.test',
            'password'      => Hash::make('secret-pass'),
            'tenant_id'     => $this->tenant->id,
            'is_superadmin' => false,
            'status'        => 'active',
        ]);

        $this->role = Role::create([
            'id'        => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name'      => 'cashier',
        ]);

        UserRole::create([
            'id'        => (string) Str::uuid(),
            'user_id'   => $this->user->id,
            'role_id'   => $this->role->id,
            'tenant_id' => $this->tenant->id,
        ]);
    }

    private function grant(string $module, array $actions): void
    {
        RolePermission::create([
            'id'         => (string) Str::uuid(),
            'role_id'    => $this->role->id,
            'tenant_id'  => $this->tenant->id,
            'module'     => $module,
            'can_view'   => in_array('view', $actions, true),
            'can_create' => in_array('create', $actions, true),
            'can_edit'   => in_array('edit', $actions, true),
            'can_delete' => in_array('delete', $actions, true),
        ]);
    }

    private function api()
    {
        return $this->actingAs($this->user, 'sanctum');
    }

    // ===== Sales ============================================================

    public function test_sales_without_grant_is_forbidden(): void
    {
        $this->api()->getJson('/api/rest/sales')->assertStatus(403);
        $this->api()->postJson('/api/rest/sales', [
            'invoice_number' => 'INV-1',
        ])->assertStatus(403);
    }

    public function test_sales_view_create_grant_allows_only_those_actions(): void
    {
        $this->grant('sales', ['view', 'create']);

        // Pre-create a customer (inventory permission not needed — Customer is
        // written directly via Eloquent, bypassing the REST permission check).
        $customer = Customer::create([
            'id'        => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name'      => 'Walk-in',
        ]);

        $created = $this->api()->postJson('/api/rest/sales', [
            'invoice_number' => 'INV-100',
            'customer_id'    => $customer->id,
            'total_amount'   => 250,
            'payment_status' => 'paid',
        ])->assertStatus(201)
            ->assertJsonPath('invoice_number', 'INV-100')
            ->assertJsonPath('tenant_id', $this->tenant->id)
            ->json();

        $this->api()
            ->getJson('/api/rest/sales')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $created['id']);

        // No edit grant
        $this->api()
            ->patchJson("/api/rest/sales/{$created['id']}", ['notes' => 'x'])
            ->assertStatus(403);

        // No delete grant
        $this->api()
            ->deleteJson("/api/rest/sales/{$created['id']}")
            ->assertStatus(403);
    }

    // ===== Purchases ========================================================

    public function test_purchases_create_edit_grant_allows_patch_but_not_delete(): void
    {
        $this->grant('purchases', ['view', 'create', 'edit']);

        $created = $this->api()->postJson('/api/rest/purchases', [
            'reference_number' => 'PO-1',
            'purchase_date'    => '2026-01-01',
            'total_amount'     => 1000,
        ])->assertStatus(201)
            ->assertJsonPath('reference_number', 'PO-1')
            ->assertJsonPath('tenant_id', $this->tenant->id)
            ->json();

        $this->api()
            ->patchJson("/api/rest/purchases/{$created['id']}", [
                'reference_number' => 'PO-1A',
            ])
            ->assertOk()
            ->assertJsonPath('reference_number', 'PO-1A');

        $this->api()
            ->deleteJson("/api/rest/purchases/{$created['id']}")
            ->assertStatus(403);

        // Sales module untouched → still locked even though user can purchase.
        $this->api()->getJson('/api/rest/sales')->assertStatus(403);
    }

    // ===== Installments =====================================================

    public function test_installments_module_isolates_per_resource_actions(): void
    {
        $this->grant('installments', ['view', 'create', 'edit', 'delete']);

        // installment_customers create
        $cust = $this->api()->postJson('/api/rest/installment_customers', [
            'name'  => 'Karim',
            'phone' => '01700000099',
        ])->assertStatus(201)
            ->assertJsonPath('tenant_id', $this->tenant->id)
            ->json();

        // installment_sales create
        $sale = $this->api()->postJson('/api/rest/installment_sales', [
            'customer_id'     => $cust['id'],
            'invoice_number'  => 'INST-1',
            'start_date'      => '2026-01-15',
            'status'          => 'active',
        ])->assertStatus(201)
            ->assertJsonPath('invoice_number', 'INST-1')
            ->json();

        // list + filter by customer_id
        $this->api()
            ->getJson('/api/rest/installment_sales?filter[customer_id]=' . $cust['id'])
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $sale['id']);

        // edit + delete both allowed
        $this->api()
            ->patchJson("/api/rest/installment_sales/{$sale['id']}", ['status' => 'closed'])
            ->assertOk()
            ->assertJsonPath('status', 'closed');

        $this->api()
            ->deleteJson("/api/rest/installment_sales/{$sale['id']}")
            ->assertOk();

        $this->api()
            ->getJson("/api/rest/installment_sales/{$sale['id']}")
            ->assertStatus(404);

        // Cross-module: no sales grant
        $this->api()->getJson('/api/rest/sales')->assertStatus(403);
    }

    public function test_view_only_grant_blocks_writes(): void
    {
        $this->grant('installments', ['view']);

        $this->api()->getJson('/api/rest/installment_customers')->assertOk();

        $this->api()->postJson('/api/rest/installment_customers', [
            'name' => 'Nope', 'phone' => '0170000000',
        ])->assertStatus(403);
    }

    // ===== Tenant scoping under non-superadmin =============================

    public function test_non_super_user_only_sees_own_tenant_rows(): void
    {
        $this->grant('sales', ['view', 'create']);

        // Row in another tenant — must NOT leak through.
        $other = Tenant::create([
            'id'     => (string) Str::uuid(),
            'name'   => 'Other',
            'slug'   => 'other-' . Str::random(6),
            'status' => 'active',
        ]);
        Sale::withoutEvents(function () use ($other) {
            Sale::create([
                'id'             => (string) Str::uuid(),
                'tenant_id'      => $other->id,
                'invoice_number' => 'OTHER-1',
                'total_amount'   => 1,
            ]);
        });

        $this->api()->postJson('/api/rest/sales', [
            'invoice_number' => 'MINE-1',
            'total_amount'   => 1,
        ])->assertStatus(201);

        $rows = $this->api()->getJson('/api/rest/sales')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->json('data');

        $this->assertSame('MINE-1', $rows[0]['invoice_number']);
    }
}

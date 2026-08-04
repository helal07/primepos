<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserRole;
use App\Policies\FileAccessPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class FileAccessPolicyTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $tenantId, ?string $roleName = null): User
    {
        $user = User::create([
            'id'            => (string) Str::uuid(),
            'name'          => 'U',
            'email'         => Str::random(8).'@example.test',
            'password'      => 'secret-pass',
            'tenant_id'     => $tenantId,
            'is_superadmin' => false,
            'status'        => 'active',
        ]);

        if ($roleName) {
            $role = Role::create([
                'id'        => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'name'      => $roleName,
            ]);
            UserRole::create([
                'id'        => (string) Str::uuid(),
                'user_id'   => $user->id,
                'role_id'   => $role->id,
                'tenant_id' => $tenantId,
            ]);
        }

        return $user->fresh();
    }

    private function tenant(): string
    {
        return Tenant::create([
            'id'     => (string) Str::uuid(),
            'name'   => 'T',
            'slug'   => 't-'.Str::random(6),
            'status' => 'active',
        ])->id;
    }

    public function test_public_bucket_delete_requires_own_tenant_folder(): void
    {
        $policy = new FileAccessPolicy();
        $a = $this->tenant();
        $b = $this->tenant();
        $me = $this->user($a, 'tenant_admin');

        $this->assertTrue($policy->delete($me, 'product-images', "product-images/{$a}/x.jpg"));
        $this->assertFalse($policy->delete($me, 'product-images', "product-images/{$b}/x.jpg"));
        $this->assertFalse($policy->delete($me, 'branding', "branding/{$b}/logo.png"));
    }

    public function test_private_view_accepts_path_with_or_without_bucket_prefix(): void
    {
        $policy = new FileAccessPolicy();
        $a = $this->tenant();
        $b = $this->tenant();
        $me = $this->user($a);

        $this->assertTrue($policy->view($me, 'installment-docs', "installment-docs/{$a}/nid.jpg"));
        $this->assertTrue($policy->view($me, 'installment-docs', "{$a}/nid.jpg"));
        $this->assertFalse($policy->view($me, 'installment-docs', "installment-docs/{$b}/nid.jpg"));
    }
}

<?php

namespace Tests\Unit;

use App\Models\User;
use App\Policies\FileAccessPolicy;
use Tests\TestCase;

class FileAccessPolicyTest extends TestCase
{
    private function user(string $tenantId, array $roles = []): User
    {
        return new class($tenantId, $roles) extends User {
            public function __construct(public string $t, public array $r) { parent::__construct(); $this->tenant_id = $t; }
            public function hasRole(string ...$names): bool
            {
                foreach ($names as $n) { if (in_array($n, $this->r, true)) return true; }
                return false;
            }
        };
    }

    public function test_public_bucket_delete_requires_own_tenant_folder(): void
    {
        $policy = new FileAccessPolicy();
        $me = $this->user('tenant-a', ['tenant_admin']);

        $this->assertTrue($policy->delete($me, 'product-images', 'product-images/tenant-a/x.jpg'));
        $this->assertFalse($policy->delete($me, 'product-images', 'product-images/tenant-b/x.jpg'));
        $this->assertFalse($policy->delete($me, 'branding', 'branding/tenant-b/logo.png'));
    }

    public function test_private_view_accepts_path_with_or_without_bucket_prefix(): void
    {
        $policy = new FileAccessPolicy();
        $me = $this->user('tenant-a');

        $this->assertTrue($policy->view($me, 'installment-docs', 'installment-docs/tenant-a/nid.jpg'));
        $this->assertTrue($policy->view($me, 'installment-docs', 'tenant-a/nid.jpg'));
        $this->assertFalse($policy->view($me, 'installment-docs', 'installment-docs/tenant-b/nid.jpg'));
    }
}

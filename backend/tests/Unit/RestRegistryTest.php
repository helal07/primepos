<?php

namespace Tests\Unit;

use App\Support\RestRegistry;
use Tests\TestCase;

class RestRegistryTest extends TestCase
{
    public function test_registry_exposes_core_resources(): void
    {
        $all = RestRegistry::all();

        $core = [
            'products', 'product_variations', 'categories', 'brands', 'units',
            'warehouses', 'warehouse_stock',
            'customers', 'suppliers',
            'sales', 'sale_items', 'sale_payments',
            'purchases', 'purchase_items', 'purchase_payments',
            'accounts', 'transactions', 'expenses', 'expense_categories',
            'installment_customers', 'installment_sales', 'installment_schedules', 'installment_collections',
            'employees', 'attendance', 'leave_requests', 'payroll',
            'business_settings', 'roles', 'role_permissions', 'user_roles',
            'profiles', 'tenants', 'saas_packages',
            'selling_price_groups', 'customer_groups', 'product_group_prices',
            'warranties', 'warranty_claims',
            'sms_plans', 'sms_providers', 'sms_purchases',
            'tenant_notifications', 'activity_log',
        ];

        foreach ($core as $slug) {
            $this->assertArrayHasKey($slug, $all, "Missing REST resource: $slug");
        }
    }

    public function test_every_resource_has_model_and_module(): void
    {
        foreach (RestRegistry::all() as $slug => $config) {
            $this->assertArrayHasKey('model', $config, "$slug missing model");
            $this->assertArrayHasKey('module', $config, "$slug missing module");
            $this->assertTrue(class_exists($config['model']), "$slug model class does not exist: {$config['model']}");
        }
    }

    public function test_filter_and_sort_lists_are_arrays(): void
    {
        foreach (RestRegistry::all() as $slug => $config) {
            foreach (['filters', 'sort', 'search', 'with'] as $key) {
                if (isset($config[$key])) {
                    $this->assertIsArray($config[$key], "$slug.$key must be an array");
                }
            }
        }
    }
}
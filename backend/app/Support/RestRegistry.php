<?php

namespace App\Support;

use App\Models;

/**
 * Whitelist of resources reachable through /api/rest/{resource}.
 * Tables not listed here are NOT exposed.
 *
 * Per-resource keys:
 *   model          : Eloquent class
 *   module         : permission module key (used with has_perm: "<module>.view|create|edit|delete")
 *   filters        : list of columns allowed in ?filter[col]=
 *   sort           : list of columns allowed in ?sort=
 *   default_sort   : applied when ?sort missing
 *   search         : columns scanned by ?q= (ILIKE)
 *   with           : whitelisted relations for ?with=
 *   max_per_page   : cap for ?per_page=
 */
class RestRegistry
{
    /** @return array<string, array<string, mixed>> */
    public static function all(): array
    {
        return [
            // ===== Inventory (Stage 9b will start consuming these) =====
            'products' => [
                'model'        => Models\Product::class,
                'module'       => 'inventory',
                'filters'      => ['category_id', 'brand_id', 'unit_id', 'is_active', 'sku', 'barcode'],
                'sort'         => ['name', 'sku', 'created_at', 'updated_at', 'price'],
                'default_sort' => '-created_at',
                'search'       => ['name', 'sku', 'barcode'],
                'with'         => ['variations', 'category', 'brand', 'unit'],
                'max_per_page' => 200,
            ],
            'product_variations' => [
                'model'   => Models\ProductVariation::class,
                'module'  => 'inventory',
                'filters' => ['product_id', 'is_active'],
                'sort'    => ['name', 'created_at'],
                'default_sort' => 'name',
                'with'    => ['product'],
            ],
            'categories' => [
                'model'   => Models\Category::class,
                'module'  => 'inventory',
                'filters' => ['parent_id', 'is_active'],
                'sort'    => ['name', 'created_at'],
                'default_sort' => 'name',
                'search'  => ['name'],
            ],
            'brands' => [
                'model'   => Models\Brand::class,
                'module'  => 'inventory',
                'filters' => ['is_active'],
                'sort'    => ['name', 'created_at'],
                'default_sort' => 'name',
                'search'  => ['name'],
            ],
            'units' => [
                'model'   => Models\Unit::class,
                'module'  => 'inventory',
                'filters' => ['is_active'],
                'sort'    => ['name', 'created_at'],
                'default_sort' => 'name',
                'search'  => ['name', 'short_name'],
            ],
            'warehouses' => [
                'model'   => Models\Warehouse::class,
                'module'  => 'inventory',
                'filters' => ['is_active', 'is_default'],
                'sort'    => ['name', 'created_at'],
                'default_sort' => 'name',
                'search'  => ['name', 'code'],
            ],
            'warehouse_stock' => [
                'model'   => Models\WarehouseStock::class,
                'module'  => 'inventory',
                'filters' => ['warehouse_id', 'product_id', 'variation_id'],
                'sort'    => ['quantity', 'updated_at'],
                'default_sort' => '-updated_at',
                'with'    => ['product', 'variation', 'warehouse'],
            ],
            'stock_adjustments' => [
                'model'   => Models\StockAdjustment::class,
                'module'  => 'inventory',
                'filters' => ['product_id', 'variation_id', 'warehouse_id', 'type'],
                'sort'    => ['created_at'],
                'default_sort' => '-created_at',
                'with'    => ['product', 'variation'],
                'max_per_page' => 500,
            ],
            'stock_transfers' => [
                'model'   => Models\StockTransfer::class,
                'module'  => 'inventory',
                'filters' => ['product_id', 'variation_id', 'from_warehouse_id', 'to_warehouse_id', 'status'],
                'sort'    => ['created_at'],
                'default_sort' => '-created_at',
                'with'    => ['product', 'variation'],
                'max_per_page' => 500,
            ],

            // ===== Contacts (Stage 9c) =====
            'customers' => [
                'model'        => Models\Customer::class,
                'module'       => 'contacts',
                'filters'      => ['is_active', 'customer_group_id', 'phone', 'email'],
                'sort'         => ['name', 'created_at'],
                'default_sort' => 'name',
                'search'       => ['name', 'phone', 'email'],
                'max_per_page' => 500,
            ],
            'suppliers' => [
                'model'        => Models\Supplier::class,
                'module'       => 'contacts',
                'filters'      => ['is_active', 'phone', 'email'],
                'sort'         => ['name', 'created_at'],
                'default_sort' => 'name',
                'search'       => ['name', 'phone', 'email'],
                'max_per_page' => 500,
            ],

            // ===== Sales (Stage 9c) =====
            'sales' => [
                'model'        => Models\Sale::class,
                'module'       => 'sales',
                'filters'      => ['customer_id', 'status', 'payment_status', 'payment_method', 'warehouse_id', 'sale_date', 'created_at'],
                'sort'         => ['created_at', 'sale_date', 'total_amount', 'invoice_number'],
                'default_sort' => '-created_at',
                'search'       => ['invoice_number', 'order_no', 'notes'],
                'with'         => ['customer', 'items', 'payments'],
                'max_per_page' => 500,
            ],
            'sale_items' => [
                'model'        => Models\SaleItem::class,
                'module'       => 'sales',
                'filters'      => ['sale_id', 'product_id', 'variation_id'],
                'sort'         => ['sale_id'],
                'default_sort' => 'sale_id',
                'with'         => ['product', 'variation'],
                'max_per_page' => 1000,
            ],
            'sale_payments' => [
                'model'        => Models\SalePayment::class,
                'module'       => 'sales',
                'filters'      => ['sale_id', 'payment_method'],
                'sort'         => ['created_at'],
                'default_sort' => 'created_at',
                'max_per_page' => 1000,
            ],

            // ===== Purchases (Stage 9d) =====
            'purchases' => [
                'model'        => Models\Purchase::class,
                'module'       => 'purchases',
                'filters'      => ['supplier_id', 'status', 'payment_status', 'payment_method', 'purchase_date', 'created_at'],
                'sort'         => ['created_at', 'purchase_date', 'total_amount', 'reference_number'],
                'default_sort' => '-created_at',
                'search'       => ['reference_number', 'notes'],
                'with'         => ['supplier', 'items', 'payments'],
                'max_per_page' => 500,
            ],
            'purchase_items' => [
                'model'        => Models\PurchaseItem::class,
                'module'       => 'purchases',
                'filters'      => ['purchase_id', 'product_id', 'variation_id'],
                'sort'         => ['purchase_id'],
                'default_sort' => 'purchase_id',
                'with'         => ['product', 'variation'],
                'max_per_page' => 1000,
            ],
            'purchase_payments' => [
                'model'        => Models\PurchasePayment::class,
                'module'       => 'purchases',
                'filters'      => ['purchase_id', 'payment_method'],
                'sort'         => ['created_at'],
                'default_sort' => 'created_at',
                'max_per_page' => 1000,
            ],
            'purchase_orders' => [
                'model'        => Models\PurchaseOrder::class,
                'module'       => 'purchases',
                'filters'      => ['supplier_id', 'status', 'order_date'],
                'sort'         => ['created_at', 'order_date', 'reference_number'],
                'default_sort' => '-created_at',
                'search'       => ['reference_number', 'notes'],
                'with'         => ['supplier', 'items'],
                'max_per_page' => 500,
            ],
            'purchase_order_items' => [
                'model'        => Models\PurchaseOrderItem::class,
                'module'       => 'purchases',
                'filters'      => ['purchase_order_id', 'product_id', 'variation_id'],
                'sort'         => ['purchase_order_id'],
                'default_sort' => 'purchase_order_id',
                'with'         => ['product', 'product.brand', 'variation'],
                'max_per_page' => 1000,
            ],

            // ===== Accounting (Stage 9e) =====
            'accounts' => [
                'model'        => Models\Account::class,
                'module'       => 'accounting',
                'filters'      => ['type', 'parent_id', 'is_active'],
                'sort'         => ['code', 'name', 'created_at'],
                'default_sort' => 'code',
                'search'       => ['code', 'name'],
                'max_per_page' => 1000,
            ],
            'transactions' => [
                'model'        => Models\Transaction::class,
                'module'       => 'accounting',
                'filters'      => ['account_id', 'type', 'reference', 'journal_entry_id', 'transaction_date'],
                'sort'         => ['transaction_date', 'created_at'],
                'default_sort' => '-transaction_date',
                'search'       => ['description', 'reference'],
                'with'         => ['account'],
                'max_per_page' => 1000,
            ],
            'journal_entries' => [
                'model'        => Models\JournalEntry::class,
                'module'       => 'accounting',
                'filters'      => ['status', 'entry_date', 'reference'],
                'sort'         => ['entry_date', 'created_at'],
                'default_sort' => '-created_at',
                'search'       => ['reference', 'description'],
                'with'         => ['lines'],
                'max_per_page' => 500,
            ],
            'journal_entry_lines' => [
                'model'        => Models\JournalEntryLine::class,
                'module'       => 'accounting',
                'filters'      => ['journal_entry_id', 'account_id'],
                'sort'         => ['journal_entry_id'],
                'default_sort' => 'journal_entry_id',
                'with'         => ['account'],
                'max_per_page' => 2000,
            ],

            // ===== Expenses (Stage 9e) =====
            'expenses' => [
                'model'        => Models\Expense::class,
                'module'       => 'expenses',
                'filters'      => ['category_id', 'sub_category_id', 'location_id', 'account_id', 'payment_status', 'expense_date'],
                'sort'         => ['expense_date', 'created_at', 'total_amount'],
                'default_sort' => '-expense_date',
                'search'       => ['reference_no', 'expense_note', 'contact_name'],
                'with'         => ['category', 'subCategory', 'warehouse'],
                'max_per_page' => 500,
            ],
            'expense_categories' => [
                'model'        => Models\ExpenseCategory::class,
                'module'       => 'expenses',
                'filters'      => ['parent_id', 'is_active'],
                'sort'         => ['name', 'created_at'],
                'default_sort' => 'name',
                'search'       => ['name'],
                'max_per_page' => 500,
            ],
            'expense_payments' => [
                'model'        => Models\ExpensePayment::class,
                'module'       => 'expenses',
                'filters'      => ['expense_id', 'payment_method'],
                'sort'         => ['created_at'],
                'default_sort' => 'created_at',
                'max_per_page' => 1000,
            ],

            // ===== Installments (Stage 9f) =====
            'installment_customers' => [
                'model'        => Models\InstallmentCustomer::class,
                'module'       => 'installments',
                'filters'      => ['customer_id', 'is_active'],
                'sort'         => ['created_at'],
                'default_sort' => '-created_at',
                'search'       => ['guarantor_name', 'guarantor_phone'],
                'with'         => ['customer'],
                'max_per_page' => 500,
            ],
            'installment_sales' => [
                'model'        => Models\InstallmentSale::class,
                'module'       => 'installments',
                'filters'      => ['customer_id', 'product_id', 'installment_customer_id', 'status', 'invoice_no'],
                'sort'         => ['created_at', 'invoice_no'],
                'default_sort' => '-created_at',
                'search'       => ['invoice_no'],
                'with'         => ['customer', 'product', 'installmentCustomer', 'schedules'],
                'max_per_page' => 500,
            ],
            'installment_schedules' => [
                'model'        => Models\InstallmentSchedule::class,
                'module'       => 'installments',
                'filters'      => ['installment_sale_id', 'status', 'due_date'],
                'sort'         => ['due_date', 'serial_no'],
                'default_sort' => 'due_date',
                'with'         => ['installmentSale', 'installmentSale.customer', 'installmentSale.product'],
                'max_per_page' => 2000,
            ],
            'installment_collections' => [
                'model'        => Models\InstallmentCollection::class,
                'module'       => 'installments',
                'filters'      => ['installment_sale_id', 'schedule_id'],
                'sort'         => ['collected_at', 'created_at'],
                'default_sort' => '-collected_at',
                'with'         => ['schedule'],
                'max_per_page' => 1000,
            ],

            // ===== HRM (Stage 9g) =====
            'employees' => [
                'model'        => Models\Employee::class,
                'module'       => 'hrm',
                'filters'      => ['status', 'department', 'designation'],
                'sort'         => ['name', 'created_at', 'joining_date'],
                'default_sort' => 'name',
                'search'       => ['name', 'email', 'phone', 'designation'],
                'max_per_page' => 500,
            ],
            'attendance' => [
                'model'        => Models\Attendance::class,
                'module'       => 'hrm',
                'filters'      => ['employee_id', 'date', 'status'],
                'sort'         => ['date', 'created_at'],
                'default_sort' => '-date',
                'with'         => ['employee'],
                'max_per_page' => 1000,
            ],
            'leave_requests' => [
                'model'        => Models\LeaveRequest::class,
                'module'       => 'hrm',
                'filters'      => ['employee_id', 'status', 'leave_type'],
                'sort'         => ['created_at', 'start_date'],
                'default_sort' => '-created_at',
                'with'         => ['employee'],
                'max_per_page' => 500,
            ],
            'payroll' => [
                'model'        => Models\Payroll::class,
                'module'       => 'hrm',
                'filters'      => ['employee_id', 'month', 'year', 'status'],
                'sort'         => ['year', 'month', 'created_at'],
                'default_sort' => '-year',
                'with'         => ['employee'],
                'max_per_page' => 500,
            ],

            // ===== Roles & permissions (Stage 9h) =====
            'roles' => [
                'model'        => Models\Role::class,
                'module'       => 'roles',
                'filters'      => ['is_system', 'is_default'],
                'sort'         => ['is_system', 'name', 'created_at'],
                'default_sort' => 'name',
                'search'       => ['name'],
                'max_per_page' => 500,
            ],
            'role_permissions' => [
                'model'        => Models\RolePermission::class,
                'module'       => 'roles',
                'filters'      => ['role_id', 'module'],
                'sort'         => ['module'],
                'default_sort' => 'module',
                'max_per_page' => 2000,
            ],
            'role_permission_grants' => [
                'model'        => Models\RolePermissionGrant::class,
                'module'       => 'roles',
                'filters'      => ['role_id', 'permission_key'],
                'sort'         => ['role_id'],
                'default_sort' => 'role_id',
                'max_per_page' => 5000,
            ],
            'permission_catalog' => [
                'model'        => Models\PermissionCatalog::class,
                'module'       => 'roles',
                'filters'      => ['module'],
                'sort'         => ['module', 'sort_order'],
                'default_sort' => 'module',
                'max_per_page' => 1000,
            ],
            'user_roles' => [
                'model'        => Models\UserRole::class,
                'module'       => 'roles',
                'filters'      => ['user_id', 'role_id'],
                'sort'         => ['user_id'],
                'default_sort' => 'user_id',
                'with'         => ['role'],
                'max_per_page' => 1000,
            ],
            'profiles' => [
                'model'        => Models\Profile::class,
                'module'       => 'roles',
                'filters'      => ['user_id'],
                'sort'         => ['display_name', 'created_at'],
                'default_sort' => 'display_name',
                'search'       => ['display_name'],
                'max_per_page' => 1000,
            ],

            // ===== Warranty CMS (Stage 9h) =====
            'warranty_claims' => [
                'model'        => Models\WarrantyClaim::class,
                'module'       => 'warranty',
                'filters'      => ['warranty_id', 'status', 'claim_date'],
                'sort'         => ['created_at', 'claim_date'],
                'default_sort' => '-created_at',
                'search'       => ['claim_no', 'issue_description'],
                'with'         => ['customer', 'product', 'warranty'],
                'max_per_page' => 500,
            ],
            'warranties' => [
                'model'        => Models\Warranty::class,
                'module'       => 'warranty',
                'filters'      => ['product_id', 'customer_id', 'status', 'imei_serial', 'warranty_no'],
                'sort'         => ['created_at', 'end_date'],
                'default_sort' => '-created_at',
                'search'       => ['warranty_no', 'imei_serial'],
                'with'         => ['product', 'customer'],
                'max_per_page' => 500,
            ],

            // ===== SaaS Admin (Stage 9h) =====
            'saas_packages' => [
                'model'        => Models\SaasPackage::class,
                'module'       => 'saas',
                'filters'      => ['is_active', 'is_popular', 'show_on_landing'],
                'sort'         => ['sort_order', 'price', 'created_at'],
                'default_sort' => 'sort_order',
                'search'       => ['name'],
                'max_per_page' => 200,
            ],
            'tenants' => [
                'model'        => Models\Tenant::class,
                'module'       => 'saas',
                'filters'      => ['status', 'package_id', 'owner_user_id'],
                'sort'         => ['created_at', 'name', 'subscription_end'],
                'default_sort' => '-created_at',
                'search'       => ['name', 'email', 'phone'],
                'with'         => ['package'],
                'max_per_page' => 500,
            ],
            'tenant_actions_log' => [
                'model'        => Models\TenantActionsLog::class,
                'module'       => 'saas',
                'filters'      => ['tenant_id', 'action'],
                'sort'         => ['created_at'],
                'default_sort' => '-created_at',
                'max_per_page' => 500,
            ],
            'landing_features' => [
                'model'        => Models\LandingFeature::class,
                'module'       => 'cms',
                'filters'      => ['is_active'],
                'sort'         => ['sort_order', 'created_at'],
                'default_sort' => 'sort_order',
                'max_per_page' => 200,
            ],
            'landing_reviews' => [
                'model'        => Models\LandingReview::class,
                'module'       => 'cms',
                'filters'      => ['is_active'],
                'sort'         => ['sort_order', 'created_at'],
                'default_sort' => 'sort_order',
                'max_per_page' => 200,
            ],
        ];
    }

    public static function get(string $resource): ?array
    {
        return self::all()[$resource] ?? null;
    }
}
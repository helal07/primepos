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
        ];
    }

    public static function get(string $resource): ?array
    {
        return self::all()[$resource] ?? null;
    }
}
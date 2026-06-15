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
                'with'    => ['product', 'warehouse'],
            ],
        ];
    }

    public static function get(string $resource): ?array
    {
        return self::all()[$resource] ?? null;
    }
}
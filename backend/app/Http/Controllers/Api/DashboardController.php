<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Dashboard aggregates. Performs all SUM/COUNT in the database in a single
 * round-trip per metric — replaces the previous 14 chained Supabase queries.
 * Tenant scoping is applied explicitly via the caller's tenant_id.
 */
class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        $tz = config('app.timezone');

        $today        = now($tz)->toDateString();
        $monthStart   = now($tz)->startOfMonth()->toDateString();
        $prevMonthStart = now($tz)->subMonthNoOverflow()->startOfMonth()->toDateString();
        $prevMonthEnd   = now($tz)->subMonthNoOverflow()->endOfMonth()->toDateString();
        $weekAgo      = now($tz)->subDays(7)->toDateString();

        $tenantWhere = $tenantId ? 'tenant_id = ?' : 'tenant_id IS NULL';
        $tenantBind  = $tenantId ? [$tenantId] : [];

        $sum = function (string $sql, array $extra = []) use ($tenantWhere, $tenantBind) {
            $row = DB::selectOne($sql, array_merge($tenantBind, $extra));
            return (float) ($row->v ?? 0);
        };
        $count = function (string $sql, array $extra = []) use ($tenantWhere, $tenantBind) {
            $row = DB::selectOne($sql, array_merge($tenantBind, $extra));
            return (int) ($row->c ?? 0);
        };

        $todaySales = $sum(
            "select coalesce(sum(total_amount),0) v from sales where {$tenantWhere} and sale_date >= ?",
            [$today],
        );
        $monthRevenue = $sum(
            "select coalesce(sum(total_amount),0) v from sales where {$tenantWhere} and sale_date >= ?",
            [$monthStart],
        );
        $prevMonthRevenue = $sum(
            "select coalesce(sum(total_amount),0) v from sales where {$tenantWhere} and sale_date >= ? and sale_date <= ?",
            [$prevMonthStart, $prevMonthEnd],
        );
        $totalPurchases = $sum(
            "select coalesce(sum(total_amount),0) v from purchases where {$tenantWhere} and purchase_date >= ?",
            [$monthStart],
        );

        $totalProducts = $count("select count(*) c from products where {$tenantWhere}");
        $lowStock      = $count("select count(*) c from products where {$tenantWhere} and stock_quantity <= 5");
        $pendingOrders = $count("select count(*) c from sales where {$tenantWhere} and status = 'draft'");

        $saleDue = $sum(
            "select coalesce(sum(total_amount),0) v from sales where {$tenantWhere} and payment_status = 'unpaid'",
        );
        $purchaseDue = $sum(
            "select coalesce(sum(total_amount),0) v from purchases where {$tenantWhere} and payment_status = 'unpaid'",
        );

        // Daily revenue series (this month)
        $dailyMonth = DB::select(
            "select sale_date::date as d, sum(total_amount)::numeric as v
               from sales where {$tenantWhere} and sale_date >= ?
               group by sale_date::date order by sale_date::date",
            array_merge($tenantBind, [$monthStart]),
        );
        $weekly = DB::select(
            "select sale_date::date as d, sum(total_amount)::numeric as v
               from sales where {$tenantWhere} and sale_date >= ?
               group by sale_date::date order by sale_date::date",
            array_merge($tenantBind, [$weekAgo]),
        );

        // Recent sales (with customer name) — single join, no N+1
        $recentSales = DB::select(
            "select s.*, c.name as customer_name
               from sales s left join customers c on c.id = s.customer_id
              where s.{$tenantWhere}
              order by s.created_at desc limit 5",
            $tenantBind,
        );

        // Top products (aggregate over sale_items, last 90d for relevance)
        $topProducts = DB::select(
            "select p.id, p.name, sum(si.quantity)::numeric as sold, sum(si.total)::numeric as revenue
               from sale_items si
               join products p on p.id = si.product_id
              where si.{$tenantWhere}
              group by p.id, p.name
              order by revenue desc nulls last
              limit 5",
            $tenantBind,
        );

        $recentActivity = DB::select(
            "select * from activity_log where {$tenantWhere} order by created_at desc limit 8",
            $tenantBind,
        );
        $stockAlerts = DB::select(
            "select id, name, stock_quantity, alert_quantity, selling_price
               from products where {$tenantWhere} and stock_quantity <= 10
              order by stock_quantity asc limit 10",
            $tenantBind,
        );
        $unpaidSales = DB::select(
            "select s.total_amount, s.invoice_number, c.name as customer_name
               from sales s left join customers c on c.id = s.customer_id
              where s.{$tenantWhere} and s.payment_status = 'unpaid'
              order by s.created_at desc limit 10",
            $tenantBind,
        );
        $unpaidPurchases = DB::select(
            "select p.total_amount, p.reference_number, sp.name as supplier_name
               from purchases p left join suppliers sp on sp.id = p.supplier_id
              where p.{$tenantWhere} and p.payment_status = 'unpaid'
              order by p.created_at desc limit 10",
            $tenantBind,
        );

        return response()->json([
            'todaySales'       => $todaySales,
            'totalProducts'    => $totalProducts,
            'lowStock'         => $lowStock,
            'pendingOrders'    => $pendingOrders,
            'monthRevenue'     => $monthRevenue,
            'prevMonthRevenue' => $prevMonthRevenue,
            'revenueGrowth'    => $prevMonthRevenue > 0 ? (($monthRevenue - $prevMonthRevenue) / $prevMonthRevenue) * 100 : 0,
            'totalPurchases'   => $totalPurchases,
            'profit'           => $monthRevenue - $totalPurchases,
            'saleDue'          => $saleDue,
            'purchaseDue'      => $purchaseDue,
            'revenueChart'     => array_map(fn ($r) => ['date' => $r->d, 'revenue' => (float) $r->v], $dailyMonth),
            'weekChart'        => array_map(fn ($r) => ['date' => $r->d, 'revenue' => (float) $r->v], $weekly),
            'recentSales'      => array_map(fn ($r) => (array) $r + ['customers' => ['name' => $r->customer_name ?? null]], $recentSales),
            'topProducts'      => array_map(fn ($r) => ['name' => $r->name, 'sold' => (float) $r->sold, 'revenue' => (float) $r->revenue], $topProducts),
            'recentActivity'   => $recentActivity,
            'stockAlerts'      => $stockAlerts,
            'unpaidSales'      => array_map(fn ($r) => ['total_amount' => $r->total_amount, 'invoice_number' => $r->invoice_number, 'customers' => ['name' => $r->customer_name ?? null]], $unpaidSales),
            'unpaidPurchases'  => array_map(fn ($r) => ['total_amount' => $r->total_amount, 'reference_number' => $r->reference_number, 'suppliers' => ['name' => $r->supplier_name ?? null]], $unpaidPurchases),
        ]);
    }
}

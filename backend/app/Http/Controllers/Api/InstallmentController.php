<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InstallmentCollection;
use App\Models\InstallmentSale;
use App\Models\InstallmentSchedule;
use App\Services\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InstallmentController extends Controller
{
    /**
     * Post a collection against one schedule row, then recalculate the schedule
     * status and the parent sale totals inside a single transaction.
     */
    public function collect(Request $request): JsonResponse
    {
        $data = $request->validate([
            'installment_sale_id' => ['required', 'uuid'],
            'schedule_id'         => ['required', 'uuid'],
            'amount'              => ['required', 'numeric', 'gt:0'],
            'payment_method'      => ['nullable', 'string', 'max:50'],
            'reference'           => ['nullable', 'string', 'max:120'],
            'paid_date'           => ['nullable', 'date'],
            'notes'               => ['nullable', 'string'],
        ]);

        $user = $request->user();

        $result = DB::transaction(function () use ($data, $user) {
            /** @var InstallmentSale|null $sale */
            $sale = InstallmentSale::query()->whereKey($data['installment_sale_id'])->first();
            if (! $sale) abort(404, 'Installment sale not found.');

            /** @var InstallmentSchedule|null $schedule */
            $schedule = InstallmentSchedule::query()
                ->whereKey($data['schedule_id'])
                ->where('installment_sale_id', $sale->id)
                ->lockForUpdate()
                ->first();
            if (! $schedule) abort(404, 'Installment schedule not found.');

            $paidDate = $data['paid_date'] ?? now()->toDateString();

            $collection = InstallmentCollection::create([
                'tenant_id'           => $sale->tenant_id,
                'installment_sale_id' => $sale->id,
                'schedule_id'         => $schedule->id,
                'amount'              => $data['amount'],
                'payment_method'      => $data['payment_method'] ?? 'cash',
                'reference'           => $data['reference'] ?? null,
                'notes'               => $data['notes'] ?? null,
                'collected_at'        => $paidDate . ' ' . now()->format('H:i:s'),
                'collected_by'        => $user?->id,
            ]);

            // ── schedule roll-up ──
            $paid = (float) DB::table('installment_schedules')->where('id', $schedule->id)->value('paid_amount');
            $paid += (float) $data['amount'];
            $due  = (float) $schedule->amount;

            $status = $paid <= 0 ? 'pending' : ($paid + 0.009 < $due ? 'partial' : 'paid');

            $schedule->forceFill([
                'paid_amount' => round($paid, 2),
                'status'      => $status,
                'paid_date'   => $status === 'paid' ? $paidDate : $schedule->paid_date,
            ])->saveQuietly();

            // ── sale roll-up ──
            $collected = (float) InstallmentCollection::query()
                ->where('installment_sale_id', $sale->id)->sum('amount');

            $financed  = (float) ($sale->total_amount ?? 0) - (float) ($sale->down_payment ?? 0);
            $remaining = round(max($financed - $collected, 0), 2);

            $sale->forceFill([
                'remaining_amount' => $remaining,
                'status'           => $remaining <= 0.009 ? 'completed' : ($sale->status ?: 'active'),
            ])->saveQuietly();

            return [
                'collection'      => $collection->fresh(),
                'schedule'        => $schedule->fresh(),
                'sale'            => $sale->fresh(),
                'total_collected' => round($collected, 2),
            ];
        });

        return response()->json($result);
    }

    /**
     * Send an SMS due-date reminder for one schedule row.
     */
    public function reminder(Request $request, string $scheduleId, SmsService $sms): JsonResponse
    {
        /** @var InstallmentSchedule|null $schedule */
        $schedule = InstallmentSchedule::query()
            ->with(['installmentSale.customer', 'installmentSale.installmentCustomer', 'installmentSale.product'])
            ->whereKey($scheduleId)
            ->first();
        if (! $schedule) abort(404, 'Installment schedule not found.');

        $sale     = $schedule->installmentSale;
        $customer = $sale?->customer;
        $phone    = $customer->phone ?? $sale?->installmentCustomer?->phone ?? null;

        if (! $phone) {
            return response()->json([
                'sent'   => false,
                'reason' => 'No mobile number found for this customer.',
            ], 422);
        }

        $due       = optional($schedule->due_date)->format('d M Y') ?? (string) $schedule->due_date;
        $amount    = number_format((float) $schedule->amount - (float) ($schedule->paid_amount ?? 0), 2);
        $remaining = number_format((float) ($sale->remaining_amount ?? 0), 2);
        $invoice   = $sale->invoice_no ?? $sale->invoice_number ?? '';

        $message = sprintf(
            'Dear %s, installment %s of invoice %s is due on %s. Payable: %s. Total remaining: %s. Thank you.',
            $customer->name ?? 'Customer',
            $schedule->serial_no ?? '',
            $invoice,
            $due,
            $amount,
            $remaining,
        );

        $sent = $sms->send((string) $schedule->tenant_id, (string) $phone, $message);

        return response()->json([
            'sent'    => $sent,
            'phone'   => $phone,
            'message' => $message,
            'reason'  => $sent ? null : 'No active SMS gateway is configured. Add provider credentials in SMS settings.',
        ], $sent ? 200 : 422);
    }

    /**
     * Cross-tenant credit risk check by NID.
     *
     * Looks for installment customers holding the same NID at OTHER tenants and
     * reports aggregated outstanding dues per shop so the current retailer can
     * judge whether granting a new installment plan is safe.
     *
     * Privacy: only shop name + shop contact phone and aggregated money figures
     * are returned — never other tenants' customer contacts, documents or ids.
     */
    public function nidRiskCheck(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nid' => ['required', 'string', 'regex:/^[0-9]{8,25}$/'],
        ]);

        $nid       = preg_replace('/\D+/', '', (string) $data['nid']);
        $myTenant  = (string) ($request->user()->tenant_id ?? '');

        // Matching installment customers at other tenants.
        $matches = DB::table('installment_customers')
            ->select('id', 'tenant_id', 'name')
            ->where('nid', $nid)
            ->when($myTenant !== '', fn ($q) => $q->where('tenant_id', '!=', $myTenant))
            ->whereNotNull('tenant_id')
            ->limit(200)
            ->get();

        if ($matches->isEmpty()) {
            return response()->json(['nid' => $nid, 'has_risk' => false, 'shops' => []]);
        }

        $icIds = $matches->pluck('id')->all();

        $sales = DB::table('installment_sales')
            ->select('id', 'tenant_id', 'total_amount', 'down_payment', 'remaining_amount', 'status')
            ->whereIn('installment_customer_id', $icIds)
            ->get();

        if ($sales->isEmpty()) {
            return response()->json(['nid' => $nid, 'has_risk' => false, 'shops' => []]);
        }

        $saleIds = $sales->pluck('id')->all();

        $collected = DB::table('installment_collections')
            ->selectRaw('installment_sale_id, SUM(amount) AS paid, MAX(collected_at) AS last_paid')
            ->whereIn('installment_sale_id', $saleIds)
            ->groupBy('installment_sale_id')
            ->get()
            ->keyBy('installment_sale_id');

        $overdue = DB::table('installment_schedules')
            ->selectRaw('installment_sale_id, COUNT(*) AS overdue_count')
            ->whereIn('installment_sale_id', $saleIds)
            ->whereDate('due_date', '<', now()->toDateString())
            ->where(function ($q) {
                $q->whereNull('status')->orWhere('status', '!=', 'paid');
            })
            ->groupBy('installment_sale_id')
            ->get()
            ->keyBy('installment_sale_id');

        $tenantIds = $sales->pluck('tenant_id')->unique()->filter()->all();

        $tenants  = DB::table('tenants')->whereIn('id', $tenantIds)
            ->select('id', 'name', 'phone')->get()->keyBy('id');
        $settings = DB::table('business_settings')->whereIn('tenant_id', $tenantIds)
            ->select('tenant_id', 'business_name', 'contact_phone')->get()->keyBy('tenant_id');

        $namesByTenant = $matches->groupBy('tenant_id')->map(
            fn ($rows) => $rows->pluck('name')->filter()->unique()->values()->first()
        );

        $shops = [];
        foreach ($sales->groupBy('tenant_id') as $tenantId => $rows) {
            $financed = 0.0; $paid = 0.0; $due = 0.0; $overdueCount = 0; $lastPaid = null;

            foreach ($rows as $sale) {
                $total     = (float) ($sale->total_amount ?? 0);
                $down      = (float) ($sale->down_payment ?? 0);
                $financed += max($total - $down, 0);

                $c = $collected->get($sale->id);
                $paid += (float) ($c->paid ?? 0);
                if (! empty($c->last_paid) && ($lastPaid === null || $c->last_paid > $lastPaid)) {
                    $lastPaid = $c->last_paid;
                }

                $due          += (float) ($sale->remaining_amount ?? 0);
                $overdueCount += (int) ($overdue->get($sale->id)->overdue_count ?? 0);
            }

            if (round($due, 2) <= 0) continue;

            $t = $tenants->get($tenantId);
            $s = $settings->get($tenantId);

            $shops[] = [
                'shop_name'       => $s->business_name ?? $t->name ?? 'Unknown shop',
                'shop_phone'      => $s->contact_phone ?? $t->phone ?? null,
                'customer_name'   => $namesByTenant[$tenantId] ?? null,
                'financed_amount' => round($financed, 2),
                'paid_amount'     => round($paid, 2),
                'due_amount'      => round($due, 2),
                'sales_count'     => $rows->count(),
                'overdue_count'   => $overdueCount,
                'last_payment_at' => $lastPaid,
            ];
        }

        usort($shops, fn ($a, $b) => $b['due_amount'] <=> $a['due_amount']);

        return response()->json([
            'nid'      => $nid,
            'has_risk' => count($shops) > 0,
            'shops'    => $shops,
        ]);
    }
}


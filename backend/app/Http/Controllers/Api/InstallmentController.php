<?php

namespace App\Http\Controllers\Api;

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
            $paid = (float) DB::table('installment_schedules')->whereKey($schedule->id)->value('paid_amount');
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
}

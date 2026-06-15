<?php

namespace App\Observers;

use App\Models\Expense;
use App\Models\Transaction;
use App\Services\NumberGeneratorService;
use Illuminate\Support\Str;

class ExpenseObserver
{
    public function __construct(protected NumberGeneratorService $numbers) {}

    public function creating(Expense $e): void
    {
        if (empty($e->reference_no) && $e->tenant_id) {
            $e->reference_no = $this->numbers->nextExpense($e->tenant_id);
        }
    }

    public function created(Expense $e): void
    {
        $this->syncTransaction($e);
    }

    public function updated(Expense $e): void
    {
        if ($e->wasChanged(['amount', 'expense_date', 'payment_method', 'notes', 'reference_no'])) {
            $this->syncTransaction($e);
        }
    }

    public function deleted(Expense $e): void
    {
        Transaction::query()->withoutGlobalScopes()
            ->where('source_type', 'expense')
            ->where('source_id', $e->id)
            ->delete();
    }

    protected function syncTransaction(Expense $e): void
    {
        $existing = Transaction::query()->withoutGlobalScopes()
            ->where('source_type', 'expense')
            ->where('source_id', $e->id)
            ->first();

        $data = [
            'tenant_id'        => $e->tenant_id,
            'reference_no'     => $e->reference_no,
            'transaction_date' => $e->expense_date,
            'type'             => 'expense',
            'amount'           => $e->amount,
            'payment_method'   => $e->payment_method,
            'source_type'      => 'expense',
            'source_id'        => $e->id,
            'description'      => $e->notes,
            'created_by'       => $e->created_by,
        ];

        if ($existing) {
            $existing->forceFill($data)->saveQuietly();
        } else {
            $data['id'] = (string) Str::uuid();
            Transaction::query()->withoutGlobalScopes()->create($data);
        }
    }
}
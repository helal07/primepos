<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\{Sale, SaleItem, SalePayment, PurchaseItem, StockAdjustment, StockTransfer, Expense, Tenant, InstallmentCollection};
use App\Observers\{SaleObserver, SaleItemObserver, SalePaymentObserver, PurchaseItemObserver, StockAdjustmentObserver, StockTransferObserver, ExpenseObserver, TenantObserver, InstallmentCollectionObserver};

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Sale::observe(SaleObserver::class);
        SaleItem::observe(SaleItemObserver::class);
        SalePayment::observe(SalePaymentObserver::class);
        PurchaseItem::observe(PurchaseItemObserver::class);
        StockAdjustment::observe(StockAdjustmentObserver::class);
        StockTransfer::observe(StockTransferObserver::class);
        Expense::observe(ExpenseObserver::class);
        Tenant::observe(TenantObserver::class);
        InstallmentCollection::observe(InstallmentCollectionObserver::class);
    }
}
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reconciles the MySQL (Laravel) schema with the canonical schema used by the
 * Lovable frontend. Columns whose names diverged are renamed (data preserved);
 * genuinely missing columns are added. Every step is guarded so the migration is
 * safe to run on fresh and existing databases alike.
 */
return new class extends Migration {
    public function up(): void
    {
        foreach (self::RENAMES as $table => $renames) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            foreach ($renames as $from => $to) {
                if (Schema::hasColumn($table, $from) && ! Schema::hasColumn($table, $to)) {
                    Schema::table($table, function (Blueprint $t) use ($from, $to) {
                        $t->renameColumn($from, $to);
                    });
                }
            }
        }

        if (Schema::hasTable('accounts')) {
            Schema::table('accounts', function (Blueprint $table) {
                if (! Schema::hasColumn('accounts', 'created_by')) { $table->uuid('created_by')->nullable(); }
            });
        }
        if (Schema::hasTable('attendance')) {
            Schema::table('attendance', function (Blueprint $table) {
                if (! Schema::hasColumn('attendance', 'latitude')) { $table->decimal('latitude', 14, 2)->nullable(); }
                if (! Schema::hasColumn('attendance', 'longitude')) { $table->decimal('longitude', 14, 2)->nullable(); }
                if (! Schema::hasColumn('attendance', 'selfie_url')) { $table->text('selfie_url')->nullable(); }
            });
        }
        if (Schema::hasTable('business_settings')) {
            Schema::table('business_settings', function (Blueprint $table) {
                if (! Schema::hasColumn('business_settings', 'key')) { $table->text('key')->nullable(); }
                if (! Schema::hasColumn('business_settings', 'updated_by')) { $table->uuid('updated_by')->nullable(); }
                if (! Schema::hasColumn('business_settings', 'value')) { $table->json('value')->nullable(); }
            });
        }
        if (Schema::hasTable('customers')) {
            Schema::table('customers', function (Blueprint $table) {
                if (! Schema::hasColumn('customers', 'company')) { $table->text('company')->nullable(); }
                if (! Schema::hasColumn('customers', 'total_purchases')) { $table->integer('total_purchases')->nullable(); }
            });
        }
        if (Schema::hasTable('employees')) {
            Schema::table('employees', function (Blueprint $table) {
                if (! Schema::hasColumn('employees', 'bank_account')) { $table->text('bank_account')->nullable(); }
                if (! Schema::hasColumn('employees', 'bank_name')) { $table->text('bank_name')->nullable(); }
                if (! Schema::hasColumn('employees', 'emergency_contact')) { $table->text('emergency_contact')->nullable(); }
                if (! Schema::hasColumn('employees', 'notes')) { $table->text('notes')->nullable(); }
            });
        }
        if (Schema::hasTable('exchange_purchases')) {
            Schema::table('exchange_purchases', function (Blueprint $table) {
                if (! Schema::hasColumn('exchange_purchases', 'assigned_to')) { $table->uuid('assigned_to')->nullable(); }
                if (! Schema::hasColumn('exchange_purchases', 'brand')) { $table->text('brand')->nullable(); }
                if (! Schema::hasColumn('exchange_purchases', 'linked_variation_id')) { $table->uuid('linked_variation_id')->nullable(); }
                if (! Schema::hasColumn('exchange_purchases', 'model')) { $table->text('model')->nullable(); }
                if (! Schema::hasColumn('exchange_purchases', 'paid_amount')) { $table->decimal('paid_amount', 14, 2)->nullable(); }
                if (! Schema::hasColumn('exchange_purchases', 'payment_method')) { $table->text('payment_method')->nullable(); }
                if (! Schema::hasColumn('exchange_purchases', 'product_name')) { $table->text('product_name')->nullable(); }
                if (! Schema::hasColumn('exchange_purchases', 'seller_nid_url')) { $table->text('seller_nid_url')->nullable(); }
                if (! Schema::hasColumn('exchange_purchases', 'seller_photo_url')) { $table->text('seller_photo_url')->nullable(); }
            });
        }
        if (Schema::hasTable('expense_payments')) {
            Schema::table('expense_payments', function (Blueprint $table) {
                if (! Schema::hasColumn('expense_payments', 'account_id')) { $table->uuid('account_id')->nullable(); }
            });
        }
        if (Schema::hasTable('expenses')) {
            Schema::table('expenses', function (Blueprint $table) {
                if (! Schema::hasColumn('expenses', 'account_id')) { $table->uuid('account_id')->nullable(); }
                if (! Schema::hasColumn('expenses', 'contact_name')) { $table->text('contact_name')->nullable(); }
                if (! Schema::hasColumn('expenses', 'expense_for_user_id')) { $table->uuid('expense_for_user_id')->nullable(); }
                if (! Schema::hasColumn('expenses', 'payment_due')) { $table->decimal('payment_due', 14, 2)->nullable(); }
                if (! Schema::hasColumn('expenses', 'recurring')) { $table->boolean('recurring')->nullable(); }
                if (! Schema::hasColumn('expenses', 'recurring_interval')) { $table->text('recurring_interval')->nullable(); }
                if (! Schema::hasColumn('expenses', 'recurring_repetitions')) { $table->integer('recurring_repetitions')->nullable(); }
                if (! Schema::hasColumn('expenses', 'sub_category_id')) { $table->uuid('sub_category_id')->nullable(); }
                if (! Schema::hasColumn('expenses', 'tax_amount')) { $table->decimal('tax_amount', 14, 2)->nullable(); }
            });
        }
        if (Schema::hasTable('installment_customers')) {
            Schema::table('installment_customers', function (Blueprint $table) {
                if (! Schema::hasColumn('installment_customers', 'customer_id')) { $table->uuid('customer_id')->nullable(); }
                if (! Schema::hasColumn('installment_customers', 'guarantor_nid_url')) { $table->text('guarantor_nid_url')->nullable(); }
                if (! Schema::hasColumn('installment_customers', 'guarantor_photo_url')) { $table->text('guarantor_photo_url')->nullable(); }
                if (! Schema::hasColumn('installment_customers', 'guarantor_present_address')) { $table->text('guarantor_present_address')->nullable(); }
                if (! Schema::hasColumn('installment_customers', 'guarantor_work_address')) { $table->text('guarantor_work_address')->nullable(); }
                if (! Schema::hasColumn('installment_customers', 'nid_url')) { $table->text('nid_url')->nullable(); }
                if (! Schema::hasColumn('installment_customers', 'photo_url')) { $table->text('photo_url')->nullable(); }
                if (! Schema::hasColumn('installment_customers', 'work_address')) { $table->text('work_address')->nullable(); }
            });
        }
        if (Schema::hasTable('installment_sales')) {
            Schema::table('installment_sales', function (Blueprint $table) {
                if (! Schema::hasColumn('installment_sales', 'discount')) { $table->decimal('discount', 14, 2)->nullable(); }
                if (! Schema::hasColumn('installment_sales', 'down_payment_account')) { $table->text('down_payment_account')->nullable(); }
                if (! Schema::hasColumn('installment_sales', 'imei_serial')) { $table->text('imei_serial')->nullable(); }
                if (! Schema::hasColumn('installment_sales', 'installment_customer_id')) { $table->uuid('installment_customer_id')->nullable(); }
                if (! Schema::hasColumn('installment_sales', 'installment_duration_days')) { $table->integer('installment_duration_days')->nullable(); }
                if (! Schema::hasColumn('installment_sales', 'price')) { $table->decimal('price', 14, 2)->nullable(); }
                if (! Schema::hasColumn('installment_sales', 'product_id')) { $table->uuid('product_id')->nullable(); }
                if (! Schema::hasColumn('installment_sales', 'remaining_amount')) { $table->decimal('remaining_amount', 14, 2)->nullable(); }
                if (! Schema::hasColumn('installment_sales', 'shipping_cost')) { $table->decimal('shipping_cost', 14, 2)->nullable(); }
                if (! Schema::hasColumn('installment_sales', 'variation_id')) { $table->uuid('variation_id')->nullable(); }
            });
        }
        if (Schema::hasTable('payment_attempts')) {
            Schema::table('payment_attempts', function (Blueprint $table) {
                if (! Schema::hasColumn('payment_attempts', 'gateway')) { $table->text('gateway')->nullable(); }
                if (! Schema::hasColumn('payment_attempts', 'package_id')) { $table->uuid('package_id')->nullable(); }
            });
        }
        if (Schema::hasTable('payment_gateway_credentials')) {
            Schema::table('payment_gateway_credentials', function (Blueprint $table) {
                if (! Schema::hasColumn('payment_gateway_credentials', 'config')) { $table->json('config')->nullable(); }
            });
        }
        if (Schema::hasTable('payment_gateways')) {
            Schema::table('payment_gateways', function (Blueprint $table) {
                if (! Schema::hasColumn('payment_gateways', 'account_number')) { $table->text('account_number')->nullable(); }
                if (! Schema::hasColumn('payment_gateways', 'account_type')) { $table->text('account_type')->nullable(); }
                if (! Schema::hasColumn('payment_gateways', 'instructions')) { $table->text('instructions')->nullable(); }
                if (! Schema::hasColumn('payment_gateways', 'logo_url')) { $table->text('logo_url')->nullable(); }
                if (! Schema::hasColumn('payment_gateways', 'mode')) { $table->text('mode')->nullable(); }
                if (! Schema::hasColumn('payment_gateways', 'visible')) { $table->boolean('visible')->nullable(); }
            });
        }
        if (Schema::hasTable('payroll')) {
            Schema::table('payroll', function (Blueprint $table) {
                if (! Schema::hasColumn('payroll', 'month')) { $table->integer('month')->nullable(); }
                if (! Schema::hasColumn('payroll', 'year')) { $table->integer('year')->nullable(); }
            });
        }
        if (Schema::hasTable('permission_catalog')) {
            Schema::table('permission_catalog', function (Blueprint $table) {
                if (! Schema::hasColumn('permission_catalog', 'group_label')) { $table->text('group_label')->nullable(); }
            });
        }
        if (Schema::hasTable('profiles')) {
            Schema::table('profiles', function (Blueprint $table) {
                if (! Schema::hasColumn('profiles', 'id_proof_name')) { $table->text('id_proof_name')->nullable(); }
                if (! Schema::hasColumn('profiles', 'id_proof_url')) { $table->text('id_proof_url')->nullable(); }
            });
        }
        if (Schema::hasTable('role_permission_grants')) {
            Schema::table('role_permission_grants', function (Blueprint $table) {
                if (! Schema::hasColumn('role_permission_grants', 'granted_at')) { $table->timestamp('granted_at')->nullable(); }
            });
        }
        if (Schema::hasTable('roles')) {
            Schema::table('roles', function (Blueprint $table) {
                if (! Schema::hasColumn('roles', 'created_by')) { $table->uuid('created_by')->nullable(); }
            });
        }
        if (Schema::hasTable('sales')) {
            Schema::table('sales', function (Blueprint $table) {
                if (! Schema::hasColumn('sales', 'additional_expenses')) { $table->json('additional_expenses')->nullable(); }
                if (! Schema::hasColumn('sales', 'assigned_to')) { $table->uuid('assigned_to')->nullable(); }
                if (! Schema::hasColumn('sales', 'due_amount')) { $table->decimal('due_amount', 14, 2)->nullable(); }
            });
        }
        if (Schema::hasTable('shipment_status_history')) {
            Schema::table('shipment_status_history', function (Blueprint $table) {
                if (! Schema::hasColumn('shipment_status_history', 'changed_by')) { $table->uuid('changed_by')->nullable(); }
            });
        }
        if (Schema::hasTable('shipments')) {
            Schema::table('shipments', function (Blueprint $table) {
                if (! Schema::hasColumn('shipments', 'courier')) { $table->text('courier')->nullable(); }
                if (! Schema::hasColumn('shipments', 'courier_label_url')) { $table->text('courier_label_url')->nullable(); }
                if (! Schema::hasColumn('shipments', 'courier_status')) { $table->text('courier_status')->nullable(); }
                if (! Schema::hasColumn('shipments', 'expected_delivery')) { $table->date('expected_delivery')->nullable(); }
            });
        }
        if (Schema::hasTable('sidebar_permission_audit')) {
            Schema::table('sidebar_permission_audit', function (Blueprint $table) {
                if (! Schema::hasColumn('sidebar_permission_audit', 'is_admin')) { $table->boolean('is_admin')->nullable(); }
                if (! Schema::hasColumn('sidebar_permission_audit', 'module_permissions')) { $table->json('module_permissions')->nullable(); }
                if (! Schema::hasColumn('sidebar_permission_audit', 'permission_keys')) { $table->json('permission_keys')->nullable(); }
                if (! Schema::hasColumn('sidebar_permission_audit', 'route')) { $table->text('route')->nullable(); }
                if (! Schema::hasColumn('sidebar_permission_audit', 'user_agent')) { $table->text('user_agent')->nullable(); }
            });
        }
        if (Schema::hasTable('sitemap_entries')) {
            Schema::table('sitemap_entries', function (Blueprint $table) {
                if (! Schema::hasColumn('sitemap_entries', 'notes')) { $table->text('notes')->nullable(); }
            });
        }
        if (Schema::hasTable('sms_plans')) {
            Schema::table('sms_plans', function (Blueprint $table) {
                if (! Schema::hasColumn('sms_plans', 'description')) { $table->text('description')->nullable(); }
                if (! Schema::hasColumn('sms_plans', 'validity_days')) { $table->integer('validity_days')->nullable(); }
            });
        }
        if (Schema::hasTable('sms_providers')) {
            Schema::table('sms_providers', function (Blueprint $table) {
                if (! Schema::hasColumn('sms_providers', 'api_key')) { $table->text('api_key')->nullable(); }
                if (! Schema::hasColumn('sms_providers', 'api_secret')) { $table->text('api_secret')->nullable(); }
                if (! Schema::hasColumn('sms_providers', 'base_url')) { $table->text('base_url')->nullable(); }
                if (! Schema::hasColumn('sms_providers', 'created_by')) { $table->uuid('created_by')->nullable(); }
                if (! Schema::hasColumn('sms_providers', 'gateway_type')) { $table->text('gateway_type')->nullable(); }
                if (! Schema::hasColumn('sms_providers', 'notes')) { $table->text('notes')->nullable(); }
                if (! Schema::hasColumn('sms_providers', 'sender_id')) { $table->text('sender_id')->nullable(); }
            });
        }
        if (Schema::hasTable('sms_purchases')) {
            Schema::table('sms_purchases', function (Blueprint $table) {
                if (! Schema::hasColumn('sms_purchases', 'notes')) { $table->text('notes')->nullable(); }
                if (! Schema::hasColumn('sms_purchases', 'payment_method')) { $table->text('payment_method')->nullable(); }
                if (! Schema::hasColumn('sms_purchases', 'purchased_at')) { $table->timestamp('purchased_at')->nullable(); }
                if (! Schema::hasColumn('sms_purchases', 'reference_no')) { $table->text('reference_no')->nullable(); }
            });
        }
        if (Schema::hasTable('stock_transfers')) {
            Schema::table('stock_transfers', function (Blueprint $table) {
                if (! Schema::hasColumn('stock_transfers', 'from_branch')) { $table->text('from_branch')->nullable(); }
                if (! Schema::hasColumn('stock_transfers', 'to_branch')) { $table->text('to_branch')->nullable(); }
            });
        }
        if (Schema::hasTable('suppliers')) {
            Schema::table('suppliers', function (Blueprint $table) {
                if (! Schema::hasColumn('suppliers', 'company')) { $table->text('company')->nullable(); }
            });
        }
        if (Schema::hasTable('tenant_backups')) {
            Schema::table('tenant_backups', function (Blueprint $table) {
                if (! Schema::hasColumn('tenant_backups', 'kind')) { $table->text('kind')->nullable(); }
            });
        }
        if (Schema::hasTable('tenant_notifications')) {
            Schema::table('tenant_notifications', function (Blueprint $table) {
                if (! Schema::hasColumn('tenant_notifications', 'error')) { $table->text('error')->nullable(); }
                if (! Schema::hasColumn('tenant_notifications', 'sent_by')) { $table->uuid('sent_by')->nullable(); }
                if (! Schema::hasColumn('tenant_notifications', 'status')) { $table->text('status')->nullable(); }
                if (! Schema::hasColumn('tenant_notifications', 'subject')) { $table->text('subject')->nullable(); }
            });
        }
        if (Schema::hasTable('tenant_payments')) {
            Schema::table('tenant_payments', function (Blueprint $table) {
                if (! Schema::hasColumn('tenant_payments', 'created_by')) { $table->uuid('created_by')->nullable(); }
                if (! Schema::hasColumn('tenant_payments', 'ends_on')) { $table->date('ends_on')->nullable(); }
                if (! Schema::hasColumn('tenant_payments', 'payer_name')) { $table->text('payer_name')->nullable(); }
                if (! Schema::hasColumn('tenant_payments', 'payer_phone')) { $table->text('payer_phone')->nullable(); }
                if (! Schema::hasColumn('tenant_payments', 'starts_on')) { $table->date('starts_on')->nullable(); }
            });
        }
        if (Schema::hasTable('tenants')) {
            Schema::table('tenants', function (Blueprint $table) {
                if (! Schema::hasColumn('tenants', 'company_name')) { $table->text('company_name')->nullable(); }
                if (! Schema::hasColumn('tenants', 'db_name')) { $table->text('db_name')->nullable(); }
                if (! Schema::hasColumn('tenants', 'last_login_at')) { $table->timestamp('last_login_at')->nullable(); }
            });
        }
        if (Schema::hasTable('transactions')) {
            Schema::table('transactions', function (Blueprint $table) {
                if (! Schema::hasColumn('transactions', 'credit')) { $table->decimal('credit', 14, 2)->nullable(); }
                if (! Schema::hasColumn('transactions', 'debit')) { $table->decimal('debit', 14, 2)->nullable(); }
                if (! Schema::hasColumn('transactions', 'journal_entry_id')) { $table->uuid('journal_entry_id')->nullable(); }
            });
        }
        if (Schema::hasTable('trial_reminders_log')) {
            Schema::table('trial_reminders_log', function (Blueprint $table) {
                if (! Schema::hasColumn('trial_reminders_log', 'days_marker')) { $table->integer('days_marker')->nullable(); }
            });
        }
        if (Schema::hasTable('warehouses')) {
            Schema::table('warehouses', function (Blueprint $table) {
                if (! Schema::hasColumn('warehouses', 'contact_person')) { $table->text('contact_person')->nullable(); }
            });
        }
        if (Schema::hasTable('warranties')) {
            Schema::table('warranties', function (Blueprint $table) {
                if (! Schema::hasColumn('warranties', 'description')) { $table->text('description')->nullable(); }
                if (! Schema::hasColumn('warranties', 'duration')) { $table->integer('duration')->nullable(); }
                if (! Schema::hasColumn('warranties', 'duration_type')) { $table->text('duration_type')->nullable(); }
                if (! Schema::hasColumn('warranties', 'is_active')) { $table->boolean('is_active')->nullable(); }
                if (! Schema::hasColumn('warranties', 'name')) { $table->text('name')->nullable(); }
            });
        }
        if (Schema::hasTable('warranty_claims')) {
            Schema::table('warranty_claims', function (Blueprint $table) {
                if (! Schema::hasColumn('warranty_claims', 'assigned_to')) { $table->uuid('assigned_to')->nullable(); }
                if (! Schema::hasColumn('warranty_claims', 'customer_id')) { $table->uuid('customer_id')->nullable(); }
                if (! Schema::hasColumn('warranty_claims', 'notes')) { $table->text('notes')->nullable(); }
                if (! Schema::hasColumn('warranty_claims', 'product_id')) { $table->uuid('product_id')->nullable(); }
                if (! Schema::hasColumn('warranty_claims', 'resolution')) { $table->text('resolution')->nullable(); }
                if (! Schema::hasColumn('warranty_claims', 'sale_id')) { $table->uuid('sale_id')->nullable(); }
            });
        }
    }

    public function down(): void
    {
        // Non-destructive alignment migration; no rollback.
    }

    private const RENAMES = [
        'accounts' => ['account_type' => 'type', 'current_balance' => 'balance'],
        'activity_log' => ['event' => 'action', 'properties' => 'details', 'subject_id' => 'entity_id', 'subject_type' => 'entity_type', 'causer_id' => 'user_id', 'log_name' => 'module'],
        'customer_groups' => ['price_group_id' => 'selling_price_group_id'],
        'customers' => ['opening_balance' => 'balance'],
        'employees' => ['basic_salary' => 'salary'],
        'exchange_purchases' => ['imei_serial' => 'imei', 'product_id' => 'linked_product_id', 'sale_id' => 'linked_sale_id', 'supplier_address' => 'seller_address', 'supplier_name' => 'seller_name', 'supplier_nid' => 'seller_nid_no', 'supplier_phone' => 'seller_phone', 'media_urls' => 'goods_photos', 'condition' => 'condition_notes'],
        'expense_payments' => ['payment_method' => 'method', 'notes' => 'note', 'payment_date' => 'paid_on'],
        'expenses' => ['amount' => 'total_amount', 'notes' => 'expense_note', 'warehouse_id' => 'location_id', 'supplier_id' => 'contact_id'],
        'installment_customers' => ['address' => 'permanent_address', 'guarantor_address' => 'guarantor_permanent_address', 'guarantor_phone' => 'guarantor_mobile'],
        'installment_sales' => ['interest_rate' => 'interest_percent', 'invoice_number' => 'invoice_no', 'tenure_months' => 'num_installments', 'start_date' => 'sale_date'],
        'installment_schedules' => ['amount_due' => 'amount', 'amount_paid' => 'paid_amount', 'installment_no' => 'serial_no'],
        'journal_entries' => ['reference_no' => 'reference'],
        'landing_reviews' => ['reviewer_name' => 'name', 'review_text' => 'text', 'reviewer_title' => 'role'],
        'payment_attempts' => ['request_payload' => 'raw_payload', 'reference' => 'gateway_ref'],
        'payment_gateways' => ['is_active' => 'active', 'name' => 'display_name'],
        'payroll' => ['paid_at' => 'paid_date'],
        'permission_catalog' => ['permission_key' => 'key'],
        'shipment_status_history' => ['remarks' => 'note'],
        'shipments' => ['consignment_id' => 'courier_consignment_id', 'provider' => 'courier_provider', 'provider_response' => 'courier_payload', 'tracking_id' => 'tracking_no', 'recipient_address' => 'shipping_address', 'recipient_city' => 'city', 'delivery_fee' => 'shipping_cost', 'special_instruction' => 'notes', 'picked_at' => 'shipped_at'],
        'sitemap_entries' => ['url' => 'path'],
        'sms_purchases' => ['amount_paid' => 'amount'],
        'stock_adjustments' => ['adjustment_type' => 'type', 'quantity' => 'quantity_change', 'created_by' => 'adjusted_by'],
        'suppliers' => ['opening_balance' => 'balance'],
        'tenant_actions_log' => ['payload' => 'details', 'actor_user_id' => 'performed_by'],
        'tenant_backups' => ['file_path' => 'storage_path'],
        'tenant_payments' => ['transaction_id' => 'payment_reference'],
        'transactions' => ['reference_no' => 'reference'],
        'trial_reminders_log' => ['recipient' => 'email', 'error_message' => 'error'],
    ];

}

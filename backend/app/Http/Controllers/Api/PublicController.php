<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Models\FaqEntry;
use App\Models\LandingFeature;
use App\Models\LandingReview;
use App\Models\SaasPackage;
use Illuminate\Http\Request;

/**
 * Unauthenticated endpoints used by the public landing page.
 * Only safe, read-only, tenant-agnostic data is exposed here.
 */
class PublicController extends Controller
{
    public function landingFeatures()
    {
        return LandingFeature::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();
    }

    public function landingReviews()
    {
        return LandingReview::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();
    }

    public function landingFaqs()
    {
        return FaqEntry::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();
    }

    public function landingPricing()
    {
        // `show_on_landing` was added later; legacy rows may be NULL/0 while still
        // being intended for display, so only an explicit `false` hides a package.
        return SaasPackage::query()
            ->where('is_active', true)
            ->where(fn ($q) => $q->where('show_on_landing', true)->orWhereNull('show_on_landing'))
            ->orderBy('sort_order')
            ->orderBy('price')
            ->get();
    }

    /**
     * All active packages — used by the public tenant registration page,
     * which has no auth token and therefore cannot read the REST resource.
     */
    public function packages()
    {
        return SaasPackage::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('price')
            ->get();
    }


    /** Gateways a tenant may choose at checkout — no credentials exposed. */
    public function paymentGateways()
    {
        return \App\Models\PaymentGateway::query()
            ->where('active', true)
            ->where('visible', true)
            ->orderBy('sort_order')
            ->get(['id', 'code', 'display_name', 'logo_url', 'instructions']);
    }

    public function landingCms(Request $request, string $key)
    {
        // Global rows only: tenant_id null. UI only reads CMS content this way.
        $row = BusinessSetting::query()
            ->whereNull('tenant_id')
            ->where('key', $key)
            ->first();
        return response()->json(['value' => $row?->value]);
    }
}

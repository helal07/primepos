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
        return SaasPackage::query()
            ->where('is_active', true)
            ->where('show_on_landing', true)
            ->orderBy('price')
            ->get();
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

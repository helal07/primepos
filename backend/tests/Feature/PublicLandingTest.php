<?php

namespace Tests\Feature;

use App\Models\BusinessSetting;
use App\Models\FaqEntry;
use App\Models\LandingFeature;
use App\Models\LandingReview;
use App\Models\SaasPackage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicLandingTest extends TestCase
{
    use RefreshDatabase;

    public function test_landing_features_returns_active_rows_only(): void
    {
        LandingFeature::create(['id' => (string) \Str::uuid(), 'title' => 'A', 'description' => '', 'icon' => '', 'sort_order' => 1, 'is_active' => true]);
        LandingFeature::create(['id' => (string) \Str::uuid(), 'title' => 'B', 'description' => '', 'icon' => '', 'sort_order' => 2, 'is_active' => false]);

        $res = $this->getJson('/api/public/landing/features')->assertOk()->json();
        $this->assertCount(1, $res);
        $this->assertSame('A', $res[0]['title']);
    }

    public function test_landing_cms_returns_global_value(): void
    {
        BusinessSetting::create([
            'id'        => (string) \Str::uuid(),
            'tenant_id' => null,
            'key'       => 'cms_branding',
            'value'     => ['primary' => '#0369a1'],
        ]);

        $this->getJson('/api/public/landing/cms/cms_branding')
            ->assertOk()
            ->assertJsonPath('value.primary', '#0369a1');
    }

    public function test_landing_cms_missing_key_returns_null(): void
    {
        $this->getJson('/api/public/landing/cms/__missing__')
            ->assertOk()
            ->assertJson(['value' => null]);
    }
}
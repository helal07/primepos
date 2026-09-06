<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Routing\Middleware\ThrottleRequests;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function setUp(): void
    {
        parent::setUp();

        // Production routes are rate limited; the shared limiter state would
        // otherwise leak between tests in the same process.
        $this->withoutMiddleware(ThrottleRequests::class);
    }
}
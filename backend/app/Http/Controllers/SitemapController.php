<?php

namespace App\Http\Controllers;

use App\Models\SitemapEntry;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    public function sitemap(): Response
    {
        $base = rtrim(config('app.url'), '/');
        $entries = SitemapEntry::query()->orderBy('updated_at', 'desc')->get();

        $xml  = '<?xml version="1.0" encoding="UTF-8"?>'.PHP_EOL;
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'.PHP_EOL;
        foreach ($entries as $e) {
            $loc  = htmlspecialchars($e->url ?? ($base . '/' . ltrim($e->path ?? '', '/')));
            $mod  = ($e->last_modified ?? $e->updated_at)?->toAtomString();
            $xml .= "  <url><loc>{$loc}</loc>";
            if ($mod) $xml .= "<lastmod>{$mod}</lastmod>";
            if ($e->priority) $xml .= "<priority>{$e->priority}</priority>";
            $xml .= "</url>".PHP_EOL;
        }
        $xml .= '</urlset>';
        return response($xml, 200, ['Content-Type' => 'application/xml']);
    }

    public function robots(): Response
    {
        $base = rtrim(config('app.url'), '/');
        $body = "User-agent: *\nAllow: /\nSitemap: {$base}/sitemap.xml\n";
        return response($body, 200, ['Content-Type' => 'text/plain']);
    }
}
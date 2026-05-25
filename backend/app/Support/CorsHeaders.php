<?php

namespace App\Support;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensures API error responses (4xx/5xx) still carry CORS headers so browsers
 * surface the real status instead of a generic CORS failure.
 */
class CorsHeaders
{
    public static function apply(Request $request, Response $response): Response
    {
        $origin = $request->headers->get('Origin');

        if (! $origin || ! self::isOriginAllowed($origin)) {
            return $response;
        }

        $response->headers->set('Access-Control-Allow-Origin', $origin);
        $response->headers->set('Vary', 'Origin', false);

        if (config('cors.supports_credentials', false)) {
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
        }

        $requestedHeaders = $request->headers->get('Access-Control-Request-Headers');
        if ($requestedHeaders) {
            $response->headers->set('Access-Control-Allow-Headers', $requestedHeaders);
        }

        return $response;
    }

    public static function isOriginAllowed(string $origin): bool
    {
        foreach (config('cors.allowed_origins', []) as $allowed) {
            if ($allowed === $origin) {
                return true;
            }
        }

        foreach (config('cors.allowed_origins_patterns', []) as $pattern) {
            if (@preg_match($pattern, $origin) === 1) {
                return true;
            }
        }

        return false;
    }
}

<?php

$frontend = env('FRONTEND_URL');

$extraOrigins = array_filter(array_map(
    'trim',
    explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')),
));

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_unique(array_filter(array_merge(
        [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:8000',
            'https://admin.libra.school',
            'https://libra.school',
        ],
        $frontend ? [$frontend] : [],
        $extraOrigins,
    )))),

    'allowed_origins_patterns' => [
        '/^https:\/\/.*\.libra\.school$/',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 7200,

    // Bearer tokens only (no cookie credentials from the SPA).
    'supports_credentials' => false,
];

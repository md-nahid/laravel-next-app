<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | These paths are exposed to the Next.js SPA. Sanctum's CSRF cookie
    | endpoint and the Fortify auth endpoints (login, logout, register,
    | password reset) live outside `/api`, so they are listed explicitly.
    |
    */

    'paths' => [
        'api/*',
        'broadcasting/auth',
        'sanctum/csrf-cookie',
        'login',
        'logout',
        'register',
        'forgot-password',
        'reset-password',
        'email/verification-notification',
        'verify-email/*',
        'user/profile-information',
        'user/password',
        'user/confirm-password',
        'user/confirmed-password-status',
        'user/confirmed-two-factor-authentication',
        'user/two-factor-authentication',
        'user/two-factor-qr-code',
        'user/two-factor-recovery-codes',
        'user/two-factor-secret-key',
        'two-factor-challenge',
    ],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(explode(',', (string) env('FRONTEND_URL', 'http://localhost:3000'))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];

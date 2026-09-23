#!/bin/sh
set -e

cd /var/www/html

if [ ! -f .env ]; then
    cp .env.example .env
fi

if ! grep -q '^APP_KEY=base64:' .env; then
    php artisan key:generate --force --no-ansi
fi

composer install --no-interaction --prefer-dist --optimize-autoloader

chmod -R ug+rwx storage bootstrap/cache 2>/dev/null || true

php artisan config:clear --no-ansi
php artisan migrate --force --no-ansi

exec "$@"

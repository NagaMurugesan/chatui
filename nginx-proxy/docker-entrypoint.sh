#!/bin/sh
set -e

# Substitute environment variables in nginx config
envsubst '${DOMAIN} ${SSL_CERT_PATH} ${SSL_KEY_PATH}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Execute the main command
exec "$@"

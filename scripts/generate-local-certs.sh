#!/bin/bash
set -e

echo "Generating self-signed SSL certificates for local development..."

# Create certs directory
mkdir -p certs

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/localhost.key \
  -out certs/localhost.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "✅ SSL certificates generated successfully!"
echo "Certificate: certs/localhost.crt"
echo "Private Key: certs/localhost.key"
echo ""
echo "Note: These are self-signed certificates. Your browser will show a security warning."
echo "To trust the certificate in your browser, you'll need to add it to your system's trusted certificates."

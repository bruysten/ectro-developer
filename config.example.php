<?php
// Example only. scripts/prepare.php generates config.local.php with a unique encryption key.
return [
    'environment' => 'production',
    'key' => 'BASE64_OF_32_RANDOM_BYTES',
    'setup_token' => 'YOUR_RANDOM_TOKEN_WITH_AT_LEAST_32_CHARACTERS',
    'db_allowed_hosts' => ['localhost', '127.0.0.1'],
    // Hetzner database hosts use the bundled provider CA automatically. Optional override:
    'mysql_hetzner_tls_ca' => __DIR__ . '/app/certs/hetzner-mysql-ca.pem',
    'mysql_tls_ca' => '/etc/ssl/certs/ca-certificates.crt',
];

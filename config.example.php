<?php
// Example only. scripts/prepare.php generates config.local.php with a unique encryption key.
return [
    'environment' => 'production',
    'key' => 'BASE64_OF_32_RANDOM_BYTES',
    'setup_token' => 'YOUR_RANDOM_TOKEN_WITH_AT_LEAST_32_CHARACTERS',
    'db_allowed_hosts' => ['localhost', '127.0.0.1'],
    'mysql_tls_ca' => '/etc/ssl/certs/ca-certificates.crt',
];

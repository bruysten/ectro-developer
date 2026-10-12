#!/usr/bin/env bash
# Called remotely by the GitHub workflow. No packages, daemon or dependency installation.
set -euo pipefail
base=$1
revision=$2
[[ $base =~ ^/[a-zA-Z0-9_./-]+$ ]] || { echo 'Invalid deployment path' >&2; exit 1; }
[[ $revision =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid revision' >&2; exit 1; }
release="$base/releases/$revision"
mkdir -p "$base/shared/var"
chmod 700 "$base/shared" "$base/shared/var"
printf '%s\n' 'Require all denied' > "$base/.htaccess"
printf '%s\n' 'Require all denied' > "$base/shared/.htaccess"
printf '%s\n' 'Require all denied' > "$release/.htaccess"
ln -sfn "$base/shared/var" "$release/var"
ln -sfn "$base/shared/config.local.php" "$release/config.local.php"
php "$release/scripts/prepare.php" --stdin
python3 "$release/scripts/preflight.py"
ln -sfn "$release" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
echo 'Release activated.'

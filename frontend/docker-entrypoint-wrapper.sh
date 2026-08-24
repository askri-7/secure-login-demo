#!/bin/sh
set -e
( while :; do sleep 6h; nginx -s reload 2>/dev/null || true; done ) &
exec /docker-entrypoint.sh "$@"
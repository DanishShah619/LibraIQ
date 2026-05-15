#!/bin/sh
set -e

if [ "$SKIP_PRISMA_MIGRATE" != "1" ]; then
  node node_modules/prisma/build/index.js migrate deploy
fi

exec "$@"

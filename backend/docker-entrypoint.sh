#!/bin/sh
set -e

if [ "$SKIP_PRISMA_MIGRATE" != "1" ]; then
  node node_modules/prisma/build/index.js migrate deploy
fi

if [ "$SKIP_PRISMA_SEED" != "1" ]; then
  if [ -n "$SEED_ADMIN_EMAIL" ] && [ -n "$SEED_ADMIN_PASSWORD" ] && [ -n "$SEED_LIBRARIAN_EMAIL" ] && [ -n "$SEED_LIBRARIAN_PASSWORD" ]; then
    node prisma/seed.js
  else
    echo "Skipping seed: set SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_LIBRARIAN_EMAIL, and SEED_LIBRARIAN_PASSWORD to enable automatic seeding."
  fi
fi

exec "$@"

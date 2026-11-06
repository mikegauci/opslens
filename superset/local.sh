#!/usr/bin/env bash
set -euo pipefail
# Invoke from repository root. State and secrets never enter the checkout.
export SUPERSET_HOME=/tmp/opslens-superset
mkdir -p "$SUPERSET_HOME"
chmod 700 "$SUPERSET_HOME"
if [[ ! -f "$SUPERSET_HOME/secret" ]]; then
  /tmp/opslens-superset-venv/bin/python -c 'import secrets; print(secrets.token_hex(32))' > "$SUPERSET_HOME/secret"
  chmod 600 "$SUPERSET_HOME/secret"
fi
export SUPERSET_SECRET_KEY
SUPERSET_SECRET_KEY=$(cat "$SUPERSET_HOME/secret")
export SUPERSET_CONFIG_PATH="$PWD/superset/superset_config.py"
export FLASK_APP=superset
exec /tmp/opslens-superset-venv/bin/"$@"

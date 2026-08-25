#!/bin/sh
# Writes /usr/share/nginx/html/deployment-config.json from this instance's OPERATOR_NAME /
# OPERATOR_CONTACT environment variables before starting nginx.
#
# PostyFox ships as a single prebuilt image shared across every deployment (see
# docs/DEPLOYMENT.md), so operator-specific details can't be baked in at build time. Instead they
# are injected here, at container startup, into a static JSON asset that the SPA fetches once on
# load (see DeploymentConfigService). Leave both unset to fall back to the generic
# [Operator] / [contact address] placeholders in the privacy policy.
set -eu

CONFIG_FILE=/usr/share/nginx/html/deployment-config.json

# Minimal JSON string escaping: backslash and double-quote.
json_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

OPERATOR_NAME_ESCAPED=$(json_escape "${OPERATOR_NAME:-}")
OPERATOR_CONTACT_ESCAPED=$(json_escape "${OPERATOR_CONTACT:-}")

cat > "$CONFIG_FILE" <<EOF
{
  "operatorName": "$OPERATOR_NAME_ESCAPED",
  "operatorContact": "$OPERATOR_CONTACT_ESCAPED"
}
EOF

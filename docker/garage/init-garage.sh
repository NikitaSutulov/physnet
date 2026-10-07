#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${GARAGE_CONTAINER:-physnet-garage}"
BUCKET_NAME="${GARAGE_BUCKET:-physnet}"
KEY_NAME="${GARAGE_KEY:-physnet_key}"

echo "==> Waiting for Garage container '$CONTAINER_NAME' to become responsive..."
until docker exec "$CONTAINER_NAME" /garage -c /etc/garage.toml status > /dev/null 2>&1; do
  sleep 1
done

echo "==> Fetching node ID..."
NODE_ID=$(docker exec "$CONTAINER_NAME" /garage -c /etc/garage.toml node id -q | cut -d'@' -f1 | tr -d '\r\n')

if [ -z "$NODE_ID" ]; then
  echo "Error: Could not retrieve Garage node ID."
  exit 1
fi

echo "Found Garage Node ID: $NODE_ID"

# Check if role is assigned or staged
LAYOUT_SHOW=$(docker exec "$CONTAINER_NAME" /garage -c /etc/garage.toml layout show 2>/dev/null || true)

if echo "$LAYOUT_SHOW" | grep -qi "No nodes currently have a role"; then
  echo "==> Assigning node role and capacity (dc1, 10G)..."
  docker exec "$CONTAINER_NAME" /garage -c /etc/garage.toml layout assign -z dc1 -c 10G "$NODE_ID"

  echo "==> Applying layout version 1..."
  docker exec "$CONTAINER_NAME" /garage -c /etc/garage.toml layout apply --version 1
elif echo "$LAYOUT_SHOW" | grep -qi "STAGED ROLE CHANGES"; then
  CURRENT_VERSION=$(echo "$LAYOUT_SHOW" | grep "Current cluster layout version" | awk '{print $NF}')
  NEXT_VERSION=$((CURRENT_VERSION + 1))
  echo "==> Applying staged layout version $NEXT_VERSION..."
  docker exec "$CONTAINER_NAME" /garage -c /etc/garage.toml layout apply --version "$NEXT_VERSION"
else
  echo "==> Cluster layout is already configured."
fi

# Create access key if not exists
if docker exec "$CONTAINER_NAME" /garage -c /etc/garage.toml key list | grep -q "$KEY_NAME"; then
  echo "==> Access key '$KEY_NAME' already exists."
else
  echo "==> Creating access key '$KEY_NAME'..."
  docker exec "$CONTAINER_NAME" /garage -c /etc/garage.toml key create "$KEY_NAME"
fi

# Create bucket if not exists
if docker exec "$CONTAINER_NAME" /garage -c /etc/garage.toml bucket list | grep -q "$BUCKET_NAME"; then
  echo "==> Bucket '$BUCKET_NAME' already exists."
else
  echo "==> Creating bucket '$BUCKET_NAME'..."
  docker exec "$CONTAINER_NAME" /garage -c /etc/garage.toml bucket create "$BUCKET_NAME"
fi

# Grant permissions
echo "==> Ensuring permissions for '$KEY_NAME' on '$BUCKET_NAME'..."
docker exec "$CONTAINER_NAME" /garage -c /etc/garage.toml bucket allow --read --write "$BUCKET_NAME" --key "$KEY_NAME" > /dev/null 2>&1 || true

echo "==> Garage initialization complete!"
echo "==> Access key info:"
docker exec "$CONTAINER_NAME" /garage -c /etc/garage.toml key info --show-secret "$KEY_NAME"

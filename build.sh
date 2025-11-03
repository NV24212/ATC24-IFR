#!/bin/sh
set -e

# 1. Prepare the output directory
rm -rf dist
mkdir -p dist

# 2. Copy all frontend files to the dist directory
cp -r frontend/* dist/

# 3. Replace the placeholder with the environment variable
#    - Use the environment variable SERVER_MAINTENANCE, or "false" if it's not set.
#    - The `|` is used as a separator for sed to avoid conflicts with URL slashes.
sed -i "s|__SERVER_MAINTENANCE__|${SERVER_MAINTENANCE:-"false"}|g" dist/index.js

# 4. (Optional) Output a confirmation message
echo "Build complete. Maintenance mode is set to: ${SERVER_MAINTENANCE:-"false"}"

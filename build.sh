#!/bin/bash
# Build script for Sanitize It
# Produces dist/chrome/ and dist/firefox/ with browser-specific manifests
# Version is read from the root manifest.json (single source of truth)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
SHARED_FILES="background.js icon16.png icon48.png icon128.png"

# Read version from root manifest.json
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$SCRIPT_DIR/manifest.json")
echo "Building Sanitize It v${VERSION}..."

# Clean previous builds
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR/chrome" "$DIST_DIR/firefox"

# Copy shared files to both targets
for file in $SHARED_FILES; do
  cp "$SCRIPT_DIR/$file" "$DIST_DIR/chrome/$file"
  cp "$SCRIPT_DIR/$file" "$DIST_DIR/firefox/$file"
done

# Chrome manifest: service_worker, no gecko settings
cat > "$DIST_DIR/chrome/manifest.json" << EOF
{
  "manifest_version": 3,
  "name": "Sanitize It",
  "version": "${VERSION}",
  "description": "Remove tracking information from the current page and automatically copy the URL to your clipboard.",
  "permissions": [
    "activeTab",
    "scripting",
    "clipboardWrite",
    "tabs"
  ],
  "action": {
    "default_icon": {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  },
  "commands": {
    "sanitize-copy": {
      "suggested_key": {
        "default": "Alt+Shift+X"
      },
      "description": "Sanitize URL and copy to clipboard"
    },
    "sanitize-refresh": {
      "suggested_key": {
        "default": "Alt+Shift+R"
      },
      "description": "Sanitize URL, copy to clipboard, and refresh"
    }
  }
}
EOF

# Firefox manifest: scripts array, gecko settings
cat > "$DIST_DIR/firefox/manifest.json" << EOF
{
  "manifest_version": 3,
  "name": "Sanitize It",
  "version": "${VERSION}",
  "description": "Remove tracking information from the current page and automatically copy the URL to your clipboard.",
  "permissions": [
    "activeTab",
    "scripting",
    "clipboardWrite",
    "tabs"
  ],
  "action": {
    "default_icon": {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png"
    }
  },
  "background": {
    "scripts": ["background.js"]
  },
  "icons": {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  },
  "commands": {
    "sanitize-copy": {
      "suggested_key": {
        "default": "Alt+Shift+X"
      },
      "description": "Sanitize URL and copy to clipboard"
    },
    "sanitize-refresh": {
      "suggested_key": {
        "default": "Alt+Shift+R"
      },
      "description": "Sanitize URL, copy to clipboard, and refresh"
    }
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "sanitize-it@sethcottle.com",
      "strict_min_version": "121.0"
    }
  }
}
EOF

echo "Build complete (v${VERSION}):"
echo "  Chrome:  $DIST_DIR/chrome/"
echo "  Firefox: $DIST_DIR/firefox/"

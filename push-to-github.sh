#!/bin/bash
# Run this script to push the inventory system to GitHub
# Usage: ./push-to-github.sh [your-github-username]
# Or: ./push-to-github.sh https://github.com/username/inventory-system-backend.git

set -e
cd "$(dirname "$0")"

# Remove script from what we'll commit
SCRIPT_NAME="push-to-github.sh"

# Initialize git if needed
if [ ! -d .git ]; then
  echo "Initializing git repository..."
  git init
fi

# Add all files (respects .gitignore)
echo "Adding files..."
git add -A
git reset -- "$SCRIPT_NAME" 2>/dev/null || true

# Show what will be committed
echo ""
echo "Files to be committed:"
git status

# Create initial commit
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo ""
  echo "Creating initial commit..."
  git commit -m "Initial commit: Inventory system with products, orders, logs, user groups"
else
  echo ""
  echo "Creating commit with any changes..."
  git add -A
  git reset -- "$SCRIPT_NAME" 2>/dev/null || true
  if git diff --cached --quiet; then
    echo "No changes to commit."
  else
    git commit -m "Update inventory system"
  fi
fi

# Add remote and push
if [ -n "$1" ]; then
  REPO="$1"
  # If just username given, construct URL
  if [[ ! "$REPO" =~ ^https?:// ]] && [[ ! "$REPO" =~ ^git@ ]]; then
    REPO="https://github.com/${REPO}/inventory-system-backend.git"
  fi
  
  echo ""
  echo "Adding remote origin: $REPO"
  git remote remove origin 2>/dev/null || true
  git remote add origin "$REPO"
  
  echo "Pushing to GitHub..."
  git branch -M main
  git push -u origin main
  
  echo ""
  echo "Done! Your code is on GitHub."
else
  echo ""
  echo "To push to GitHub:"
  echo "  1. Create a new repository at https://github.com/new (name it 'inventory-system-backend')"
  echo "  2. Run: ./push-to-github.sh https://github.com/YOUR_USERNAME/inventory-system-backend.git"
  echo "  Or:   ./push-to-github.sh YOUR_USERNAME"
fi

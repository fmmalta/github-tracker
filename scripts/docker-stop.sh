#!/bin/bash

# GitHub Tracker Docker Stop Script

set -e

echo "🛑 Stopping Docker services..."
docker compose down

echo ""
echo "✅ Docker services stopped."
echo ""
echo "To remove data volumes as well, run:"
echo "  npm run docker:clean"
echo ""

#!/bin/bash
set -e

echo "🚀 Deploying Hermes Mira Clone..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Build TypeScript
echo "🔨 Building TypeScript..."
pnpm build

# Create logs directory
mkdir -p logs

# Copy systemd service
echo "📋 Setting up systemd service..."
sudo cp deploy/systemd/hermes-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable hermes-bot

# Restart service
echo "🔄 Restarting service..."
sudo systemctl restart hermes-bot

# Check status
echo "✅ Deployment complete!"
echo ""
echo "Service status:"
sudo systemctl status hermes-bot --no-pager

echo ""
echo "View logs:"
echo "  tail -f logs/bot.log"
echo ""
echo "Metrics available at: http://localhost:9090/metrics"

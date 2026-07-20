#!/bin/bash
set -e

echo "📥 Pulling latest changes from GitHub..."
git pull origin main

echo "📦 Installing any new dependencies..."
npm install

echo "⚙️ Building React application..."
npm run build

echo "🔄 Restarting backend process in PM2..."
pm2 restart odoo-backend

echo "✅ Update complete!"

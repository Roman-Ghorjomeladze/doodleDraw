#!/bin/bash
set -e

echo "=== DoodleDraw Server Setup ==="

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
echo "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
echo "Installing pnpm..."
sudo npm install -g pnpm

# Install PM2
echo "Installing PM2..."
sudo npm install -g pm2

# Install nginx
echo "Installing nginx..."
sudo apt install -y nginx

# Install certbot for SSL
echo "Installing certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Create app directory
echo "Setting up app directory..."
sudo mkdir -p /opt/doodledraw
sudo chown $USER:$USER /opt/doodledraw

# Copy nginx config
echo "Configuring nginx..."
sudo cp /opt/doodledraw/deploy/nginx.conf /etc/nginx/sites-available/doodledraw
sudo ln -sf /etc/nginx/sites-available/doodledraw /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Upload your code to /opt/doodledraw"
echo "2. Run: cd /opt/doodledraw && bash deploy/deploy.sh"
echo "3. Point your domain DNS A record to this server's IP"
echo "4. Run SSL setup: sudo certbot --nginx -d doodledraw.games -d www.doodledraw.games"
echo "5. Set up PM2 startup: pm2 startup && pm2 save"

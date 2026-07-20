#!/bin/bash
set -e
echo "Actualizando paquetes..."
apt update

echo "Instalando Node.js y dependencias..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx unzip
npm install -g pm2

echo "Descomprimiendo la aplicacion..."
mkdir -p /var/www/aprobaciones
unzip -o /root/app.zip -d /var/www/aprobaciones

echo "Instalando dependencias de Node.js y construyendo React..."
cd /var/www/aprobaciones
npm install
npm run build

echo "Configurando PM2..."
pm2 delete odoo-backend || true
pm2 start "npx tsx server.ts" --name "odoo-backend"
pm2 save
pm2 startup | tail -n 1 | bash || true

echo "Configurando Nginx..."
cat << 'NGINX_EOF' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/aprobaciones/dist;
    index index.html;

    server_name _;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_EOF

systemctl restart nginx

echo "====================================="
echo "DEPLOYYMENT EXITOSO"
echo "====================================="

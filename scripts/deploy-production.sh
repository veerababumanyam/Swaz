#!/bin/bash

# Swaz Data Recovery Labs - Production Deployment Script
# ===================================================================
# This script builds and prepares the application for production deployment
# Usage: ./scripts/deploy-production.sh

set -e  # Exit on any error

echo "🚀 Starting Swaz Data Recovery Labs Production Deployment..."
echo "================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "vite.config.ts" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Installing dependencies..."
npm install

print_status "Building production version..."
npm run build

print_status "Verifying production build..."
if [ ! -d "dist" ]; then
    print_error "Production build failed - dist directory not found"
    exit 1
fi

# Check if key files exist in dist
required_files=("dist/index.html" "dist/assets" "dist/sql-wasm.wasm")
for file in "${required_files[@]}"; do
    if [ ! -e "$file" ]; then
        print_error "Required file missing: $file"
        exit 1
    fi
done

print_success "Production build completed successfully!"

# Check if PM2 is available for process management
if command -v pm2 &> /dev/null; then
    print_status "PM2 detected. Setting up process management..."

    # Create PM2 ecosystem file if it doesn't exist
    if [ ! -f "ecosystem.config.js" ]; then
        print_status "Creating PM2 ecosystem configuration..."
        cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'swaz-data-recovery',
    script: 'server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    }
  }]
};
EOF
        print_success "PM2 ecosystem configuration created"
    fi
else
    print_warning "PM2 not found. Install PM2 for production process management: npm install -g pm2"
fi

print_status "Production deployment preparation complete!"
echo ""
echo "================================================================="
echo "📋 Deployment Instructions:"
echo ""
echo "1. Upload the entire project to your web server"
echo "2. Run the server setup script: ./scripts/server-setup.sh"
echo "3. Set environment variables on your server:"
echo "   GEMINI_API_KEY=AIzaSyCbyGCWlBo7FgN2bshNhWi8PHOmK1484qE"
echo ""
echo "4. The setup script will:"
echo "   - Install Node.js dependencies"
echo "   - Build the React application"
echo "   - Configure nginx properly"
echo "   - Start the signaling server with PM2"
echo ""
echo "🌐 Your app will be available at your domain root"
echo "================================================================="

print_success "Production deployment package ready!"
print_success "Total size: $(du -sh dist/ | cut -f1)"

# Create server setup script
print_status "Creating server setup script..."
cat > scripts/server-setup.sh << 'EOF'
#!/bin/bash

# Swaz Data Recovery Labs - Server Setup Script
# This script configures the production server after uploading files

set -e

echo "🚀 Setting up Swaz Data Recovery Labs Production Server..."
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "scripts/deploy-production.sh" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Update package repositories
print_status "Updating package repositories..."
sudo apt update

# Install Node.js 18+ if not installed
if ! command -v node &> /dev/null || ! node -e "console.log('Node.js version:', process.version)" | grep -q "v18\|v20"; then
    print_status "Installing Node.js 18+..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2 globally..."
    sudo npm install -g pm2
fi

# Install nginx if not installed
if ! command -v nginx &> /dev/null; then
    print_status "Installing nginx..."
    sudo apt install -y nginx
fi

# Install project dependencies
print_status "Installing project dependencies..."
npm install

# Install server dependencies
print_status "Installing server dependencies..."
cd server && npm install && cd ..

# Build the React application
print_status "Building React application..."
npm run build

# Create web root directory
print_status "Creating web root directory..."
sudo mkdir -p /var/www/swaz-data-recovery

# Copy built files to web root
print_status "Copying application files to web root..."
sudo cp -r dist/* /var/www/swaz-data-recovery/

# Copy nginx configuration
print_status "Installing nginx configuration..."
sudo cp config/nginx/swaz-data-recovery.conf /etc/nginx/sites-available/

# Remove default nginx site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    print_status "Removing default nginx site..."
    sudo rm /etc/nginx/sites-enabled/default
fi

# Enable our site
print_status "Enabling Swaz Data Recovery site..."
sudo ln -sf /etc/nginx/sites-available/swaz-data-recovery.conf /etc/nginx/sites-enabled/

# Test nginx configuration
print_status "Testing nginx configuration..."
sudo nginx -t

# Reload nginx
print_status "Reloading nginx..."
sudo systemctl reload nginx

# Start the signaling server with PM2
print_status "Starting signaling server with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
print_status "Saving PM2 configuration..."
pm2 save

# Set up PM2 to start on boot
print_status "Setting up PM2 to start on boot..."
pm2 startup

# Enable nginx to start on boot
print_status "Enabling nginx to start on boot..."
sudo systemctl enable nginx

# Create log directories
print_status "Creating log directories..."
sudo mkdir -p /var/log/nginx
sudo mkdir -p /var/log/pm2

print_success "Server setup completed!"
echo ""
echo "================================================================="
echo "✅ Server Status:"
echo ""
echo "🌐 Nginx: $(sudo systemctl is-active nginx)"
echo "🔗 Signaling Server: $(pm2 jlist | grep -c 'online')"
echo ""
echo "📋 Access your application at:"
echo "   http://your-domain.com"
echo ""
echo "📋 Check services:"
echo "   sudo systemctl status nginx"
echo "   pm2 status"
echo "   pm2 logs swaz-data-recovery"
echo ""
echo "📋 View logs:"
echo "   sudo tail -f /var/log/nginx/swaz-data-recovery_access.log"
echo "   sudo tail -f /var/log/nginx/swaz-data-recovery_error.log"
echo "================================================================="

print_success "Swaz Data Recovery Labs is now running in production!"
EOF

sudo chmod +x scripts/server-setup.sh
print_success "Server setup script created at scripts/server-setup.sh"

#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎮 Starting Wavelength Game Server Setup...${NC}"

# Kill any existing processes
echo -e "${YELLOW}Stopping any existing processes...${NC}"
pkill -f "node server.cjs" 2>/dev/null || true
pkill -f "ngrok" 2>/dev/null || true
sleep 2

# Start the game server in background
echo -e "${YELLOW}Starting game server on port 3001...${NC}"
node server.cjs &
SERVER_PID=$!
sleep 3

# Start ngrok in background and capture output
echo -e "${YELLOW}Starting ngrok tunnel...${NC}"
ngrok http 3001 --log stdout > ngrok.log &
NGROK_PID=$!

# Wait for ngrok to start and get URL
echo -e "${YELLOW}Waiting for ngrok to initialize...${NC}"
sleep 5

# Extract ngrok URL from API
NGROK_URL=""
for i in {1..10}; do
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null)
    if [[ "$NGROK_URL" != "null" && "$NGROK_URL" != "" ]]; then
        break
    fi
    echo -e "${YELLOW}Attempt $i: Waiting for ngrok...${NC}"
    sleep 2
done

if [[ "$NGROK_URL" == "null" || "$NGROK_URL" == "" ]]; then
    echo -e "${RED}❌ Failed to get ngrok URL. Check if ngrok is properly configured.${NC}"
    kill $SERVER_PID $NGROK_PID 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✅ Ngrok URL: $NGROK_URL${NC}"

# Update config file
echo -e "${YELLOW}Updating config file...${NC}"
cat > src/config.ts << EOF
// Configuration for different environments
export const config = {
  serverUrl: import.meta.env.PROD 
    ? '$NGROK_URL'
    : 'http://localhost:3001',
  
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
EOF

echo -e "${GREEN}✅ Config updated with new ngrok URL${NC}"

# Build the website
echo -e "${YELLOW}Building website...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    kill $SERVER_PID $NGROK_PID 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✅ Website built successfully${NC}"

# Get timestamp for deployment tracking
DEPLOY_TIME=$(date '+%Y-%m-%d %H:%M:%S')
DEPLOY_TIME_UTC=$(date -u '+%Y-%m-%d %H:%M:%S UTC')

# Commit and push to git
echo -e "${YELLOW}Committing changes to git...${NC}"
git add .
git commit -m "Update server URL to: $NGROK_URL" || echo "No changes to commit"
git push || echo "Push failed - check git setup"
echo -e "${GREEN}✅ Changes pushed to git at $DEPLOY_TIME${NC}"

# Deploy to Netlify (git-based deployment)
echo -e "${YELLOW}Deploying to Netlify...${NC}"
if command -v netlify &> /dev/null; then
    netlify deploy --prod --dir=dist --site=danklength
    echo -e "${GREEN}✅ Deployed to Netlify automatically via CLI${NC}"
else
    echo -e "${GREEN}✅ Netlify will auto-deploy from git push${NC}"
    echo -e "${BLUE}📡 Check deployment status: https://app.netlify.com/sites/danklength/deploys${NC}"
    echo -e "${BLUE}   Expected deploy time: $DEPLOY_TIME_UTC${NC}"
    echo -e "${BLUE}   Deployment usually takes 1-2 minutes${NC}"
fi

# Success message
echo -e "${GREEN}"
echo "🎉 Setup Complete!"
echo "================================"
echo "🌐 Website: https://danklength.netlify.app"
echo "🔗 Ngrok URL: $NGROK_URL"
echo "🖥️  Local Server: http://localhost:3001"
echo "📊 Ngrok Dashboard: http://localhost:4040"
echo ""
echo "⏰ Deploy triggered at: $DEPLOY_TIME_UTC"
echo "📡 Check deploy status: https://app.netlify.com/sites/danklength/deploys"
echo ""
echo "🎮 Your friends can now play at: https://danklength.netlify.app"
echo "   The website will connect to your local server!"
echo ""
echo "⚠️  IMPORTANT: ngrok free tier shows a browser warning"
echo "   Players need to click 'Visit Site' on the first connection"
echo "   This only happens once per session"
echo ""
echo "🔧 Troubleshooting:"
echo "   - Test server: curl $NGROK_URL/health"
echo "   - If connection fails, wait 1-2 minutes after deployment"
echo ""
echo "Press Ctrl+C to stop all services"
echo "================================"
echo -e "${NC}"

# Keep script running and monitor processes
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    kill $SERVER_PID $NGROK_PID 2>/dev/null || true
    rm -f ngrok.log
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep the script running
while true; do
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo -e "${RED}❌ Server process died. Restarting...${NC}"
        node server.cjs &
        SERVER_PID=$!
    fi
    
    if ! kill -0 $NGROK_PID 2>/dev/null; then
        echo -e "${RED}❌ Ngrok process died. Please restart the script.${NC}"
        break
    fi
    
    sleep 10
done

cleanup
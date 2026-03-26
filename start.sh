#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# JobPilot AI — Start Script
# Usage: ./start.sh [dev|prod|docker]
# ─────────────────────────────────────────────────────────────────────────────
set -e

MODE=${1:-dev}
GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'

banner() {
  echo -e "${CYAN}"
  echo "  ╔═══════════════════════════════════╗"
  echo "  ║   🚀  JobPilot AI  v1.0.0         ║"
  echo "  ║   Autonomous Job Landing Platform  ║"
  echo "  ╚═══════════════════════════════════╝"
  echo -e "${NC}"
}

banner

case $MODE in
  dev)
    echo -e "${GREEN}▶ Starting in DEVELOPMENT mode${NC}"
    echo ""

    # Setup backend .env if not exists
    if [ ! -f backend/.env ]; then
      echo -e "${YELLOW}⚠  Creating backend/.env from example…${NC}"
      cp backend/.env.example backend/.env
      echo -e "${YELLOW}   → Edit backend/.env and add your ANTHROPIC_API_KEY${NC}"
      echo ""
    fi

    # Install deps
    echo "📦 Installing backend dependencies…"
    cd backend && npm install --silent 2>&1 | tail -2
    cd ..
    echo "📦 Installing frontend dependencies…"
    cd frontend && npm install --silent 2>&1 | tail -2
    cd ..

    echo ""
    echo -e "${GREEN}✅ Ready! Starting services…${NC}"
    echo -e "   Backend:  ${CYAN}http://localhost:4000${NC}"
    echo -e "   Frontend: ${CYAN}http://localhost:3000${NC}"
    echo -e "   Demo login: demo@jobpilot.ai / demo1234"
    echo ""

    # Start both concurrently
    (cd backend && node src/server.js) &
    BACKEND_PID=$!
    sleep 2
    (cd frontend && npx vite --port 3000 2>/dev/null || npx serve dist -p 3000) &
    FRONTEND_PID=$!

    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
    wait
    ;;

  prod)
    echo -e "${GREEN}▶ Starting in PRODUCTION mode${NC}"
    cd frontend && npm run build
    cd ../backend && NODE_ENV=production node src/server.js
    ;;

  docker)
    echo -e "${GREEN}▶ Starting with Docker Compose${NC}"
    if [ ! -f backend/.env ]; then
      cp backend/.env.example backend/.env
      echo -e "${YELLOW}⚠  Edit backend/.env then re-run: ./start.sh docker${NC}"
      exit 1
    fi
    docker compose up --build
    ;;

  *)
    echo "Usage: ./start.sh [dev|prod|docker]"
    exit 1
    ;;
esac

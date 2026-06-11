#!/bin/bash
# e2e-test.sh — Run AgentTrail E2E compliance tests with real API keys
# Usage: ./e2e-test.sh [--verbose]
#
# Requires GROQ_API_KEY in .env (or exported as env var).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}🧪 AgentTrail E2E Compliance Tests${NC}"
echo "=================================="
echo ""

# Load .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^\s*$' | xargs 2>/dev/null || true)
fi

# Check API key
if [ -z "${GROQ_API_KEY:-}" ]; then
  echo -e "${RED}❌ GROQ_API_KEY not set.${NC}"
  echo "   Add GROQ_API_KEY=gsk_... to your .env file"
  echo "   Get a free key at: https://console.groq.com"
  exit 1
fi

echo -e "${GREEN}✅ GROQ_API_KEY loaded (${GROQ_API_KEY:0:8}...)${NC}"
echo ""

# Run tests
echo -e "${CYAN}Running core package tests...${NC}"
echo ""

if [ "${1:-}" = "--verbose" ]; then
  pnpm --filter @aivoralabs/agenttrail test -- --reporter=verbose 2>&1
else
  pnpm --filter @aivoralabs/agenttrail test 2>&1
fi

EXIT_CODE=$?

echo ""
echo "=================================="
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
else
  echo -e "${RED}❌ Some tests failed (exit code: $EXIT_CODE)${NC}"
  echo ""
  echo -e "${YELLOW}Common issues:${NC}"
  echo "  • SKIP in suites 8/12 → GROQ_API_KEY not loaded"
  echo "  • 429 rate limit → wait 1 minute and retry"
  echo "  • timeout → Groq API is slow, retry"
fi
echo ""

exit $EXIT_CODE

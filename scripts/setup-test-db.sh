#!/bin/bash

# Test Database Setup Script
# This script sets up the test database for running API tests

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default values
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-agri_ai_test}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --host)
      DB_HOST="$2"
      shift 2
      ;;
    --port)
      DB_PORT="$2"
      shift 2
      ;;
    --name)
      DB_NAME="$2"
      shift 2
      ;;
    --user)
      DB_USER="$2"
      shift 2
      ;;
    --password)
      DB_PASSWORD="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  --host HOST       Database host (default: localhost)"
      echo "  --port PORT       Database port (default: 5432)"
      echo "  --name NAME       Database name (default: agri_ai_test)"
      echo "  --user USER       Database user (default: postgres)"
      echo "  --password PASS   Database password (default: postgres)"
      echo "  --help            Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "🧪 Test Database Setup"
echo "======================================================"
echo "Database Configuration:"
echo "  Host:    $DB_HOST:$DB_PORT"
echo "  Name:    $DB_NAME"
echo "  User:    $DB_USER"
echo "  Password: $DB_PASSWORD"
echo ""

# Check if PostgreSQL is running
echo "1️⃣  Checking PostgreSQL connection..."
if pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
  echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
  echo -e "${RED}✗ PostgreSQL is not running${NC}"
  echo "Please start PostgreSQL and try again."
  exit 1
fi

# Check if we can connect
echo "2️⃣  Testing database connection..."
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1" >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Connection successful${NC}"
else
  echo -e "${RED}✗ Connection failed${NC}"
  echo "Please check your database credentials."
  exit 1
fi

# Create database if it doesn't exist
echo "3️⃣  Checking database '$DB_NAME'..."
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
  echo -e "${GREEN}✓ Database '$DB_NAME' already exists${NC}"
else
  echo "Creating database '$DB_NAME'..."
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" || {
    echo -e "${RED}✗ Failed to create database${NC}"
    exit 1
  }
  echo -e "${GREEN}✓ Database '$DB_NAME' created${NC}"
fi

# Set environment variable for database connection
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=require"

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Database URL: $DATABASE_URL"
echo ""
echo "To run tests with this database, ensure your .env.local uses:"
echo "  DATABASE_URL=$DATABASE_URL"
echo ""
echo "Or run tests directly with:"
echo "  DATABASE_URL=\"$DATABASE_URL\" npm test"
echo ""
echo "To connect to the database:"
echo "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"

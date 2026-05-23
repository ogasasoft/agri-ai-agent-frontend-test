#!/bin/bash

# Dependency Update Script
# This script checks for outdated dependencies and suggests updates

set -e

echo "🔍 Checking for outdated dependencies..."

# Check for outdated packages
echo -e "\n📦 Outdated Dependencies:"
npm outdated --json || true

# Check for security vulnerabilities
echo -e "\n🔒 Security Vulnerabilities:"
npm audit --audit-level=moderate || true

# Display latest stable versions
echo -e "\n📊 Latest Stable Versions:"
npm view next version
npm view react version
npm view react-dom version
npm view typescript version
npm view jest version

echo -e "\n✅ Dependency check complete."
echo "💡 Review the output above for packages that need updating."

#!/bin/bash

BASE_URL="https://a2b11148.real-estate-200units-v2.pages.dev"

echo "=========================================="
echo "Production Login Test - All Users"
echo "Base URL: $BASE_URL"
echo "=========================================="
echo ""

# Test users array
declare -a users=(
  "admin@test.com:Test1234!"
  "navigator-187@docomo.ne.jp:kouki187"
  "prod-test-agent@example.com:Test1234!"
  "agent@200units.com:Test1234!"
  "admin@200units.com:Test1234!"
  "seller1@example.com:Test1234!"
  "seller2@example.com:Test1234!"
)

success_count=0
fail_count=0

for user_info in "${users[@]}"; do
  email="${user_info%%:*}"
  password="${user_info##*:}"
  
  echo "Testing: $email"
  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" = "200" ]; then
    echo "✅ SUCCESS - $email"
    ((success_count++))
  else
    echo "❌ FAIL - $email (HTTP $http_code)"
    echo "   Response: $body"
    ((fail_count++))
  fi
  echo ""
done

echo "=========================================="
echo "Test Summary:"
echo "✅ Success: $success_count"
echo "❌ Failed: $fail_count"
echo "Total: $((success_count + fail_count))"
echo "=========================================="

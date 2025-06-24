#!/bin/bash

# Raw API test script for company 12658287
# Tests direct Companies House API calls

COMPANY_NUMBER="12658287"
API_KEY="${COMPANIES_HOUSE_API_KEY}"

if [ -z "$API_KEY" ]; then
    echo "❌ Error: COMPANIES_HOUSE_API_KEY environment variable not set"
    echo "Please set your Companies House API key:"
    echo "export COMPANIES_HOUSE_API_KEY='your_api_key_here'"
    exit 1
fi

echo "🏢 Testing Raw Companies House API for Company $COMPANY_NUMBER"
echo "================================================================"

# Create auth header
AUTH_HEADER="Authorization: Basic $(echo -n "${API_KEY}:" | base64)"

echo ""
echo "📋 1. Basic Company Information"
echo "--------------------------------"
echo "URL: https://api.company-information.service.gov.uk/company/$COMPANY_NUMBER"
echo ""

curl -s -H "$AUTH_HEADER" \
     -H "Accept: application/json" \
     -H "User-Agent: Numericalz-Test/1.0" \
     "https://api.company-information.service.gov.uk/company/$COMPANY_NUMBER" | \
     jq '.' 2>/dev/null || {
         echo "❌ Failed to fetch or parse company data"
         echo "Raw response:"
         curl -s -H "$AUTH_HEADER" \
              -H "Accept: application/json" \
              "https://api.company-information.service.gov.uk/company/$COMPANY_NUMBER"
     }

echo ""
echo ""
echo "📋 2. Filing History"
echo "--------------------"
echo "URL: https://api.company-information.service.gov.uk/company/$COMPANY_NUMBER/filing-history"
echo ""

curl -s -H "$AUTH_HEADER" \
     -H "Accept: application/json" \
     -H "User-Agent: Numericalz-Test/1.0" \
     "https://api.company-information.service.gov.uk/company/$COMPANY_NUMBER/filing-history" | \
     jq '.items[0:5] | .[] | {description: .description, date: .date, category: .category}' 2>/dev/null || {
         echo "❌ Failed to fetch filing history"
     }

echo ""
echo ""
echo "👥 3. Officers Information"
echo "--------------------------"
echo "URL: https://api.company-information.service.gov.uk/company/$COMPANY_NUMBER/officers"
echo ""

curl -s -H "$AUTH_HEADER" \
     -H "Accept: application/json" \
     -H "User-Agent: Numericalz-Test/1.0" \
     "https://api.company-information.service.gov.uk/company/$COMPANY_NUMBER/officers" | \
     jq '.items[] | {name: .name, role: .officer_role, appointed: .appointed_on}' 2>/dev/null || {
         echo "❌ Failed to fetch officers data"
     }

echo ""
echo ""
echo "🔍 4. Raw JSON Response (Full Company Data)"
echo "============================================"

curl -s -H "$AUTH_HEADER" \
     -H "Accept: application/json" \
     -H "User-Agent: Numericalz-Test/1.0" \
     "https://api.company-information.service.gov.uk/company/$COMPANY_NUMBER"

echo ""
echo ""
echo "✅ Raw API test completed!" 
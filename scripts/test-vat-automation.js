#!/usr/bin/env node

/**
 * VAT Automation Testing Script
 * 
 * Simple script to test VAT quarter automation with different date scenarios
 * Usage:
 *   npm run test-vat-automation
 *   node scripts/test-vat-automation.js --date=2024-07-01
 *   node scripts/test-vat-automation.js --date=2024-10-01 --skip-emails
 */

const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const dateArg = args.find(arg => arg.startsWith('--date='))?.split('=')[1];
const skipEmails = args.includes('--skip-emails');

// Test scenarios
const testScenarios = [
  {
    name: 'Current Date (No Action Expected)',
    date: new Date().toISOString().split('T')[0],
    description: 'Should skip all clients (not 1st of month or no quarters ending)'
  },
  {
    name: 'July 1st, 2024 (3,6,9,12 Quarter Creation)',
    date: '2024-07-01',
    description: 'Should create Apr-Jun quarters for 3,6,9,12 clients'
  },
  {
    name: 'October 1st, 2024 (3,6,9,12 Quarter Creation)',
    date: '2024-10-01', 
    description: 'Should create Jul-Sep quarters for 3,6,9,12 clients'
  },
  {
    name: 'August 1st, 2024 (2,5,8,11 Quarter Creation)',
    date: '2024-08-01',
    description: 'Should create May-Jul quarters for 2,5,8,11 clients'
  },
  {
    name: 'November 1st, 2024 (2,5,8,11 Quarter Creation)',
    date: '2024-11-01',
    description: 'Should create Aug-Oct quarters for 2,5,8,11 clients'
  },
  {
    name: 'February 1st, 2024 (1,4,7,10 Quarter Creation)',
    date: '2024-02-01',
    description: 'Should create Nov-Jan quarters for 1,4,7,10 clients'
  }
];

console.log('🧪 VAT Automation Testing Script');
console.log('===============================');

if (dateArg) {
  // Test specific date
  console.log(`📅 Testing specific date: ${dateArg}`);
  console.log(`📧 Skip emails: ${skipEmails}`);
  testDate(dateArg, skipEmails);
} else {
  // Show available test scenarios
  console.log('\n📋 Available Test Scenarios:');
  testScenarios.forEach((scenario, index) => {
    console.log(`\n${index + 1}. ${scenario.name}`);
    console.log(`   Date: ${scenario.date}`);
    console.log(`   Expected: ${scenario.description}`);
  });

  console.log('\n🚀 Usage Examples:');
  console.log('# Test specific date:');
  console.log('node scripts/test-vat-automation.js --date=2024-07-01');
  console.log('\n# Test without sending emails:');
  console.log('node scripts/test-vat-automation.js --date=2024-07-01 --skip-emails');
  console.log('\n# Test all scenarios:');
  console.log('node scripts/test-vat-automation.js --all');
  console.log('\n# Interactive mode:');
  console.log('node scripts/test-vat-automation.js --interactive');

  if (args.includes('--all')) {
    console.log('\n🧪 Running all test scenarios...\n');
    testScenarios.forEach((scenario, index) => {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`Test ${index + 1}: ${scenario.name}`);
      console.log(`${'='.repeat(50)}`);
      testDate(scenario.date, true); // Skip emails for bulk testing
    });
  }
}

function testDate(date, skipEmails = false) {
  try {
    const skipEmailsParam = skipEmails ? '&skipEmails=true' : '';
    const url = `http://localhost:3000/api/vat-quarters/auto-create-test?simulatedDate=${date}${skipEmailsParam}`;
    
    console.log(`\n🔄 Testing: ${url}`);
    
    const curlCommand = `curl -s "${url}"`;
    const result = execSync(curlCommand, { encoding: 'utf8' });
    
    try {
      const jsonResult = JSON.parse(result);
      
      console.log('\n✅ Test Results:');
      console.log(`📊 Processed: ${jsonResult.details?.processed || 0} clients`);
      console.log(`✨ Created: ${jsonResult.details?.created || 0} quarters`);
      console.log(`📧 Emails sent: ${jsonResult.details?.emailsSent || 0}`);
      console.log(`⏭️  Skipped: ${jsonResult.details?.skipped || 0} clients`);
      console.log(`❌ Errors: ${jsonResult.details?.errors?.length || 0}`);
      
      if (jsonResult.details?.quarterDetails) {
        console.log('\n📋 Detailed Results:');
        jsonResult.details.quarterDetails.forEach(detail => {
          if (detail.action === 'CREATED') {
            console.log(`  ✅ ${detail.companyName}: Created ${detail.quarterPeriod} → ${detail.assignedTo}`);
          } else {
            console.log(`  ⏭️  ${detail.companyName}: ${detail.reason}`);
          }
        });
      }
      
      if (jsonResult.details?.errors?.length > 0) {
        console.log('\n❌ Errors:');
        jsonResult.details.errors.forEach(error => {
          console.log(`  • ${error.companyName}: ${error.error}`);
        });
      }
      
    } catch (parseError) {
      console.log('Raw result:', result);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('1. Development server is running (npm run dev)');
    console.log('2. Local database is connected');
    console.log('3. You have VAT-enabled clients in your database');
  }
}

// Add to package.json scripts if not already there
function addToPackageJson() {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    if (!packageJson.scripts['test-vat-automation']) {
      packageJson.scripts['test-vat-automation'] = 'node scripts/test-vat-automation.js';
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('✅ Added test-vat-automation script to package.json');
    }
  } catch (error) {
    // Ignore errors
  }
}

addToPackageJson(); 
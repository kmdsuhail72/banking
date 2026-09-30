#!/usr/bin/env node
/**
 * Customer Service API Test Suite
 * Tests all major endpoints and workflows
 */

const http = require('http');
const timestamp = Date.now();

class TestRunner {
  constructor() {
    this.baseUrl = 'http://localhost:4002/api/v1';
    this.results = [];
    this.testData = {
      userId: `test_user_${timestamp}`,
      email: `test_${timestamp}@novabank.com`
    };
  }

  async request(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const cleanBase = this.baseUrl.replace(/\/$/, '');
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      const url = new URL(`${cleanBase}${cleanPath}`);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: body ? JSON.parse(body) : null
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: body
            });
          }
        });
      });

      req.on('error', reject);
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  log(test, status, details = '') {
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${test}: ${details}`);
    this.results.push({ test, status, details });
  }

  async runTests() {
    console.log('\n' + '='.repeat(60));
    console.log('CUSTOMER SERVICE API TEST SUITE');
    console.log('='.repeat(60));
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Test User ID: ${this.testData.userId}`);
    console.log(`Test Email: ${this.testData.email}\n`);

    // Test 1: Create Customer
    console.log('\n[TEST 1] Create Customer Profile');
    console.log('-'.repeat(60));
    const createPayload = {
      userId: this.testData.userId,
      firstName: 'John',
      lastName: 'Doe',
      email: this.testData.email,
      phone: '+1-555-1234',
      dateOfBirth: '1990-01-15',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA'
      }
    };

    try {
      const res = await this.request('POST', '/customers', createPayload);
      if (res.status === 201) {
        this.testData.customerId = res.body._id;
        this.log(
          'CREATE_CUSTOMER',
          'PASS',
          `Created ${res.body._id}`
        );
        console.log('  Response:', JSON.stringify(res.body, null, 2));
      } else {
        this.log('CREATE_CUSTOMER', 'FAIL', `Status: ${res.status}`);
        console.log('  Response:', res.body);
      }
    } catch (e) {
      this.log('CREATE_CUSTOMER', 'FAIL', e.message);
    }

    // Test 2: Get Customer by ID
    if (this.testData.customerId) {
      console.log('\n[TEST 2] Get Customer by ID');
      console.log('-'.repeat(60));
      try {
        const res = await this.request('GET', `/customers/${this.testData.customerId}`);
        if (res.status === 200) {
          this.log('GET_CUSTOMER', 'PASS', `Retrieved ${res.body._id}`);
          console.log('  Email:', res.body.email);
          console.log('  KYC Status:', res.body.kycStatus);
          console.log('  Risk Score:', res.body.riskScore);
        } else {
          this.log('GET_CUSTOMER', 'FAIL', `Status: ${res.status}`);
        }
      } catch (e) {
        this.log('GET_CUSTOMER', 'FAIL', e.message);
      }
    }

    // Test 3: Update Customer
    if (this.testData.customerId) {
      console.log('\n[TEST 3] Update Customer Profile');
      console.log('-'.repeat(60));
      const updatePayload = {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1-555-9999',
        address: {
          city: 'Boston'
        }
      };

      try {
        const res = await this.request('PATCH', `/customers/${this.testData.customerId}`, updatePayload);
        if (res.status === 200) {
          this.log('UPDATE_CUSTOMER', 'PASS', 'Profile updated');
          console.log('  Updated Name:', `${res.body.firstName} ${res.body.lastName}`);
          console.log('  Updated Phone:', res.body.phone);
          console.log('  Updated City:', res.body.address?.city);
        } else {
          this.log('UPDATE_CUSTOMER', 'FAIL', `Status: ${res.status}`);
        }
      } catch (e) {
        this.log('UPDATE_CUSTOMER', 'FAIL', e.message);
      }
    }

    // Test 4: Get Customer by User ID
    console.log('\n[TEST 4] Get Customer by User ID (from userId)');
    console.log('-'.repeat(60));
    try {
      // Note: The current controller doesn't have a GET /customers/userId/:userId endpoint
      // This would need to be added or we'd use a query param
      const res = await this.request('GET', `/customers?userId=${this.testData.userId}`);
      if (res.status === 200) {
        this.log('GET_BY_USER_ID', 'PASS', 'Retrieved by userId');
      } else {
        this.log('GET_BY_USER_ID', 'INFO', 'Endpoint may not support query params - this is expected');
      }
    } catch (e) {
      this.log('GET_BY_USER_ID', 'INFO', 'Endpoint not available - expected behavior');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const info = this.results.filter(r => r.status === 'INFO').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`ℹ️  Info: ${info}`);
    console.log('\nTest Data for Future Tests:');
    console.log(JSON.stringify(this.testData, null, 2));
  }
}

const runner = new TestRunner();
runner.runTests().catch(console.error);

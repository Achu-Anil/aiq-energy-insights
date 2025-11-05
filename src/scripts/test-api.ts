/**
 * API Endpoint Testing Script
 * Tests all endpoints to verify they're working correctly
 */

const BASE_URL = "http://localhost:3000/api";

interface TestResult {
  endpoint: string;
  status: number;
  success: boolean;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function testEndpoint(name: string, url: string): Promise<TestResult> {
  console.log(`\nTesting: ${name}`);
  console.log(`URL: ${url}`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    const result: TestResult = {
      endpoint: name,
      status: response.status,
      success: response.ok,
    };

    if (response.ok) {
      result.data = data;
    } else {
      result.error = JSON.stringify(data);
    }

    if (response.ok) {
      console.log(`✅ Status: ${response.status}`);
      if (Array.isArray(data)) {
        console.log(`   Data: Array with ${data.length} items`);
        if (data.length > 0) {
          console.log(
            `   Sample:`,
            JSON.stringify(data[0], null, 2).substring(0, 200)
          );
        }
      } else {
        console.log(
          `   Data:`,
          JSON.stringify(data, null, 2).substring(0, 200)
        );
      }
    } else {
      console.log(`❌ Status: ${response.status}`);
      console.log(`   Error:`, data);
    }

    results.push(result);
    return result;
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    const result: TestResult = {
      endpoint: name,
      status: 0,
      success: false,
      error: error.message,
    };
    results.push(result);
    return result;
  }
}

async function runTests() {
  console.log("=".repeat(60));
  console.log("API ENDPOINT TESTS");
  console.log("=".repeat(60));

  // Test 1: GET /plants (top 10, default)
  await testEndpoint("GET /plants (default)", `${BASE_URL}/plants`);

  // Test 2: GET /plants?top=5
  await testEndpoint("GET /plants?top=5", `${BASE_URL}/plants?top=5`);

  // Test 3: GET /plants?state=TX
  await testEndpoint(
    "GET /plants?state=TX",
    `${BASE_URL}/plants?state=TX&top=5`
  );

  // Test 4: GET /plants?state=CA&year=2023
  await testEndpoint(
    "GET /plants?state=CA&year=2023",
    `${BASE_URL}/plants?state=CA&year=2023&top=5`
  );

  // Test 5: GET /plants/:id
  await testEndpoint("GET /plants/:id", `${BASE_URL}/plants/1`);

  // Test 6: GET /states
  await testEndpoint("GET /states", `${BASE_URL}/states?year=2023`);

  // Test 7: GET /states/:code
  await testEndpoint("GET /states/TX", `${BASE_URL}/states/TX?year=2023`);

  // Test 8: GET /states/CA
  await testEndpoint(
    "GET /states/CA",
    `${BASE_URL}/states/CA?year=2023&topPlants=5`
  );

  // Validation Tests
  console.log("\n" + "=".repeat(60));
  console.log("VALIDATION TESTS");
  console.log("=".repeat(60));

  // Test 9: Invalid top (exceeds max)
  await testEndpoint("Invalid top=150", `${BASE_URL}/plants?top=150`);

  // Test 10: Invalid state (lowercase)
  await testEndpoint("Invalid state=tx", `${BASE_URL}/plants?state=tx`);

  // Test 11: Invalid state (wrong length)
  await testEndpoint("Invalid state=T", `${BASE_URL}/plants?state=T`);

  // Test 12: Invalid year (too old)
  await testEndpoint("Invalid year=1800", `${BASE_URL}/plants?year=1800`);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);

  console.log("\nResults by Endpoint:");
  results.forEach((r) => {
    const icon = r.success ? "✅" : "❌";
    console.log(`${icon} ${r.endpoint} - Status: ${r.status}`);
  });

  console.log("\n" + "=".repeat(60));
}

runTests().catch(console.error);

/**
 * Script to combine unit test and integration test coverage reports
 * This script generates a comprehensive coverage report that includes both
 * unit tests and integration tests.
 * 
 * Run with:
 *   deno run --allow-read --allow-write scripts/combine_coverage.ts
 */

// Check if coverage directories exist
const unitCoverageExists = await Deno.stat("coverage").catch(() => null);
const integrationCoverageExists = await Deno.stat("integration-coverage").catch(() => null);

if (!unitCoverageExists) {
  console.error("Unit test coverage directory not found. Run 'deno task coverage:unit' first.");
  Deno.exit(1);
}

if (!integrationCoverageExists) {
  console.error("Integration test coverage directory not found. Run 'deno task coverage:integration' first.");
  Deno.exit(1);
}

// Ensure the combined directory exists
await Deno.mkdir("combined-coverage", { recursive: true });

// Get unit test coverage summary
const unitCoverage = JSON.parse(
  await Deno.readTextFile("coverage/coverage.json"),
);

// Get integration test coverage summary
const integrationCoverage = JSON.parse(
  await Deno.readTextFile("integration-coverage/coverage.json"),
);

// Function to merge coverage data
function mergeCoverage(unitCov: any, integrationCov: any) {
  const mergedCoverage: Record<string, any> = {};
  
  // Combine all file paths from both coverage reports
  const allPaths = new Set([
    ...Object.keys(unitCov),
    ...Object.keys(integrationCov),
  ]);
  
  for (const path of allPaths) {
    if (unitCov[path] && integrationCov[path]) {
      // If the file exists in both reports, merge the data
      mergedCoverage[path] = {
        ...unitCov[path],
      };
      
      // Merge coverage counts
      if (unitCov[path].b && integrationCov[path].b) {
        for (const branchKey in unitCov[path].b) {
          if (integrationCov[path].b[branchKey]) {
            mergedCoverage[path].b[branchKey] = [
              unitCov[path].b[branchKey][0] + integrationCov[path].b[branchKey][0],
              unitCov[path].b[branchKey][1] + integrationCov[path].b[branchKey][1],
            ];
          }
        }
      }
      
      if (unitCov[path].s && integrationCov[path].s) {
        for (const statKey in unitCov[path].s) {
          if (integrationCov[path].s[statKey] !== undefined) {
            mergedCoverage[path].s[statKey] = 
              unitCov[path].s[statKey] + integrationCov[path].s[statKey];
          }
        }
      }
      
      if (unitCov[path].f && integrationCov[path].f) {
        for (const funcKey in unitCov[path].f) {
          if (integrationCov[path].f[funcKey] !== undefined) {
            mergedCoverage[path].f[funcKey] = 
              unitCov[path].f[funcKey] + integrationCov[path].f[funcKey];
          }
        }
      }
    } else if (unitCov[path]) {
      // If the file only exists in unit coverage
      mergedCoverage[path] = { ...unitCov[path] };
    } else if (integrationCov[path]) {
      // If the file only exists in integration coverage
      mergedCoverage[path] = { ...integrationCov[path] };
    }
  }
  
  return mergedCoverage;
}

// Merge the coverage data
const combinedCoverage = mergeCoverage(unitCoverage, integrationCoverage);

// Write the combined coverage data
await Deno.writeTextFile(
  "combined-coverage/coverage.json",
  JSON.stringify(combinedCoverage, null, 2),
);

// Calculate and print combined coverage statistics
console.log("Combined Coverage Report");
console.log("========================");

let totalLines = 0;
let coveredLines = 0;
let totalBranches = 0;
let coveredBranches = 0;

for (const path in combinedCoverage) {
  const fileData = combinedCoverage[path];
  
  // Count lines
  if (fileData.s) {
    for (const statKey in fileData.s) {
      totalLines++;
      if (fileData.s[statKey] > 0) {
        coveredLines++;
      }
    }
  }
  
  // Count branches
  if (fileData.b) {
    for (const branchKey in fileData.b) {
      totalBranches += fileData.b[branchKey][1];
      coveredBranches += fileData.b[branchKey][0];
    }
  }
}

const lineCoverage = totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;
const branchCoverage = totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0;

console.log(`Line Coverage: ${lineCoverage.toFixed(2)}% (${coveredLines}/${totalLines})`);
console.log(`Branch Coverage: ${branchCoverage.toFixed(2)}% (${coveredBranches}/${totalBranches})`);

// Generate a human-readable summary file
const summary = `# Combined Coverage Summary

This report combines both unit test and integration test coverage.

## Summary

- **Line Coverage**: ${lineCoverage.toFixed(2)}% (${coveredLines}/${totalLines})
- **Branch Coverage**: ${branchCoverage.toFixed(2)}% (${coveredBranches}/${totalBranches})

## Details

To view detailed coverage information, run:
\`\`\`
deno coverage combined-coverage --detailed
\`\`\`

To generate an HTML report, run:
\`\`\`
deno coverage combined-coverage --html
\`\`\`

## Coverage Sources

- Unit tests: coverage/
- Integration tests: integration-coverage/

Generated on: ${new Date().toISOString()}
`;

await Deno.writeTextFile("combined-coverage/summary.md", summary);

// Export as LCOV for tools compatibility
const lcovCommand = new Deno.Command("deno", {
  args: ["coverage", "combined-coverage", "--lcov", "--output=combined-coverage/lcov.info"],
});

try {
  const lcovResult = await lcovCommand.output();
  if (lcovResult.code === 0) {
    console.log("LCOV report generated at combined-coverage/lcov.info");
  } else {
    console.error("Failed to generate LCOV report");
  }
} catch (error) {
  console.error("Error generating LCOV report:", error);
}

console.log("\nCombined coverage report generated successfully!");
console.log("See combined-coverage/summary.md for details");

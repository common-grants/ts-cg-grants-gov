/**
 * Example: Combine the Grants.gov plugin with a local plugin.
 *
 * This example shows how to:
 * 1. Define a local plugin with your own custom fields
 * 2. Merge it with the Grants.gov plugin using mergeExtensions()
 * 3. Parse data that includes fields from both plugins
 *
 * Run with: pnpm example:combine
 */

import { definePlugin, mergeExtensions } from "@common-grants/sdk/extensions";
import grantsGovPlugin from "../src/index";

// =============================================================================
// Step 1: Define a local plugin with your own fields
// =============================================================================

const localPlugin = definePlugin({
  extensions: {
    Opportunity: {
      internalNotes: {
        fieldType: "string",
        description: "Internal notes about this opportunity",
      },
      priority: {
        fieldType: "integer",
        description: "Internal priority ranking (1 = highest)",
      },
    },
  },
} as const);

// =============================================================================
// Step 2: Merge plugins
// =============================================================================

const merged = mergeExtensions([grantsGovPlugin.extensions, localPlugin.extensions]);
const combinedPlugin = definePlugin({ extensions: merged });
const schema = combinedPlugin.schemas.Opportunity;

// =============================================================================
// Step 3: Parse data with fields from both plugins
// =============================================================================

const opportunityData = {
  id: "573525f2-8e15-4405-83fb-e6523511d893",
  title: "STEM Education Grant Program",
  description: "A grant program focused on STEM education",
  status: { value: "open" },
  createdAt: "2025-01-01T00:00:00Z",
  lastModifiedAt: "2025-01-15T00:00:00Z",
  customFields: {
    // Grants.gov fields
    agency: {
      name: "agency",
      fieldType: "object",
      value: { code: "HHS", name: "Department of Health and Human Services" },
    },
    federalOpportunityNumber: {
      name: "federalOpportunityNumber",
      fieldType: "string",
      value: "HHS-2025-001",
    },
    // Local fields
    internalNotes: {
      name: "internalNotes",
      fieldType: "string",
      value: "High priority — aligns with Q3 strategy",
    },
    priority: {
      name: "priority",
      fieldType: "integer",
      value: 1,
    },
  },
};

function main() {
  console.log("=== Combine Plugins ===\n");

  const opportunity = schema.parse(opportunityData);

  console.log(`Title: ${opportunity.title}\n`);

  // Grants.gov fields
  console.log("Grants.gov fields:");
  console.log(`  Agency:    ${opportunity.customFields?.agency?.value.name}`);
  console.log(`  Federal #: ${opportunity.customFields?.federalOpportunityNumber?.value}`);

  // Local fields
  console.log("\nLocal fields:");
  console.log(`  Notes:    ${opportunity.customFields?.internalNotes?.value}`);
  console.log(`  Priority: ${opportunity.customFields?.priority?.value}`);

  console.log("\n=== Example Complete ===");
}

main();

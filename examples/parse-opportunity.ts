/**
 * Example: Parse a Grants.gov opportunity with typed custom fields.
 *
 * This example shows how to:
 * 1. Use the plugin's built-in schema to parse opportunity data
 * 2. Access standard CommonGrants fields
 * 3. Access Grants.gov-specific custom fields with full type safety
 *
 * Run with: pnpm example:parse
 */

import plugin from "../src/index";

const schema = plugin.schemas.Opportunity;

// Simulated API response from Simpler.Grants.gov
const apiResponse = {
  id: "573525f2-8e15-4405-83fb-e6523511d893",
  title: "STEM Education Grant Program",
  description: "A grant program focused on STEM education in underserved communities",
  status: { value: "open" },
  createdAt: "2025-01-01T00:00:00Z",
  lastModifiedAt: "2025-01-15T00:00:00Z",
  customFields: {
    legacySerialId: {
      name: "legacySerialId",
      fieldType: "integer",
      value: 12345,
    },
    federalOpportunityNumber: {
      name: "federalOpportunityNumber",
      fieldType: "string",
      value: "HHS-2025-001",
    },
    agency: {
      name: "agency",
      fieldType: "object",
      value: {
        code: "HHS",
        name: "Department of Health and Human Services",
        parentName: null,
        parentCode: null,
      },
    },
    assistanceListings: {
      name: "assistanceListings",
      fieldType: "array",
      value: [
        { identifier: "93.123", programTitle: "STEM Education" },
        { identifier: "93.456", programTitle: "Youth Development" },
      ],
    },
    contactInfo: {
      name: "contactInfo",
      fieldType: "object",
      value: {
        name: "Jane Doe",
        email: "jane.doe@hhs.gov",
        phone: "555-0100",
        description: "Program Officer",
      },
    },
    fiscalYear: {
      name: "fiscalYear",
      fieldType: "integer",
      value: 2025,
    },
    costSharing: {
      name: "costSharing",
      fieldType: "object",
      value: { isRequired: false },
    },
  },
};

// =============================================================================
// Parse and access fields
// =============================================================================

function main() {
  console.log("=== Parse Grants.gov Opportunity ===\n");

  const opportunity = schema.parse(apiResponse);

  // Standard CommonGrants fields
  console.log("Standard fields:");
  console.log(`  Title:  ${opportunity.title}`);
  console.log(`  Status: ${opportunity.status.value}`);
  console.log(`  ID:     ${opportunity.id}`);

  // Grants.gov custom fields — fully typed
  const cf = opportunity.customFields;
  console.log("\nGrants.gov custom fields:");
  console.log(`  Agency:       ${cf?.agency?.value.name} (${cf?.agency?.value.code})`);
  console.log(`  Federal #:    ${cf?.federalOpportunityNumber?.value}`);
  console.log(`  Legacy ID:    ${cf?.legacySerialId?.value}`);
  console.log(`  Fiscal Year:  ${cf?.fiscalYear?.value}`);
  console.log(`  Cost Sharing: ${cf?.costSharing?.value.isRequired}`);

  // Nested array access
  console.log("\nAssistance Listings:");
  for (const listing of cf?.assistanceListings?.value ?? []) {
    console.log(`  - ${listing.identifier}: ${listing.programTitle}`);
  }

  // Contact info
  const contact = cf?.contactInfo?.value;
  console.log(`\nContact: ${contact?.name} <${contact?.email}>`);

  console.log("\n=== Example Complete ===");
}

main();

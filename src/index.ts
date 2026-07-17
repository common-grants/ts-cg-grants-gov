import { z } from "zod";
import { definePlugin } from "@common-grants/sdk/extensions";
import {
  AssistanceListingValueSchema,
  AgencyValueSchema,
  AttachmentValueSchema,
  ContactInfoValueSchema,
  AdditionalInfoValueSchema,
  CostSharingValueSchema,
  GrantsGovOpportunitySchema,
} from "./schemas";
import { toCommon, fromCommon } from "./transforms";

// =============================================================================
// Custom Field Specs
// =============================================================================

const customFields = {
  legacySerialId: {
    fieldType: "integer",
    description: "An integer ID for the opportunity, needed for compatibility with legacy systems",
  },
  federalOpportunityNumber: {
    fieldType: "string",
    description: "The federal opportunity number assigned to this grant opportunity",
  },
  assistanceListings: {
    fieldType: "array",
    value: z.array(AssistanceListingValueSchema),
    description: "The assistance listing number and program title for this opportunity",
  },
  agency: {
    fieldType: "object",
    value: AgencyValueSchema,
    description: "Information about the agency offering this opportunity",
  },
  attachments: {
    fieldType: "array",
    value: z.array(AttachmentValueSchema),
    description: "Attachments such as NOFOs and supplemental documents for the opportunity",
  },
  federalFundingSource: {
    fieldType: "string",
    description: "The category type of the grant opportunity",
  },
  contactInfo: {
    fieldType: "object",
    value: ContactInfoValueSchema,
    description: "Contact information (name, email, phone, description) for this resource",
  },
  additionalInfo: {
    fieldType: "object",
    value: AdditionalInfoValueSchema,
    description: "URL and description for additional information about the opportunity",
  },
  fiscalYear: {
    fieldType: "integer",
    description: "The fiscal year associated with this opportunity",
  },
  costSharing: {
    fieldType: "object",
    value: CostSharingValueSchema,
    description: "Whether cost sharing or matching funds are required for this opportunity",
  },
  sourceCreatedAt: {
    fieldType: "string",
    description: "Original creation timestamp of the opportunity record (microsecond precision)",
  },
  sourceUpdatedAt: {
    fieldType: "string",
    description: "Original last update timestamp of the opportunity record (microsecond precision)",
  },
  summaryCreatedAt: {
    fieldType: "string",
    description: "Creation timestamp of the opportunity summary record",
  },
  summaryUpdatedAt: {
    fieldType: "string",
    description: "Last update timestamp of the opportunity summary record",
  },
  forecastedPostDate: {
    fieldType: "string",
    description: "Forecasted post date for the opportunity",
  },
  forecastedCloseDate: {
    fieldType: "string",
    description: "Forecasted close date for the opportunity",
  },
  fundingInstruments: {
    fieldType: "array",
    value: z.array(z.string()),
    description: "Funding instrument types for this opportunity",
  },
  fundingCategories: {
    fieldType: "array",
    value: z.array(z.string()),
    description: "Funding category types for this opportunity",
  },
} as const;

// =============================================================================
// Plugin
// =============================================================================

/**
 * CommonGrants plugin for the Simpler.Grants.gov API.
 *
 * Extends the `Opportunity` schema with Grants.gov-specific custom fields
 * and provides bidirectional transforms between the Simpler.Grants.gov
 * `GET /v1/opportunities/:id` response shape and the CommonGrants Opportunity schema.
 *
 * @example
 * ```ts
 * import plugin from "@common-grants/cg-grants-gov";
 *
 * // Parse a raw grants.gov API response into CommonGrants format
 * const { result, errors } = plugin.schemas.Opportunity.toCommon(rawApiResponse);
 * if (errors.length === 0) console.log(result.title);
 *
 * // Validate CommonGrants-shaped data with grants.gov custom fields
 * const opp = plugin.schemas.Opportunity.commonSchema.parse(data);
 * console.log(opp.customFields?.agency?.value.name);
 * ```
 */
const plugin = definePlugin({
  meta: {
    name: "grants.gov",
    sourceSystem: "Simpler.Grants.gov",
    capabilities: ["customFields", "transforms", "customFilters"],
  },
  schemas: {
    Opportunity: {
      customFields,
      sourceSchema: GrantsGovOpportunitySchema,
      toCommon,
      fromCommon,
    },
  },
  // Custom filters the Simpler.Grants.gov search accepts. `as const` preserves
  // the filterType literals so search({ filters }) narrows each key.
  routes: {
    opportunities: {
      search: {
        filters: {
          agency: { filterType: "stringArray" },
          applicantType: { filterType: "stringArray" },
          fundingInstrument: { filterType: "stringArray" },
          costSharing: { filterType: "booleanComparison" },
        },
      },
    },
  } as const,
});

export default plugin;
export type { GrantsGovOpportunity } from "./schemas";
export {
  AssistanceListingValueSchema,
  AgencyValueSchema,
  AttachmentValueSchema,
  ContactInfoValueSchema,
  AdditionalInfoValueSchema,
  CostSharingValueSchema,
  GrantsGovOpportunitySchema,
} from "./schemas";

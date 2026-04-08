import { z } from "zod";
import { definePlugin } from "@common-grants/sdk/extensions";

// =============================================================================
// Value Schemas
// =============================================================================

export const AssistanceListingValueSchema = z.object({
  identifier: z.string().nullish(),
  programTitle: z.string().nullish(),
});

export const AgencyValueSchema = z.object({
  code: z.string().nullish(),
  name: z.string().nullish(),
  parentName: z.string().nullish(),
  parentCode: z.string().nullish(),
});

export const AttachmentValueSchema = z.object({
  downloadUrl: z.string().nullish(),
  name: z.string(),
  description: z.string().nullish(),
  sizeInBytes: z.number().int().nullish(),
  mimeType: z.string().nullish(),
  createdAt: z.string().datetime(),
  lastModifiedAt: z.string().datetime(),
});

export const ContactInfoValueSchema = z.object({
  name: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  description: z.string().nullish(),
});

export const AdditionalInfoValueSchema = z.object({
  url: z.string().nullish(),
  description: z.string().nullish(),
});

export const CostSharingValueSchema = z.object({
  isRequired: z.boolean().nullish(),
});

// =============================================================================
// Plugin
// =============================================================================

/**
 * CommonGrants plugin for the Simpler.Grants.gov API.
 *
 * Extends the `Opportunity` schema with Grants.gov-specific custom fields
 * such as agency, assistance listings, attachments, and contact info.
 *
 * @example
 * ```ts
 * import { Client, Auth } from "@common-grants/sdk/client";
 * import grantsGovPlugin from "@common-grants/cg-grants-gov";
 *
 * const client = new Client({ baseUrl: "https://api.simpler.grants.gov", auth: Auth.apiKey("...") });
 * const schema = grantsGovPlugin.schemas.Opportunity;
 * const opp = await client.opportunities.get(id, { schema });
 * console.log(opp.customFields?.agency?.value.name);
 * ```
 */
const plugin = definePlugin({
  extensions: {
    Opportunity: {
      legacySerialId: {
        fieldType: "integer",
        description:
          "An integer ID for the opportunity, needed for compatibility with legacy systems",
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
    },
  },
} as const);

export default plugin;

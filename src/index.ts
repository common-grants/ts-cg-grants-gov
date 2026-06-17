import { z } from "zod";
import { definePlugin } from "@common-grants/sdk/extensions";
import type { TransformResult } from "@common-grants/sdk/extensions";

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
} as const;

// =============================================================================
// Source Schema (Simpler.Grants.gov GET /v1/opportunities/:id response data)
// =============================================================================

const AssistanceListingSourceSchema = z.object({
  assistance_listing_number: z.string().nullish(),
  program_title: z.string().nullish(),
});

const OpportunitySummarySourceSchema = z.object({
  summary_description: z.string().nullish(),
  is_cost_sharing: z.boolean().nullish(),
  is_forecast: z.boolean(),
  close_date: z.string().nullish(),
  post_date: z.string().nullish(),
  expected_number_of_awards: z.number().int().nullish(),
  estimated_total_program_funding: z.number().int().nullish(),
  award_floor: z.number().int().nullish(),
  award_ceiling: z.number().int().nullish(),
  additional_info_url: z.string().nullish(),
  additional_info_url_description: z.string().nullish(),
  forecasted_post_date: z.string().nullish(),
  forecasted_close_date: z.string().nullish(),
  fiscal_year: z.number().int().nullish(),
  agency_contact_description: z.string().nullish(),
  agency_email_address: z.string().nullish(),
  agency_email_address_description: z.string().nullish(),
  funding_instruments: z.array(z.string()).default([]),
  funding_categories: z.array(z.string()).default([]),
  applicant_types: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const OpportunityAttachmentSourceSchema = z.object({
  opportunity_attachment_id: z.string().uuid().nullish(),
  mime_type: z.string().nullish(),
  file_name: z.string().nullish(),
  file_description: z.string().nullish(),
  download_url: z.string().nullish(),
  created_at: z.string().datetime().nullish(),
  updated_at: z.string().datetime().nullish(),
});

export const GrantsGovOpportunitySchema = z.object({
  opportunity_id: z.string().uuid(),
  legacy_opportunity_id: z.number().int().nullish(),
  opportunity_number: z.string().nullish(),
  opportunity_title: z.string().nullish(),
  agency_code: z.string().nullish(),
  agency_name: z.string().nullish(),
  top_level_agency_name: z.string().nullish(),
  top_level_agency_code: z.string().nullish(),
  category: z.string().nullish(),
  opportunity_assistance_listings: z.array(AssistanceListingSourceSchema).default([]),
  summary: OpportunitySummarySourceSchema.nullish(),
  opportunity_status: z.enum(["forecasted", "posted", "closed", "archived"]),
  attachments: z.array(OpportunityAttachmentSourceSchema).nullish(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type GrantsGovOpportunity = z.infer<typeof GrantsGovOpportunitySchema>;

// =============================================================================
// Status mappings
// =============================================================================

const STATUS_TO_COMMON: Record<string, "forecasted" | "open" | "closed" | "custom"> = {
  forecasted: "forecasted",
  posted: "open",
  closed: "closed",
  archived: "closed",
};

const STATUS_FROM_COMMON: Record<string, "forecasted" | "posted" | "closed" | "archived"> = {
  forecasted: "forecasted",
  open: "posted",
  closed: "closed",
  custom: "posted",
};

// =============================================================================
// Applicant type mappings
// =============================================================================

const APPLICANT_TYPE_TO_COMMON: Record<string, string> = {
  state_governments: "government_state",
  county_governments: "government_county",
  city_or_township_governments: "government_municipal",
  special_district_governments: "government_special_district",
  independent_school_districts: "school_district_independent",
  public_and_state_institutions_of_higher_education: "higher_education_public",
  private_institutions_of_higher_education: "higher_education_private",
  federally_recognized_native_american_tribal_governments: "government_tribal",
  other_native_american_tribal_organizations: "organization_tribal_other",
  nonprofits_non_higher_education_with_501c3: "non_profit_with_501c3",
  nonprofits_non_higher_education_without_501c3: "nonprofit_without_501c3",
  individuals: "individual",
  for_profit_organizations_other_than_small_businesses: "for_profit_not_small_business",
  small_businesses: "for_profit_small_business",
  unrestricted: "unrestricted",
};

const APPLICANT_TYPE_FROM_COMMON: Record<string, string> = {
  individual: "individuals",
  organization: "other",
  government_state: "state_governments",
  government_county: "county_governments",
  government_municipal: "city_or_township_governments",
  government_special_district: "special_district_governments",
  government_tribal: "federally_recognized_native_american_tribal_governments",
  organization_tribal_other: "other_native_american_tribal_organizations",
  school_district_independent: "independent_school_districts",
  higher_education_public: "public_and_state_institutions_of_higher_education",
  higher_education_private: "private_institutions_of_higher_education",
  non_profit_with_501c3: "nonprofits_non_higher_education_with_501c3",
  nonprofit_without_501c3: "nonprofits_non_higher_education_without_501c3",
  for_profit_small_business: "small_businesses",
  for_profit_not_small_business: "for_profit_organizations_other_than_small_businesses",
  unrestricted: "unrestricted",
  custom: "other",
};

// =============================================================================
// toCommon — Simpler.Grants.gov opportunity → CommonGrants Opportunity
// =============================================================================

function toCommon(source: GrantsGovOpportunity): TransformResult<unknown> {
  const summary = source.summary;

  const funding = summary
    ? {
        totalAmountAvailable:
          summary.estimated_total_program_funding != null
            ? { amount: String(summary.estimated_total_program_funding), currency: "USD" }
            : undefined,
        minAwardAmount:
          summary.award_floor != null
            ? { amount: String(summary.award_floor), currency: "USD" }
            : undefined,
        maxAwardAmount:
          summary.award_ceiling != null
            ? { amount: String(summary.award_ceiling), currency: "USD" }
            : undefined,
        estimatedAwardCount: summary.expected_number_of_awards ?? undefined,
      }
    : undefined;

  const keyDates = summary
    ? {
        postDate: summary.post_date
          ? {
              name: "Post Date",
              eventType: "singleDate" as const,
              date: summary.post_date,
            }
          : undefined,
        closeDate: summary.close_date
          ? {
              name: "Close Date",
              eventType: "singleDate" as const,
              date: summary.close_date,
            }
          : undefined,
      }
    : undefined;

  const acceptedApplicantTypes =
    summary && summary.applicant_types.length > 0
      ? summary.applicant_types.map(at => {
          const mapped = APPLICANT_TYPE_TO_COMMON[at];
          return {
            value: mapped ?? "custom",
            ...(mapped ? {} : { customValue: at }),
          };
        })
      : undefined;

  const cf: Record<string, unknown> = {};

  if (source.legacy_opportunity_id != null) {
    cf.legacySerialId = {
      name: "legacySerialId",
      fieldType: "integer",
      value: source.legacy_opportunity_id,
    };
  }

  if (source.opportunity_number != null) {
    cf.federalOpportunityNumber = {
      name: "federalOpportunityNumber",
      fieldType: "string",
      value: source.opportunity_number,
    };
  }

  if (source.opportunity_assistance_listings.length > 0) {
    cf.assistanceListings = {
      name: "assistanceListings",
      fieldType: "array",
      value: source.opportunity_assistance_listings.map(al => ({
        identifier: al.assistance_listing_number,
        programTitle: al.program_title,
      })),
    };
  }

  cf.agency = {
    name: "agency",
    fieldType: "object",
    value: {
      code: source.agency_code,
      name: source.agency_name,
      parentName: source.top_level_agency_name,
      parentCode: source.top_level_agency_code,
    },
  };

  if (source.attachments && source.attachments.length > 0) {
    cf.attachments = {
      name: "attachments",
      fieldType: "array",
      value: source.attachments.map(att => ({
        downloadUrl: att.download_url,
        name: att.file_name ?? "",
        description: att.file_description,
        mimeType: att.mime_type,
        createdAt: att.created_at ?? source.created_at,
        lastModifiedAt: att.updated_at ?? source.updated_at,
      })),
    };
  }

  if (source.category != null) {
    cf.federalFundingSource = {
      name: "federalFundingSource",
      fieldType: "string",
      value: source.category,
    };
  }

  if (summary) {
    if (summary.agency_email_address != null || summary.agency_contact_description != null) {
      cf.contactInfo = {
        name: "contactInfo",
        fieldType: "object",
        value: {
          name: null,
          email: summary.agency_email_address,
          phone: null,
          description: summary.agency_contact_description,
        },
      };
    }

    if (summary.additional_info_url != null || summary.additional_info_url_description != null) {
      cf.additionalInfo = {
        name: "additionalInfo",
        fieldType: "object",
        value: {
          url: summary.additional_info_url,
          description: summary.additional_info_url_description,
        },
      };
    }

    if (summary.fiscal_year != null) {
      cf.fiscalYear = {
        name: "fiscalYear",
        fieldType: "integer",
        value: summary.fiscal_year,
      };
    }

    if (summary.is_cost_sharing != null) {
      cf.costSharing = {
        name: "costSharing",
        fieldType: "object",
        value: { isRequired: summary.is_cost_sharing },
      };
    }
  }

  return {
    result: {
      id: source.opportunity_id,
      title: source.opportunity_title ?? "",
      description: summary?.summary_description ?? "",
      status: { value: STATUS_TO_COMMON[source.opportunity_status] ?? "custom" },
      funding,
      keyDates,
      acceptedApplicantTypes,
      customFields: Object.keys(cf).length > 0 ? cf : undefined,
      createdAt: source.created_at,
      lastModifiedAt: source.updated_at,
    },
    errors: [],
  };
}

// =============================================================================
// fromCommon — CommonGrants Opportunity → Simpler.Grants.gov opportunity
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromCommon(common: any): TransformResult<GrantsGovOpportunity> {
  const cf = common.customFields ?? {};
  const opportunityStatus: "forecasted" | "posted" | "closed" | "archived" =
    STATUS_FROM_COMMON[common.status?.value] ?? "posted";

  // Extract dates from key date events (ISODateSchema outputs Date objects)
  const postDateEvent = common.keyDates?.postDate;
  const closeDateEvent = common.keyDates?.closeDate;
  const postDate =
    postDateEvent?.eventType === "singleDate"
      ? postDateEvent.date instanceof Date
        ? postDateEvent.date.toISOString().slice(0, 10)
        : String(postDateEvent.date)
      : null;
  const closeDate =
    closeDateEvent?.eventType === "singleDate"
      ? closeDateEvent.date instanceof Date
        ? closeDateEvent.date.toISOString().slice(0, 10)
        : String(closeDateEvent.date)
      : null;

  // Map applicant types back to grants.gov values
  const applicantTypes: string[] = (common.acceptedApplicantTypes ?? []).map(
    (at: { value: string }) => APPLICANT_TYPE_FROM_COMMON[at.value] ?? "other"
  );

  // Map funding amounts back (DecimalString → integer)
  const funding = common.funding;
  const totalFunding = funding?.totalAmountAvailable?.amount
    ? parseInt(funding.totalAmountAvailable.amount, 10)
    : null;
  const awardFloor = funding?.minAwardAmount?.amount
    ? parseInt(funding.minAwardAmount.amount, 10)
    : null;
  const awardCeiling = funding?.maxAwardAmount?.amount
    ? parseInt(funding.maxAwardAmount.amount, 10)
    : null;

  // Reconstruct summary from common standard fields and custom fields
  const createdAtStr =
    common.createdAt instanceof Date ? common.createdAt.toISOString() : String(common.createdAt);
  const updatedAtStr =
    common.lastModifiedAt instanceof Date
      ? common.lastModifiedAt.toISOString()
      : String(common.lastModifiedAt);

  const summary = {
    summary_description: common.description ?? null,
    is_cost_sharing: cf.costSharing?.value?.isRequired ?? null,
    is_forecast: opportunityStatus === "forecasted",
    close_date: closeDate,
    post_date: postDate,
    expected_number_of_awards: funding?.estimatedAwardCount ?? null,
    estimated_total_program_funding: totalFunding,
    award_floor: awardFloor,
    award_ceiling: awardCeiling,
    additional_info_url: cf.additionalInfo?.value?.url ?? null,
    additional_info_url_description: cf.additionalInfo?.value?.description ?? null,
    forecasted_post_date: null,
    forecasted_close_date: null,
    fiscal_year: cf.fiscalYear?.value ?? null,
    agency_contact_description: cf.contactInfo?.value?.description ?? null,
    agency_email_address: cf.contactInfo?.value?.email ?? null,
    agency_email_address_description: null,
    funding_instruments: [],
    funding_categories: [],
    applicant_types: applicantTypes,
    created_at: createdAtStr,
    updated_at: updatedAtStr,
  };

  // Reconstruct agency fields from custom field
  const agencyValue = cf.agency?.value;

  // Reconstruct assistance listings from custom field
  const opportunityAssistanceListings = (cf.assistanceListings?.value ?? []).map(
    (al: { identifier?: string | null; programTitle?: string | null }) => ({
      assistance_listing_number: al.identifier ?? null,
      program_title: al.programTitle ?? null,
    })
  );

  // Reconstruct attachments from custom field
  const attachments =
    cf.attachments?.value?.map(
      (att: {
        downloadUrl?: string | null;
        name: string;
        description?: string | null;
        mimeType?: string | null;
        createdAt: string;
        lastModifiedAt: string;
      }) => ({
        opportunity_attachment_id: null,
        mime_type: att.mimeType ?? null,
        file_name: att.name,
        file_description: att.description ?? null,
        download_url: att.downloadUrl ?? null,
        created_at: att.createdAt,
        updated_at: att.lastModifiedAt,
      })
    ) ?? null;

  return {
    result: {
      opportunity_id: common.id,
      legacy_opportunity_id: cf.legacySerialId?.value ?? null,
      opportunity_number: cf.federalOpportunityNumber?.value ?? null,
      opportunity_title: common.title ?? null,
      agency_code: agencyValue?.code ?? null,
      agency_name: agencyValue?.name ?? null,
      top_level_agency_name: agencyValue?.parentName ?? null,
      top_level_agency_code: agencyValue?.parentCode ?? null,
      category: cf.federalFundingSource?.value ?? null,
      opportunity_assistance_listings: opportunityAssistanceListings,
      summary,
      opportunity_status: opportunityStatus,
      attachments,
      created_at: createdAtStr,
      updated_at: updatedAtStr,
    },
    errors: [],
  };
}

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
    capabilities: ["customFields", "transforms"],
  },
  schemas: {
    Opportunity: {
      customFields,
      sourceSchema: GrantsGovOpportunitySchema,
      toCommon,
      fromCommon,
    },
  },
});

export default plugin;

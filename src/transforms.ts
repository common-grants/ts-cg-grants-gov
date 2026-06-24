import type { TransformResult } from "@common-grants/sdk/extensions";
import type { GrantsGovOpportunity } from "./schemas";

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
// Datetime helpers
// =============================================================================

/**
 * Normalizes any datetime (Date or string) to a grants.gov-compatible string:
 * UTC, microsecond precision (6 decimal places), `+00:00` offset suffix.
 * e.g. "2025-01-01T00:00:00.558102+00:00"
 *
 * When given a string already in UTC (Z or +00:00), fractional seconds up to 6
 * digits are preserved without going through a JS Date (which only has ms precision).
 */
function toGrantsGovDatetime(dt: Date | string): string {
  if (dt instanceof Date) {
    // Date only has ms precision → pad to 6 decimal places
    return dt.toISOString().replace(/\.(\d{3})Z$/, ".$1000+00:00");
  }
  const s = String(dt);
  const m = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/);
  if (!m) {
    return new Date(s).toISOString().replace(/\.(\d{3})Z$/, ".$1000+00:00");
  }
  const [, base, frac = "", tz = "Z"] = m;
  const paddedFrac = frac.padEnd(6, "0").slice(0, 6);
  if (tz === "Z" || tz === "+00:00") {
    return `${base}.${paddedFrac}+00:00`;
  }
  // Non-UTC offset: adjust via Date (sub-ms precision lost)
  return new Date(s).toISOString().replace(/\.(\d{3})Z$/, ".$1000+00:00");
}

// =============================================================================
// toCommon — Simpler.Grants.gov opportunity → CommonGrants Opportunity
// =============================================================================

export function toCommon(source: GrantsGovOpportunity): TransformResult<unknown> {
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
    if (
      summary.agency_email_address != null ||
      summary.agency_contact_description != null ||
      summary.agency_email_address_description != null
    ) {
      cf.contactInfo = {
        name: "contactInfo",
        fieldType: "object",
        value: {
          name: null,
          email: summary.agency_email_address,
          emailDescription: summary.agency_email_address_description,
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

    cf.summaryCreatedAt = {
      name: "summaryCreatedAt",
      fieldType: "string",
      value: summary.created_at,
    };

    cf.summaryUpdatedAt = {
      name: "summaryUpdatedAt",
      fieldType: "string",
      value: summary.updated_at,
    };

    if (summary.forecasted_post_date != null) {
      cf.forecastedPostDate = {
        name: "forecastedPostDate",
        fieldType: "string",
        value: summary.forecasted_post_date,
      };
    }

    if (summary.forecasted_close_date != null) {
      cf.forecastedCloseDate = {
        name: "forecastedCloseDate",
        fieldType: "string",
        value: summary.forecasted_close_date,
      };
    }

    if (summary.funding_instruments.length > 0) {
      cf.fundingInstruments = {
        name: "fundingInstruments",
        fieldType: "array",
        value: summary.funding_instruments,
      };
    }

    if (summary.funding_categories.length > 0) {
      cf.fundingCategories = {
        name: "fundingCategories",
        fieldType: "array",
        value: summary.funding_categories,
      };
    }
  }

  // Store original datetime strings to preserve microsecond precision across
  // the round-trip — UTCDateTimeSchema coerces createdAt/lastModifiedAt to Date
  cf.sourceCreatedAt = {
    name: "sourceCreatedAt",
    fieldType: "string",
    value: source.created_at,
  };
  cf.sourceUpdatedAt = {
    name: "sourceUpdatedAt",
    fieldType: "string",
    value: source.updated_at,
  };

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
      createdAt: new Date(source.created_at).toISOString(),
      lastModifiedAt: new Date(source.updated_at).toISOString(),
    },
    errors: [],
  };
}

// =============================================================================
// fromCommon — CommonGrants Opportunity → Simpler.Grants.gov opportunity
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromCommon(common: any): TransformResult<GrantsGovOpportunity> {
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

  // Prefer the raw custom-field strings (which bypass UTCDateTimeSchema coercion)
  // so microsecond precision is preserved; fall back to the standard fields.
  const createdAtStr = cf.sourceCreatedAt?.value
    ? toGrantsGovDatetime(cf.sourceCreatedAt.value as string)
    : toGrantsGovDatetime(common.createdAt as Date | string);
  const updatedAtStr = cf.sourceUpdatedAt?.value
    ? toGrantsGovDatetime(cf.sourceUpdatedAt.value as string)
    : toGrantsGovDatetime(common.lastModifiedAt as Date | string);

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
    forecasted_post_date: cf.forecastedPostDate?.value ?? null,
    forecasted_close_date: cf.forecastedCloseDate?.value ?? null,
    fiscal_year: cf.fiscalYear?.value ?? null,
    agency_contact_description: cf.contactInfo?.value?.description ?? null,
    agency_email_address: cf.contactInfo?.value?.email ?? null,
    agency_email_address_description: cf.contactInfo?.value?.emailDescription ?? null,
    funding_instruments: cf.fundingInstruments?.value ?? [],
    funding_categories: cf.fundingCategories?.value ?? [],
    applicant_types: applicantTypes,
    created_at: cf.summaryCreatedAt?.value
      ? toGrantsGovDatetime(cf.summaryCreatedAt.value as string)
      : createdAtStr,
    updated_at: cf.summaryUpdatedAt?.value
      ? toGrantsGovDatetime(cf.summaryUpdatedAt.value as string)
      : updatedAtStr,
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
    ) ?? [];

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

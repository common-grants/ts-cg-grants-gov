import { describe, it, expect } from "vitest";
import plugin from "../index";

// =============================================================================
// Test Data
// =============================================================================

const schema = plugin.schemas.Opportunity.commonSchema;
const { toCommon, fromCommon } = plugin.schemas.Opportunity;

const baseOpportunity = {
  id: "573525f2-8e15-4405-83fb-e6523511d893",
  title: "STEM Education Grant Program",
  description: "A grant program focused on STEM education",
  status: { value: "open" },
  createdAt: "2025-01-01T00:00:00Z",
  lastModifiedAt: "2025-01-15T00:00:00Z",
};

const validCustomFields = {
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
  assistanceListings: {
    name: "assistanceListings",
    fieldType: "array",
    value: [{ identifier: "93.123", programTitle: "STEM Education" }],
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
  attachments: {
    name: "attachments",
    fieldType: "array",
    value: [
      {
        downloadUrl: "https://example.com/nofo.pdf",
        name: "NOFO.pdf",
        description: "Notice of Funding Opportunity",
        sizeInBytes: 102400,
        mimeType: "application/pdf",
        createdAt: "2025-01-01T00:00:00Z",
        lastModifiedAt: "2025-01-10T00:00:00Z",
      },
    ],
  },
  federalFundingSource: {
    name: "federalFundingSource",
    fieldType: "string",
    value: "Discretionary",
  },
  contactInfo: {
    name: "contactInfo",
    fieldType: "object",
    value: {
      name: "Jane Doe",
      email: "jane.doe@example.com",
      phone: "555-0100",
      description: "Program Officer",
    },
  },
  additionalInfo: {
    name: "additionalInfo",
    fieldType: "object",
    value: {
      url: "https://example.com/info",
      description: "More details",
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
    value: { isRequired: true },
  },
};

const baseGrantsGovOpportunity = {
  opportunity_id: "573525f2-8e15-4405-83fb-e6523511d893",
  opportunity_title: "STEM Education Grant Program",
  opportunity_status: "posted" as const,
  opportunity_number: "HHS-2025-001",
  legacy_opportunity_id: 12345,
  agency_code: "HHS",
  agency_name: "Department of Health and Human Services",
  top_level_agency_name: null,
  top_level_agency_code: null,
  category: "D",
  opportunity_assistance_listings: [
    { assistance_listing_number: "93.123", program_title: "STEM Education" },
  ],
  summary: {
    summary_description: "A grant program focused on STEM education",
    is_cost_sharing: true,
    is_forecast: false,
    post_date: "2025-01-01",
    close_date: "2025-06-01",
    expected_number_of_awards: 10,
    estimated_total_program_funding: 5000000,
    award_floor: 50000,
    award_ceiling: 500000,
    additional_info_url: "https://example.com/info",
    additional_info_url_description: "More details",
    forecasted_post_date: null,
    forecasted_close_date: null,
    fiscal_year: 2025,
    agency_contact_description: "Contact the program officer",
    agency_email_address: "grants@hhs.gov",
    agency_email_address_description: null,
    funding_instruments: ["grant"],
    funding_categories: ["health"],
    applicant_types: ["state_governments", "nonprofits_non_higher_education_with_501c3"],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-15T00:00:00Z",
  },
  attachments: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-15T00:00:00Z",
};

// =============================================================================
// Schema tests
// =============================================================================

describe("Grants.gov plugin", () => {
  describe("schema", () => {
    describe("expected data", () => {
      it("parses an opportunity with all custom fields", () => {
        const result = schema.parse({
          ...baseOpportunity,
          customFields: validCustomFields,
        });

        expect(result.title).toBe("STEM Education Grant Program");
        expect(result.customFields?.agency?.value).toEqual({
          code: "HHS",
          name: "Department of Health and Human Services",
          parentName: null,
          parentCode: null,
        });
        expect(result.customFields?.legacySerialId?.value).toBe(12345);
        expect(result.customFields?.federalOpportunityNumber?.value).toBe("HHS-2025-001");
        expect(result.customFields?.assistanceListings?.value).toHaveLength(1);
        expect(result.customFields?.fiscalYear?.value).toBe(2025);
        expect(result.customFields?.costSharing?.value).toEqual({ isRequired: true });
      });

      it("parses an opportunity without custom fields", () => {
        const result = schema.parse(baseOpportunity);

        expect(result.title).toBe("STEM Education Grant Program");
        expect(result.customFields).toBeUndefined();
      });
    });

    describe("missing data", () => {
      it("accepts nullish values in agency fields", () => {
        const result = schema.parse({
          ...baseOpportunity,
          customFields: {
            agency: {
              name: "agency",
              fieldType: "object",
              value: { code: "HHS", name: null, parentName: null, parentCode: null },
            },
          },
        });

        expect(result.customFields?.agency?.value.code).toBe("HHS");
        expect(result.customFields?.agency?.value.name).toBeNull();
      });

      it("accepts nullish values in assistance listing fields", () => {
        const result = schema.parse({
          ...baseOpportunity,
          customFields: {
            assistanceListings: {
              name: "assistanceListings",
              fieldType: "array",
              value: [{ identifier: null, programTitle: null }],
            },
          },
        });

        expect(result.customFields?.assistanceListings?.value[0].identifier).toBeNull();
      });

      it("accepts nullish values in contact info fields", () => {
        const result = schema.parse({
          ...baseOpportunity,
          customFields: {
            contactInfo: {
              name: "contactInfo",
              fieldType: "object",
              value: { name: null, email: null, phone: null, description: null },
            },
          },
        });

        expect(result.customFields?.contactInfo?.value.name).toBeNull();
      });
    });

    describe("invalid data", () => {
      it("rejects an attachment missing required fields", () => {
        const result = schema.safeParse({
          ...baseOpportunity,
          customFields: {
            attachments: {
              name: "attachments",
              fieldType: "array",
              value: [
                {
                  downloadUrl: "https://example.com/nofo.pdf",
                  description: "A document",
                },
              ],
            },
          },
        });

        expect(result.success).toBe(false);
        const paths = result.error?.issues.map(i => i.path.join("."));
        expect(paths).toContain("customFields.attachments.value.0.name");
        expect(paths).toContain("customFields.attachments.value.0.createdAt");
        expect(paths).toContain("customFields.attachments.value.0.lastModifiedAt");
        result.error?.issues.forEach(issue => {
          expect(issue.code).toBe("invalid_type");
          expect(issue.message).toBe("Required");
        });
      });

      it("rejects an agency with the wrong type for a required field", () => {
        const result = schema.safeParse({
          ...baseOpportunity,
          customFields: {
            agency: {
              name: "agency",
              fieldType: "object",
              value: { code: 123, name: "HHS" }, // code should be string
            },
          },
        });

        expect(result.success).toBe(false);
        const issue = result.error?.issues[0];
        expect(issue?.code).toBe("invalid_type");
        expect(issue?.path).toEqual(["customFields", "agency", "value", "code"]);
        expect(issue?.message).toBe("Expected string, received number");
      });

      it("rejects an attachment with an invalid datetime", () => {
        const result = schema.safeParse({
          ...baseOpportunity,
          customFields: {
            attachments: {
              name: "attachments",
              fieldType: "array",
              value: [
                {
                  name: "file.pdf",
                  sizeInBytes: 100,
                  mimeType: "application/pdf",
                  createdAt: "not-a-date",
                  lastModifiedAt: "2025-01-01T00:00:00Z",
                },
              ],
            },
          },
        });

        expect(result.success).toBe(false);
        const issue = result.error?.issues[0];
        expect(issue?.code).toBe("invalid_string");
        expect(issue?.path).toEqual(["customFields", "attachments", "value", 0, "createdAt"]);
        expect(issue?.message).toBe("Invalid datetime");
      });

      it("rejects a cost sharing value with wrong type", () => {
        const result = schema.safeParse({
          ...baseOpportunity,
          customFields: {
            costSharing: {
              name: "costSharing",
              fieldType: "object",
              value: { isRequired: "yes" }, // should be boolean
            },
          },
        });

        expect(result.success).toBe(false);
        const issue = result.error?.issues[0];
        expect(issue?.code).toBe("invalid_type");
        expect(issue?.path).toEqual(["customFields", "costSharing", "value", "isRequired"]);
        expect(issue?.message).toBe("Expected boolean, received string");
      });
    });

    describe("extra fields", () => {
      it("passes through unregistered custom fields", () => {
        const result = schema.parse({
          ...baseOpportunity,
          customFields: {
            ...validCustomFields,
            unknownField: {
              name: "unknownField",
              fieldType: "string",
              value: "extra data",
            },
          },
        });

        expect(result.customFields?.agency?.value.code).toBe("HHS");
        expect((result.customFields as Record<string, unknown>)["unknownField"]).toBeDefined();
      });

      it("strips extra properties from custom field values", () => {
        const result = schema.parse({
          ...baseOpportunity,
          customFields: {
            agency: {
              name: "agency",
              fieldType: "object",
              value: {
                code: "HHS",
                name: "HHS",
                parentName: null,
                parentCode: null,
                extraProp: "should be stripped",
              },
            },
          },
        });

        expect(result.customFields?.agency?.value.code).toBe("HHS");
        expect(result.customFields?.agency?.value).not.toHaveProperty("extraProp");
      });
    });
  });

  // =============================================================================
  // Transform tests
  // =============================================================================

  describe("transforms", () => {
    describe("toCommon", () => {
      it("maps core fields from a grants.gov opportunity", () => {
        const { result, errors } = toCommon(baseGrantsGovOpportunity);

        expect(errors).toHaveLength(0);
        expect(result.id).toBe("573525f2-8e15-4405-83fb-e6523511d893");
        expect(result.title).toBe("STEM Education Grant Program");
        expect(result.description).toBe("A grant program focused on STEM education");
      });

      it("maps opportunity_status to CommonGrants status values", () => {
        const statuses = [
          { source: "posted", expected: "open" },
          { source: "forecasted", expected: "forecasted" },
          { source: "closed", expected: "closed" },
          { source: "archived", expected: "closed" },
        ] as const;

        for (const { source, expected } of statuses) {
          const { result } = toCommon({ ...baseGrantsGovOpportunity, opportunity_status: source });
          expect(result.status.value).toBe(expected);
        }
      });

      it("maps funding fields", () => {
        const { result, errors } = toCommon(baseGrantsGovOpportunity);

        expect(errors).toHaveLength(0);
        expect(result.funding?.totalAmountAvailable).toEqual({ amount: "5000000", currency: "USD" });
        expect(result.funding?.minAwardAmount).toEqual({ amount: "50000", currency: "USD" });
        expect(result.funding?.maxAwardAmount).toEqual({ amount: "500000", currency: "USD" });
        expect(result.funding?.estimatedAwardCount).toBe(10);
      });

      it("maps post and close dates as singleDate events", () => {
        const { result, errors } = toCommon(baseGrantsGovOpportunity);

        expect(errors).toHaveLength(0);
        expect(result.keyDates?.postDate?.eventType).toBe("singleDate");
        expect(result.keyDates?.closeDate?.eventType).toBe("singleDate");
      });

      it("maps applicant_types to acceptedApplicantTypes", () => {
        const { result, errors } = toCommon(baseGrantsGovOpportunity);

        expect(errors).toHaveLength(0);
        expect(result.acceptedApplicantTypes).toHaveLength(2);
        expect(result.acceptedApplicantTypes?.[0].value).toBe("government_state");
        expect(result.acceptedApplicantTypes?.[1].value).toBe("non_profit_with_501c3");
      });

      it("maps unknown applicant types to 'custom' with customValue", () => {
        const { result } = toCommon({
          ...baseGrantsGovOpportunity,
          summary: { ...baseGrantsGovOpportunity.summary, applicant_types: ["public_and_indian_housing_authorities"] },
        });

        expect(result.acceptedApplicantTypes?.[0].value).toBe("custom");
        expect(result.acceptedApplicantTypes?.[0].customValue).toBe(
          "public_and_indian_housing_authorities"
        );
      });

      it("maps agency fields to customFields.agency", () => {
        const { result, errors } = toCommon(baseGrantsGovOpportunity);

        expect(errors).toHaveLength(0);
        expect(result.customFields?.agency?.value).toEqual({
          code: "HHS",
          name: "Department of Health and Human Services",
          parentName: null,
          parentCode: null,
        });
      });

      it("maps assistance listings to customFields.assistanceListings", () => {
        const { result, errors } = toCommon(baseGrantsGovOpportunity);

        expect(errors).toHaveLength(0);
        expect(result.customFields?.assistanceListings?.value).toEqual([
          { identifier: "93.123", programTitle: "STEM Education" },
        ]);
      });

      it("maps contact and additional info to custom fields", () => {
        const { result, errors } = toCommon(baseGrantsGovOpportunity);

        expect(errors).toHaveLength(0);
        expect(result.customFields?.contactInfo?.value?.email).toBe("grants@hhs.gov");
        expect(result.customFields?.contactInfo?.value?.description).toBe(
          "Contact the program officer"
        );
        expect(result.customFields?.additionalInfo?.value?.url).toBe("https://example.com/info");
      });

      it("maps legacy_opportunity_id, fiscal_year, and cost_sharing to custom fields", () => {
        const { result, errors } = toCommon(baseGrantsGovOpportunity);

        expect(errors).toHaveLength(0);
        expect(result.customFields?.legacySerialId?.value).toBe(12345);
        expect(result.customFields?.fiscalYear?.value).toBe(2025);
        expect(result.customFields?.costSharing?.value?.isRequired).toBe(true);
      });

      it("omits optional custom fields when source values are null", () => {
        const sparse = {
          ...baseGrantsGovOpportunity,
          legacy_opportunity_id: null,
          opportunity_number: null,
          category: null,
          opportunity_assistance_listings: [],
          summary: {
            ...baseGrantsGovOpportunity.summary,
            fiscal_year: null,
            is_cost_sharing: null,
            agency_email_address: null,
            agency_contact_description: null,
            additional_info_url: null,
            additional_info_url_description: null,
          },
        };

        const { result, errors } = toCommon(sparse);

        expect(errors).toHaveLength(0);
        expect(result.customFields?.legacySerialId).toBeUndefined();
        expect(result.customFields?.federalOpportunityNumber).toBeUndefined();
        expect(result.customFields?.assistanceListings).toBeUndefined();
        expect(result.customFields?.federalFundingSource).toBeUndefined();
        expect(result.customFields?.fiscalYear).toBeUndefined();
        expect(result.customFields?.costSharing).toBeUndefined();
        expect(result.customFields?.contactInfo).toBeUndefined();
        expect(result.customFields?.additionalInfo).toBeUndefined();
      });
    });

    describe("fromCommon", () => {
      it("round-trips core fields through toCommon then fromCommon", () => {
        const { result: common } = toCommon(baseGrantsGovOpportunity);
        const { result: source, errors } = fromCommon(common);

        expect(errors).toHaveLength(0);
        expect(source.opportunity_id).toBe("573525f2-8e15-4405-83fb-e6523511d893");
        expect(source.opportunity_title).toBe("STEM Education Grant Program");
      });

      it("maps CommonGrants status back to grants.gov opportunity_status", () => {
        const statuses = [
          { common: "open", expected: "posted" },
          { common: "forecasted", expected: "forecasted" },
          { common: "closed", expected: "closed" },
          { common: "custom", expected: "posted" },
        ] as const;

        for (const { common: statusValue, expected } of statuses) {
          const { result } = fromCommon({ ...schema.parse(baseOpportunity), status: { value: statusValue } });
          expect(result.opportunity_status).toBe(expected);
        }
      });

      it("maps acceptedApplicantTypes back to applicant_types strings", () => {
        const { result: common } = toCommon(baseGrantsGovOpportunity);
        const { result: source } = fromCommon(common);

        expect(source.summary?.applicant_types).toContain("state_governments");
        expect(source.summary?.applicant_types).toContain("nonprofits_non_higher_education_with_501c3");
      });

      it("maps customFields.agency back to agency origin fields", () => {
        const { result: common } = toCommon(baseGrantsGovOpportunity);
        const { result: source } = fromCommon(common);

        expect(source.agency_code).toBe("HHS");
        expect(source.agency_name).toBe("Department of Health and Human Services");
        expect(source.top_level_agency_name).toBeNull();
        expect(source.top_level_agency_code).toBeNull();
      });

      it("maps customFields.assistanceListings back to opportunity_assistance_listings", () => {
        const { result: common } = toCommon(baseGrantsGovOpportunity);
        const { result: source } = fromCommon(common);

        expect(source.opportunity_assistance_listings).toEqual([
          { assistance_listing_number: "93.123", program_title: "STEM Education" },
        ]);
      });

      it("maps customFields.legacySerialId back to legacy_opportunity_id", () => {
        const { result: common } = toCommon(baseGrantsGovOpportunity);
        const { result: source } = fromCommon(common);

        expect(source.legacy_opportunity_id).toBe(12345);
      });

      it("maps funding amounts back from decimal strings to integers", () => {
        const { result: common } = toCommon(baseGrantsGovOpportunity);
        const { result: source } = fromCommon(common);

        expect(source.summary?.estimated_total_program_funding).toBe(5000000);
        expect(source.summary?.award_floor).toBe(50000);
        expect(source.summary?.award_ceiling).toBe(500000);
        expect(source.summary?.expected_number_of_awards).toBe(10);
      });

      it("maps customFields.contactInfo back to summary agency contact fields", () => {
        const { result: common } = toCommon(baseGrantsGovOpportunity);
        const { result: source } = fromCommon(common);

        expect(source.summary?.agency_email_address).toBe("grants@hhs.gov");
        expect(source.summary?.agency_contact_description).toBe("Contact the program officer");
      });

      it("maps customFields.additionalInfo back to summary additional_info fields", () => {
        const { result: common } = toCommon(baseGrantsGovOpportunity);
        const { result: source } = fromCommon(common);

        expect(source.summary?.additional_info_url).toBe("https://example.com/info");
        expect(source.summary?.additional_info_url_description).toBe("More details");
      });

      it("maps customFields.fiscalYear back to summary.fiscal_year", () => {
        const { result: common } = toCommon(baseGrantsGovOpportunity);
        const { result: source } = fromCommon(common);

        expect(source.summary?.fiscal_year).toBe(2025);
      });

      it("maps customFields.costSharing back to summary.is_cost_sharing", () => {
        const { result: common } = toCommon(baseGrantsGovOpportunity);
        const { result: source } = fromCommon(common);

        expect(source.summary?.is_cost_sharing).toBe(true);
      });
    });

    // =============================================================================
    // Round-trip field preservation
    // =============================================================================

    describe("round-trip field preservation", () => {
      // A fully-populated source object covering every field in GrantsGovOpportunitySchema
      const fullSource = {
        opportunity_id: "573525f2-8e15-4405-83fb-e6523511d893",
        legacy_opportunity_id: 12345,
        opportunity_number: "HHS-2025-001",
        opportunity_title: "STEM Education Grant Program",
        agency_code: "HHS",
        agency_name: "Department of Health and Human Services",
        top_level_agency_name: "HHS Parent Agency",
        top_level_agency_code: "HHS-TOP",
        category: "D",
        opportunity_assistance_listings: [
          { assistance_listing_number: "93.123", program_title: "STEM Education" },
          { assistance_listing_number: "93.456", program_title: "Youth Development" },
        ],
        summary: {
          summary_description: "A grant program focused on STEM education in underserved communities",
          is_cost_sharing: true,
          is_forecast: false,
          close_date: "2025-06-01",
          post_date: "2025-01-01",
          expected_number_of_awards: 10,
          estimated_total_program_funding: 5000000,
          award_floor: 50000,
          award_ceiling: 500000,
          additional_info_url: "https://example.com/info",
          additional_info_url_description: "More details about the program",
          forecasted_post_date: "2024-12-01", // NOT preserved — not captured in CommonGrants
          forecasted_close_date: "2025-05-15", // NOT preserved — not captured in CommonGrants
          fiscal_year: 2025,
          agency_contact_description: "Contact the program officer for questions",
          agency_email_address: "grants@hhs.gov",
          agency_email_address_description: "Primary contact email", // NOT preserved — not captured in contactInfo
          funding_instruments: ["grant", "cooperative_agreement"], // NOT preserved — not mapped to CommonGrants
          funding_categories: ["health", "education"], // NOT preserved — not mapped to CommonGrants
          applicant_types: ["state_governments", "nonprofits_non_higher_education_with_501c3"],
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-15T00:00:00Z",
        },
        attachments: [
          {
            opportunity_attachment_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // NOT preserved — set to null
            mime_type: "application/pdf",
            file_name: "NOFO.pdf",
            file_description: "Notice of Funding Opportunity",
            download_url: "https://example.com/nofo.pdf",
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-10T00:00:00Z",
          },
        ],
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-15T00:00:00Z",
      };

      it("preserves all mappable top-level fields", () => {
        const { result: common } = toCommon(fullSource);
        const { result: roundTripped, errors } = fromCommon(common);

        expect(errors).toHaveLength(0);
        expect(roundTripped.opportunity_id).toBe(fullSource.opportunity_id);
        expect(roundTripped.legacy_opportunity_id).toBe(fullSource.legacy_opportunity_id);
        expect(roundTripped.opportunity_number).toBe(fullSource.opportunity_number);
        expect(roundTripped.opportunity_title).toBe(fullSource.opportunity_title);
        expect(roundTripped.agency_code).toBe(fullSource.agency_code);
        expect(roundTripped.agency_name).toBe(fullSource.agency_name);
        expect(roundTripped.top_level_agency_name).toBe(fullSource.top_level_agency_name);
        expect(roundTripped.top_level_agency_code).toBe(fullSource.top_level_agency_code);
        expect(roundTripped.category).toBe(fullSource.category);
        expect(roundTripped.opportunity_status).toBe("posted"); // posted → open → posted
        // UTCDateTimeSchema normalizes datetime strings through a Date, so compare via Date
        expect(new Date(roundTripped.created_at).getTime()).toBe(new Date(fullSource.created_at).getTime());
        expect(new Date(roundTripped.updated_at).getTime()).toBe(new Date(fullSource.updated_at).getTime());
      });

      it("preserves all mappable summary fields", () => {
        const { result: common } = toCommon(fullSource);
        const { result: roundTripped, errors } = fromCommon(common);

        expect(errors).toHaveLength(0);
        const s = roundTripped.summary!;
        const orig = fullSource.summary;

        expect(s.summary_description).toBe(orig.summary_description);
        expect(s.is_cost_sharing).toBe(orig.is_cost_sharing);
        expect(s.post_date).toBe(orig.post_date);
        expect(s.close_date).toBe(orig.close_date);
        expect(s.expected_number_of_awards).toBe(orig.expected_number_of_awards);
        expect(s.estimated_total_program_funding).toBe(orig.estimated_total_program_funding);
        expect(s.award_floor).toBe(orig.award_floor);
        expect(s.award_ceiling).toBe(orig.award_ceiling);
        expect(s.additional_info_url).toBe(orig.additional_info_url);
        expect(s.additional_info_url_description).toBe(orig.additional_info_url_description);
        expect(s.fiscal_year).toBe(orig.fiscal_year);
        expect(s.agency_contact_description).toBe(orig.agency_contact_description);
        expect(s.agency_email_address).toBe(orig.agency_email_address);
        expect(s.applicant_types).toEqual(expect.arrayContaining(orig.applicant_types));
        expect(s.applicant_types).toHaveLength(orig.applicant_types.length);
        // UTCDateTimeSchema normalizes datetime strings through a Date, so compare via Date
        expect(new Date(s.created_at).getTime()).toBe(new Date(orig.created_at).getTime());
        expect(new Date(s.updated_at).getTime()).toBe(new Date(orig.updated_at).getTime());
      });

      it("preserves all mappable assistance listing fields", () => {
        const { result: common } = toCommon(fullSource);
        const { result: roundTripped, errors } = fromCommon(common);

        expect(errors).toHaveLength(0);
        expect(roundTripped.opportunity_assistance_listings).toHaveLength(2);
        expect(roundTripped.opportunity_assistance_listings).toEqual([
          { assistance_listing_number: "93.123", program_title: "STEM Education" },
          { assistance_listing_number: "93.456", program_title: "Youth Development" },
        ]);
      });

      it("preserves all mappable attachment fields", () => {
        const { result: common } = toCommon(fullSource);
        const { result: roundTripped, errors } = fromCommon(common);

        expect(errors).toHaveLength(0);
        expect(roundTripped.attachments).toHaveLength(1);
        const att = roundTripped.attachments![0];
        const origAtt = fullSource.attachments[0];

        expect(att.mime_type).toBe(origAtt.mime_type);
        expect(att.file_name).toBe(origAtt.file_name);
        expect(att.file_description).toBe(origAtt.file_description);
        expect(att.download_url).toBe(origAtt.download_url);
        expect(att.created_at).toBe(origAtt.created_at);
        expect(att.updated_at).toBe(origAtt.updated_at);
      });

      it("documents fields intentionally NOT preserved through the round-trip", () => {
        const { result: common } = toCommon(fullSource);
        const { result: roundTripped } = fromCommon(common);

        const s = roundTripped.summary!;
        const att = roundTripped.attachments![0];

        // opportunity_attachment_id: not stored in CommonGrants custom fields
        expect(att.opportunity_attachment_id).toBeNull();

        // forecasted_post_date / forecasted_close_date: no CommonGrants equivalent
        expect(s.forecasted_post_date).toBeNull();
        expect(s.forecasted_close_date).toBeNull();

        // agency_email_address_description: not captured in contactInfo custom field
        expect(s.agency_email_address_description).toBeNull();

        // funding_instruments: no CommonGrants equivalent — reset to []
        expect(s.funding_instruments).toEqual([]);

        // funding_categories: no CommonGrants equivalent — reset to []
        expect(s.funding_categories).toEqual([]);

        // is_forecast: derived from opportunity_status, not stored independently
        expect(s.is_forecast).toBe(false);
      });
    });
  });
});

import { describe, it, expect } from "vitest";
import plugin from "../index";

// =============================================================================
// Test Data
// =============================================================================

const schema = plugin.schemas.Opportunity;

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

// =============================================================================
// Tests
// =============================================================================

describe("Grants.gov plugin", () => {
  // =============================================================================
  // Expected Data
  // =============================================================================

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

  // =============================================================================
  // Missing Data
  // =============================================================================

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

  // =============================================================================
  // Invalid Data
  // =============================================================================

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

  // =============================================================================
  // Extra Fields
  // =============================================================================

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

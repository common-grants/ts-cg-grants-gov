import { afterEach, describe, expect, it, vi } from "vitest";
import { Auth } from "@common-grants/sdk/client";
import { F, FilterError, type CustomFilterInput } from "@common-grants/sdk/extensions";
import plugin from "../index";

// The SGG search custom filters the plugin registers (#903), aligned with the
// filters the Simpler.Grants.gov API accepts (#944).
const EXPECTED = ["agency", "applicantType", "fundingInstrument", "costSharing"];

// A base URL that is never actually contacted: every test stubs `fetch`.
const BASE_URL = "https://api.example.test";

/**
 * A single opportunity carrying Grants.gov custom fields, shaped so the plugin's
 * bound Opportunity schema parses it into typed `customFields`.
 */
const OPPORTUNITY_WITH_CUSTOM_FIELDS = {
  id: "573525f2-8e15-4405-83fb-e6523511d893",
  title: "STEM Education Grant Program",
  status: { value: "open" },
  description: "A grant program focused on STEM education",
  createdAt: "2025-01-01T00:00:00Z",
  lastModifiedAt: "2025-01-15T00:00:00Z",
  customFields: {
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
  },
};

/**
 * A second opportunity whose `agency` custom field is valid under the SDK's
 * generic `CustomFieldSchema` (whose `value` is `z.unknown()`) but invalid under
 * the plugin's registered `agency` schema, which requires a string `code`. It
 * only fails to parse when `getClient()` binds the plugin schema at runtime.
 */
const OPPORTUNITY_WITH_INVALID_AGENCY = {
  id: "0b1e2c3d-4f56-4789-8abc-def012345678",
  title: "Malformed Agency Opportunity",
  status: { value: "open" },
  description: "Its agency code is a number, invalid under the plugin's agency schema",
  createdAt: "2025-02-01T00:00:00Z",
  lastModifiedAt: "2025-02-15T00:00:00Z",
  customFields: {
    agency: {
      name: "agency",
      fieldType: "object",
      value: {
        code: 12345, // plugin's AgencyValueSchema requires a string code
        name: "Department of Health and Human Services",
        parentName: null,
        parentCode: null,
      },
    },
  },
};

/** Build a valid CommonGrants filtered-search envelope wrapping the given items. */
function searchEnvelope(items: unknown[]) {
  return {
    status: 200,
    message: "Success",
    items,
    paginationInfo: {
      page: 1,
      pageSize: items.length,
      totalItems: items.length,
      totalPages: 1,
    },
    sortInfo: { sortBy: "lastModifiedAt", sortOrder: "asc" },
    filterInfo: { filters: {} },
  };
}

describe("Grants.gov plugin custom filters", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers the SGG custom filters on opportunities.search", () => {
    const filters = plugin.routes?.opportunities?.search?.filters ?? {};
    expect(Object.keys(filters)).toEqual(expect.arrayContaining(EXPECTED));
  });

  it("sends the four registered custom filters as a POST search body", async () => {
    // This test isolates request serialization; response parsing is covered
    // separately, so an empty-items envelope is enough here.
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(searchEnvelope([])));

    const client = plugin.getClient({ baseUrl: BASE_URL, auth: Auth.apiKey("test-key") });

    await client.opportunities.search({
      filters: {
        status: F.in(["open"]),
        agency: F.in(["HHS"]),
        applicantType: F.in(["state_governments"]),
        fundingInstrument: F.in(["grant"]),
        costSharing: F.eq(false),
      },
      page: 1,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe(`${BASE_URL}/common-grants/opportunities/search`);
    expect(init?.method).toBe("POST");

    const body = JSON.parse(String(init?.body));
    // `status` is a default filter, so it lands in the top-level bucket, not customFilters.
    expect(body.filters.status).toEqual({ operator: "in", value: ["open"] });
    // The four registered custom filters land in customFilters, and only those.
    expect(body.filters.customFilters).toEqual({
      agency: { operator: "in", value: ["HHS"] },
      applicantType: { operator: "in", value: ["state_governments"] },
      fundingInstrument: { operator: "in", value: ["grant"] },
      costSharing: { operator: "eq", value: false },
    });
  });

  it("parses returned rows through the plugin's bound schema, not the generic base schema", async () => {
    // Two rows: one valid under the plugin's agency schema, one valid only under
    // the SDK's generic CustomFieldSchema. If getClient() fell back to
    // OpportunityBaseSchema (agency value = z.unknown()), the malformed row would
    // parse and land in items; binding the plugin schema partitions it to errors.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        searchEnvelope([OPPORTUNITY_WITH_CUSTOM_FIELDS, OPPORTUNITY_WITH_INVALID_AGENCY])
      )
    );

    const client = plugin.getClient({ baseUrl: BASE_URL, auth: Auth.apiKey("test-key") });

    const result = await client.opportunities.search({
      filters: { agency: F.in(["HHS"]) },
      page: 1,
    });

    // The valid row survives with meaningful typed access to its custom fields.
    expect(result.items).toHaveLength(1);
    expect(result.items[0].customFields?.agency?.value.code).toBe("HHS");
    // The malformed row is rejected by the plugin schema and surfaces as a row-parse error.
    expect(result.errors).toHaveLength(1);
  });

  it("rejects a wrong-typed value for a registered filter before any request (fail-fast)", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(searchEnvelope([])));

    const client = plugin.getClient({ baseUrl: BASE_URL, auth: Auth.apiKey("test-key") });

    // costSharing is a booleanComparison; an array-operator value is the wrong
    // family. That is a compile-time error too, so a narrow cast at the call site
    // exercises the runtime backstop.
    await expect(
      client.opportunities.search({
        filters: {
          costSharing: F.in(["not-a-bool"]) as unknown as CustomFilterInput<"booleanComparison">,
        },
        page: 1,
      })
    ).rejects.toBeInstanceOf(FilterError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

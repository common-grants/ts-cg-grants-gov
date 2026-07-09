import { describe, it, expect } from "vitest";
import { classifyFilters, F, FilterError } from "@common-grants/sdk/extensions";
import plugin from "../index";

// The SGG search custom filters the plugin registers (#903), aligned with the
// filters the Simpler.Grants.gov API accepts (#944).
const EXPECTED = ["agency", "applicantType", "fundingInstrument", "costSharing"];

describe("Grants.gov plugin custom filters", () => {
  it("registers the SGG custom filters on opportunities.search", () => {
    const filters = plugin.routes?.opportunities?.search?.filters ?? {};
    expect(Object.keys(filters)).toEqual(expect.arrayContaining(EXPECTED));
  });

  it("rejects a wrong-typed value for a registered filter (fail-fast)", () => {
    // costSharing is a booleanComparison; an array-operator value is rejected
    // before any request. An unregistered (ad-hoc) key with a well-formed array
    // value would pass, so this only holds because the filter is genuinely
    // registered and typed.
    const routes = plugin.routes;
    if (!routes) throw new Error("plugin registered no routes");
    expect(() =>
      classifyFilters(routes, "opportunities", "search", {
        costSharing: F.in(["not-a-bool"]),
      })
    ).toThrow(FilterError);
  });
});

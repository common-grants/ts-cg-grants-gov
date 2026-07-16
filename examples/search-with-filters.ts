/**
 * Example: exercise the Grants.gov plugin's custom search filters (#903)
 * against the live Simpler.Grants.gov API.
 *
 * The plugin registers four custom filters on `opportunities.search`:
 *
 *   - agency            (stringArray)       -> F.in([...])
 *   - applicantType     (stringArray)       -> F.in([...])
 *   - fundingInstrument (stringArray)       -> F.in([...])
 *   - costSharing       (booleanComparison) -> F.eq(true | false)
 *
 * Because the client comes from `plugin.getClient()`, the plugin's registered
 * routes are baked in: inside each `search({ filters })` call below, the filter
 * keys autocomplete and every value's shape is narrowed to its declared
 * `filterType`. The `search()` calls are written inline (not funneled through a
 * generic helper) precisely so that typing is visible at each call site. The
 * `@ts-expect-error` block near the bottom shows the enforcement from the other
 * side: wrong value families are rejected at compile time.
 *
 * At runtime, registered filters are also validated locally (fail-fast, before
 * any request) against their declared `filterType`. The result reports the
 * classified filters sent on the wire and a parsed opportunity from the API.
 *
 * Run with: `pnpm example:filters`
 *
 * Requires an API key for the live API. Set it before running:
 *
 *   export SGG_API_KEY="your-api-key"
 *   pnpm example:filters
 *
 * Optionally override the base URL (defaults to the production API):
 *
 *   export SGG_BASE_URL="https://api.simpler.grants.gov"
 */

import { z } from "zod";
import { Auth, type SearchResult } from "@common-grants/sdk/client";
import { F } from "@common-grants/sdk/extensions";
import plugin from "../src/index";
import { runSearchScenario } from "./search-with-filters-output";

const BASE_URL = process.env.SGG_BASE_URL ?? "https://api.simpler.grants.gov";
const API_KEY = process.env.SGG_API_KEY;

if (!API_KEY) {
  console.error(
    [
      "SGG_API_KEY is not set.",
      "",
      "This example calls the live Simpler.Grants.gov API, which requires an API key.",
      "Set it and re-run:",
      "",
      '  export SGG_API_KEY="your-api-key"',
      "  pnpm example:filters",
      "",
      "Need a key? See https://api.simpler.grants.gov/docs",
    ].join("\n")
  );
  process.exit(1);
}

// The plugin binds its Opportunity schema and its registered routes/filters, so
// `search({ filters })` type-checks and narrows the custom filter names without
// passing a per-call schema or constructor routes.
const client = plugin.getClient({
  baseUrl: BASE_URL,
  auth: Auth.apiKey(API_KEY),
  pageSize: 5,
});

/** A parsed opportunity, with the plugin's Grants.gov custom fields typed. */
type Opportunity = z.infer<typeof plugin.schemas.Opportunity.commonSchema>;

/**
 * Print an opportunity's title and id, then the Grants.gov custom-field values
 * beneath it. Member access is typed and enforced by the plugin's bound schema
 * (e.g. `agency.value.name` narrows to `string | null | undefined`).
 */
function logOpportunity(opp: Opportunity): void {
  const cf = opp.customFields;
  console.log(`  ${opp.title} (${opp.id})`);
  console.log(`    agency:             ${cf?.agency?.value.name} (${cf?.agency?.value.code})`);
  console.log(`    federalOppNumber:   ${cf?.federalOpportunityNumber?.value}`);
  console.log(`    legacySerialId:     ${cf?.legacySerialId?.value}`);
  console.log(`    fundingInstruments: ${cf?.fundingInstruments?.value?.join(", ")}`);
  console.log(`    assistanceListings: ${cf?.assistanceListings?.value?.length ?? 0}`);
}

/**
 * Run one inline search and print the outcome. The typed `search()` call lives
 * at the call site (in `main`). Each scenario is isolated: a thrown FilterError
 * (bad local value) or an HTTP error is caught here so the rest still run.
 */
async function run(
  label: string,
  search: () => Promise<SearchResult<Opportunity>>
): Promise<boolean> {
  return runSearchScenario(label, search, logOpportunity);
}

async function main(): Promise<boolean> {
  console.log(`Base URL: ${BASE_URL}`);
  console.log(
    `Registered custom filters: ${Object.keys(
      plugin.routes?.opportunities?.search?.filters ?? {}
    ).join(", ")}`
  );
  let ok = true;

  // Baseline: no custom filters, just open opportunities. `status` is a default
  // filter (top-level bucket); pass it through `filters` — the old `statuses`
  // shorthand is deprecated. `run` logs the first result's custom fields, so this
  // also confirms the plugin parsed them out of the live response.
  ok =
    (await run("Baseline (open opportunities, no custom filters)", () =>
      client.opportunities.search({ filters: { status: F.in(["open"]) }, page: 1 })
    )) && ok;

  // Each registered custom filter, one at a time. Inside each call, the filter
  // key autocompletes and its value shape is narrowed to the declared
  // `filterType` — `agency` accepts an array operator, `costSharing` a boolean.
  // Adjust the codes to ones the live API recognizes; the point here is that the
  // filter is registered, typed, and accepted end to end.
  ok =
    (await run("agency (stringArray)", () =>
      client.opportunities.search({
        filters: { status: F.in(["open"]), agency: F.in(["NSF"]) },
        page: 1,
      })
    )) && ok;

  ok =
    (await run("applicantType (stringArray)", () =>
      client.opportunities.search({
        filters: { status: F.in(["open"]), applicantType: F.in(["state_governments"]) },
        page: 1,
      })
    )) && ok;

  ok =
    (await run("fundingInstrument (stringArray)", () =>
      client.opportunities.search({
        filters: { status: F.in(["open"]), fundingInstrument: F.in(["grant"]) },
        page: 1,
      })
    )) && ok;

  ok =
    (await run("costSharing (booleanComparison)", () =>
      client.opportunities.search({
        filters: { status: F.in(["open"]), costSharing: F.eq(false) },
        page: 1,
      })
    )) && ok;

  // All four together, to confirm they compose in a single request.
  ok =
    (await run("all four filters combined", () =>
      client.opportunities.search({
        filters: {
          status: F.in(["open"]),
          agency: F.in(["USAID"]),
          applicantType: F.in(["state_governments"]),
          fundingInstrument: F.in(["grant"]),
          costSharing: F.eq(false),
        },
        page: 1,
      })
    )) && ok;

  if (!ok) {
    console.error("\n✗ search-with-filters example failed");
    return false;
  }
  console.log("\n✓ search-with-filters example complete");
  return true;
}

// ############################################################################
// Compile-time enforcement (never called — the point is that it does not build)
// ############################################################################
//
// Each `@ts-expect-error` below asserts that tsc REJECTS a mistyped filter.
// Delete an `@ts-expect-error` and the type check fails, proving the narrowing
// is real rather than cosmetic. (Run `pnpm dlx tsc --noEmit examples/search-with-filters.ts`
// to see it; `tsx` strips types and would happily run these.)
async function _typeEnforcementDemos(): Promise<void> {
  // costSharing is a booleanComparison: an array operator is the wrong family.
  await client.opportunities.search({
    // @ts-expect-error - `in` (array) is not valid for a booleanComparison filter
    filters: { costSharing: F.in(["not-a-bool"]) },
  });

  // agency is a stringArray: a scalar `eq` is the wrong family.
  await client.opportunities.search({
    // @ts-expect-error - `eq` (scalar) is not valid for a stringArray filter
    filters: { agency: F.eq("USAID") },
  });
}
void _typeEnforcementDemos; // referenced so it type-checks, never invoked

void main()
  .then(ok => {
    if (!ok) process.exitCode = 1;
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });

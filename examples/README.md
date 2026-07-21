# Examples

Runnable examples demonstrating how to use the `@common-grants/cg-grants-gov` plugin. One example runs entirely on inline mock data; the other calls the live Simpler.Grants.gov API and requires an API key.

## Running the examples

From the project root:

```bash
pnpm install

# Parse a Grants.gov opportunity with typed custom fields (inline data, no API key)
pnpm example:parse

# Search the live API with the plugin's custom filters (requires an API key)
pnpm example:filters
```

## Examples

### Parse Opportunity

Demonstrates parsing a Grants.gov API response and accessing typed custom fields like agency, assistance listings, and contact info. This example uses inline mock data, so no server or API key is required.

```bash
pnpm example:parse
```

**Expected output:**

```
=== Parse Grants.gov Opportunity ===

Standard fields:
  Title:  STEM Education Grant Program
  Status: open
  ID:     573525f2-8e15-4405-83fb-e6523511d893

Grants.gov custom fields:
  Agency:       Department of Health and Human Services (HHS)
  Federal #:    HHS-2025-001
  Legacy ID:    12345
  Fiscal Year:  2025
  Cost Sharing: false

Assistance Listings:
  - 93.123: STEM Education
  - 93.456: Youth Development

Contact: Jane Doe <jane.doe@hhs.gov>

=== Example Complete ===
```

### Search with custom filters

Exercises the plugin's registered search filters (`agency`, `applicantType`, `fundingInstrument`, `costSharing`) against the live Simpler.Grants.gov API, using a client from `plugin.getClient()`.

This example calls the live API, so it requires an API key:

- `SGG_API_KEY` (required): your Simpler.Grants.gov API key.
- `SGG_BASE_URL` (optional): defaults to the production API (`https://api.simpler.grants.gov`).

```bash
export SGG_API_KEY="your-api-key"
pnpm example:filters
```

It runs six scenarios and, for each, prints the match counts and the first parsed opportunity:

1. Baseline: open opportunities with no custom filters.
2. `agency`: a single `stringArray` filter.
3. `applicantType`: a single `stringArray` filter.
4. `fundingInstrument`: a single `stringArray` filter.
5. `costSharing`: a `booleanComparison` filter.
6. All four custom filters combined in one request.

Live totals vary from run to run, so the exact output is not reproduced here.

### Combining with other plugins

To learn how to merge this plugin with your own custom fields using `mergeExtensions()` and `definePlugin()`, see the [Combining Plugins](https://github.com/HHS/simpler-grants-protocol/blob/main/lib/ts-sdk/src/extensions/README.md#combining-plugins) section of the TypeScript SDK extensions guide.

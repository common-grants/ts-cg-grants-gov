# @common-grants/cg-grants-gov

A [CommonGrants](https://github.com/common-grants) plugin that defines Grants.gov-specific extensions for the `@common-grants/sdk`. Use this plugin to work with grant opportunities from the [Simpler.Grants.gov API](https://api.simpler.grants.gov/docs) with full type safety and validation.

## Table of contents <!-- omit in toc -->

- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
  - [Parsing API responses](#parsing-api-responses)
  - [Searching with custom filters](#searching-with-custom-filters)
  - [Using transforms](#using-transforms)
  - [Combining with other plugins](#combining-with-other-plugins)
  - [Available custom fields](#available-custom-fields)
- [Plugin anatomy](#plugin-anatomy)
- [License](#license)

## Overview

The CommonGrants SDK defines a base schema for grant opportunities that works across any grants system. However, individual systems like Grants.gov include additional fields that aren't part of the base schema -- things like agency info, assistance listings, and federal opportunity numbers.

This plugin registers those Grants.gov-specific fields as typed extensions so you can access them alongside the standard CommonGrants fields with full type safety and runtime validation.

To learn more about the CommonGrants extension system, see:

- [CommonGrants Custom Field Catalog](https://commongrants.org/custom-fields/) -- browse registered custom fields across all CommonGrants plugins
- [TypeScript SDK Extensions Guide](https://github.com/HHS/simpler-grants-protocol/tree/main/lib/ts-sdk/src/extensions) -- documentation for `withCustomFields()`, `definePlugin()`, and the extensions API

## Installation

Install the plugin alongside the CommonGrants SDK:

```bash
pnpm add @common-grants/cg-grants-gov @common-grants/sdk
```

> [!NOTE]
> `@common-grants/sdk` is a peer dependency. You must install it separately.

## Usage

### Parsing API responses

Use the plugin's built-in schema with the SDK client to get typed access to Grants.gov-specific fields when fetching opportunities:

```ts
import { Client, Auth } from "@common-grants/sdk/client";
import grantsGovPlugin from "@common-grants/cg-grants-gov";

// Create a client pointed at the Simpler.Grants.gov API
const client = new Client({
  baseUrl: "https://api.simpler.grants.gov",
  auth: Auth.apiKey("your-api-key"),
});

// Use the plugin's schema to parse Grants.gov custom fields
const schema = grantsGovPlugin.schemas.Opportunity;

// Fetch a single opportunity with typed custom fields
const opportunity = await client.opportunities.get(opportunityId, { schema });
console.log(opportunity.title);
console.log(opportunity.customFields?.agency?.value);
console.log(opportunity.customFields?.federalOpportunityNumber?.value);

// List and search also accept the schema option
const results = await client.opportunities.search({
  query: "education",
  schema,
});
```

### Searching with custom filters

The plugin registers Simpler.Grants.gov search filters on `opportunities.search`. Call `plugin.getClient()` to get a client that binds both the plugin's Opportunity schema and these custom-filter routes, so filter names autocomplete and each value is narrowed to its declared filter family.

Four filters are registered:

| Filter              | Filter family       |
| ------------------- | ------------------- |
| `agency`            | `stringArray`       |
| `applicantType`     | `stringArray`       |
| `fundingInstrument` | `stringArray`       |
| `costSharing`       | `booleanComparison` |

Build filter values with the `F.*` helpers: use `F.in([...])` for the `stringArray` filters and `F.eq(true | false)` for `costSharing`.

```ts
import { Auth } from "@common-grants/sdk/client";
import { F } from "@common-grants/sdk/extensions";
import grantsGovPlugin from "@common-grants/cg-grants-gov";

// getClient binds the plugin's Opportunity schema and its registered filter routes.
const client = grantsGovPlugin.getClient({
  baseUrl: "https://api.simpler.grants.gov",
  auth: Auth.apiKey("your-api-key"),
});

const results = await client.opportunities.search({
  filters: {
    status: F.in(["open"]),
    agency: F.in(["HHS"]),
    applicantType: F.in(["state_governments"]),
    fundingInstrument: F.in(["grant"]),
    costSharing: F.eq(false),
  },
  page: 1,
});

// Custom fields on each result are typed by the plugin's bound schema.
console.log(results.items[0]?.customFields?.agency?.value.name);
```

An invalid value for a registered filter (for example, an array operator on `costSharing`) is a compile-time error, and it is also rejected at runtime with a `FilterError` before any request is sent.

For a runnable version against the live API, see [`examples/search-with-filters.ts`](./examples/search-with-filters.ts). It calls the live Simpler.Grants.gov API, so it requires an API key:

- `SGG_API_KEY` (required): your Simpler.Grants.gov API key.
- `SGG_BASE_URL` (optional): defaults to the production API (`https://api.simpler.grants.gov`).

```bash
export SGG_API_KEY="your-api-key"
pnpm example:filters
```

### Using transforms

Use `toCommon` to convert a raw Simpler.Grants.gov API response into CommonGrants format, and `fromCommon` to convert back:

```ts
import plugin from "@common-grants/cg-grants-gov";

const { toCommon, fromCommon } = plugin.schemas.Opportunity;

// Convert a Simpler.Grants.gov API response to CommonGrants format
const source = {
  opportunity_id: "573525f2-8e15-4405-83fb-e6523511d893",
  opportunity_title: "STEM Education Grant Program",
  opportunity_status: "posted",
  agency_code: "HHS",
  agency_name: "Department of Health and Human Services",
  created_at: "2025-01-01T00:00:00.000000+00:00",
  updated_at: "2025-01-15T00:00:00.000000+00:00",
  opportunity_assistance_listings: [],
  summary: {
    summary_description: "A grant program focused on STEM education.",
    is_forecast: false,
    fiscal_year: 2025,
    award_ceiling: 500000,
    created_at: "2025-01-01T00:00:00.000000+00:00",
    updated_at: "2025-01-15T00:00:00.000000+00:00",
    funding_instruments: [],
    funding_categories: [],
    applicant_types: [],
  },
};

const { result, errors } = toCommon(source);

if (errors.length > 0) {
  for (const err of errors) {
    console.error(`[${err.path}] ${err.message}`);
  }
} else {
  console.log(result.title); // "STEM Education Grant Program"
  console.log(result.status.value); // "open"  (posted → open)
  console.log(result.customFields?.fiscalYear?.value); // 2025
  console.log(result.customFields?.agency?.value.code); // "HHS"
}

// Convert back to Simpler.Grants.gov format
const { result: native } = fromCommon(result);
console.log(native.opportunity_status); // "posted"
console.log(native.agency_code); // "HHS"
```

Both functions always return `{ result, errors }` — they never throw. Check `errors.length` before using `result`. See [TRANSFORMS.md](./TRANSFORMS.md) for the complete field mapping reference and error handling details.

### Combining with other plugins

If you need to add your own custom fields alongside the Grants.gov extensions, use `mergeExtensions()` and `definePlugin()` to combine them:

```ts
import { definePlugin, mergeExtensions } from "@common-grants/sdk/extensions";
import grantsGovPlugin from "@common-grants/cg-grants-gov";

// Define a local plugin with your own custom fields
const localPlugin = definePlugin({
  extensions: {
    Opportunity: {
      internalNotes: {
        fieldType: "string",
        description: "Internal notes about this opportunity",
      },
      priority: {
        fieldType: "integer",
        description: "Internal priority ranking",
      },
    },
  },
} as const);

// Merge the Grants.gov extensions with your local extensions
const merged = mergeExtensions([grantsGovPlugin.extensions, localPlugin.extensions]);
const combinedPlugin = definePlugin({ extensions: merged });

// Use the combined schema -- both Grants.gov and local fields are typed
const schema = combinedPlugin.schemas.Opportunity;
const opportunity = await client.opportunities.get(id, { schema });
console.log(opportunity.customFields?.agency?.value);
console.log(opportunity.customFields?.internalNotes?.value);
```

### Available custom fields

This plugin adds 18 Grants.gov-specific fields to the `Opportunity` schema. Access them via `opportunity.customFields?.<fieldName>?.value` after parsing.

| Field                      | Type                       | Description                                            |
| -------------------------- | -------------------------- | ------------------------------------------------------ |
| `legacySerialId`           | `integer`                  | Integer ID for legacy system compatibility             |
| `federalOpportunityNumber` | `string`                   | Federal opportunity number                             |
| `assistanceListings`       | `AssistanceListingValue[]` | Assistance listing numbers and program titles          |
| `agency`                   | `AgencyValue`              | Agency code, name, parent name, parent code            |
| `attachments`              | `AttachmentValue[]`        | NOFOs and supplemental documents                       |
| `federalFundingSource`     | `string`                   | Grant category type code                               |
| `contactInfo`              | `ContactInfoValue`         | Agency contact email, description, and email link text |
| `additionalInfo`           | `AdditionalInfoValue`      | URL and description for additional info                |
| `fiscalYear`               | `integer`                  | Fiscal year associated with the opportunity            |
| `costSharing`              | `CostSharingValue`         | Whether cost sharing is required                       |
| `sourceCreatedAt`          | `string`                   | Original creation timestamp (microsecond precision)    |
| `sourceUpdatedAt`          | `string`                   | Original update timestamp (microsecond precision)      |
| `summaryCreatedAt`         | `string`                   | Opportunity summary creation timestamp                 |
| `summaryUpdatedAt`         | `string`                   | Opportunity summary update timestamp                   |
| `forecastedPostDate`       | `string`                   | Forecasted post date                                   |
| `forecastedCloseDate`      | `string`                   | Forecasted close date                                  |
| `fundingInstruments`       | `string[]`                 | Funding instrument type strings                        |
| `fundingCategories`        | `string[]`                 | Funding category type strings                          |

For value object shapes, source field mappings, and status/applicant-type conversion tables, see [TRANSFORMS.md](./TRANSFORMS.md).

## Plugin anatomy

The plugin is assembled in `src/index.ts` using these components:

| Component                    | What it is                                                                                                                    | File            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `GrantsGovOpportunitySchema` | Zod schema for the Simpler.Grants.gov v1 API response                                                                         | `schemas.ts`    |
| `customFields`               | `CustomFieldSpec` declarations for all 18 Grants.gov-specific fields                                                          | `index.ts`      |
| `toCommon`                   | Transforms `GrantsGovOpportunity → CommonGrants Opportunity`                                                                  | `transforms.ts` |
| `fromCommon`                 | Transforms `CommonGrants Opportunity → GrantsGovOpportunity`                                                                  | `transforms.ts` |
| `routes`                     | Custom search-filter registrations for `opportunities.search` (`agency`, `applicantType`, `fundingInstrument`, `costSharing`) | `index.ts`      |

These are wired together via `definePlugin`. The `customFilters` capability advertises the registered filters, and the `routes` block declares them (see [Searching with custom filters](#searching-with-custom-filters)):

```ts
import { definePlugin } from "@common-grants/sdk/extensions";

const plugin = definePlugin({
  meta: {
    name: "grants.gov",
    sourceSystem: "Simpler.Grants.gov",
    capabilities: ["customFields", "transforms", "customFilters"],
  },
  schemas: {
    Opportunity: {
      customFields, // CustomFieldSpec declarations
      sourceSchema: GrantsGovOpportunitySchema,
      toCommon, // (source: GrantsGovOpportunity) => TransformResult<unknown>
      fromCommon, // (common: unknown) => TransformResult<GrantsGovOpportunity>
    },
  },
  // Custom search filters accepted by opportunities.search. `as const` preserves
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
```

See [TRANSFORMS.md](./TRANSFORMS.md) for a step-by-step guide to writing your own plugin modelled on this one.

## License

CC0-1.0

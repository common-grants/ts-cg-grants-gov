# Transforms reference

This document covers the transform system for the `@common-grants/cg-grants-gov` plugin: how `toCommon` and `fromCommon` work, what every custom field represents, the status and applicant-type mappings, and a step-by-step guide for writing your own plugin modelled on this one.

## Table of contents <!-- omit in toc -->

- [Transform contract](#transform-contract)
  - [Function signatures](#function-signatures)
  - [TransformResult](#transformresult)
  - [Error handling](#error-handling)
- [Field mapping: Grants.gov → CommonGrants](#field-mapping-grantsgov--commongrants)
- [Custom fields reference](#custom-fields-reference)
  - [Scalar fields](#scalar-fields)
  - [Object fields](#object-fields)
  - [Array fields](#array-fields)
- [Status mapping](#status-mapping)
- [Applicant-type mapping](#applicant-type-mapping)
- [Wire format notes](#wire-format-notes)
- [Writing your own plugin](#writing-your-own-plugin)
  - [1. Define a source schema](#1-define-a-source-schema)
  - [2. Declare custom fields](#2-declare-custom-fields)
  - [3. Write transforms](#3-write-transforms)
  - [4. Assemble the plugin](#4-assemble-the-plugin)

---

## Transform contract

### Function signatures

```ts
// src/transforms.ts
export function toCommon(source: GrantsGovOpportunity): TransformResult<unknown>;
export function fromCommon(common: unknown): TransformResult<GrantsGovOpportunity>;
```

`toCommon` accepts a validated `GrantsGovOpportunity` object (the Zod-inferred type from `GrantsGovOpportunitySchema`). `fromCommon` accepts any CommonGrants-shaped opportunity object — it is typed `unknown` because the CommonGrants schema type varies by plugin configuration.

Both functions are also available via the plugin's compiled schema:

```ts
import plugin from "@common-grants/cg-grants-gov";

const { toCommon, fromCommon } = plugin.schemas.Opportunity;
```

### TransformResult

Both functions return a `TransformResult<T>` — never a bare value, never a thrown exception:

```ts
interface TransformResult<T> {
  result: T; // The transformed value; may be partial if errors occurred
  errors: TransformError[]; // Empty on success
}

class TransformError extends Error {
  path?: string; // Dot-notation path to the failing field (e.g. "summary.fiscal_year")
  handler?: string; // Name of the handler that raised the error
  sourceValue?: unknown; // The full input record (may contain PII — handle carefully)
  cause?: unknown; // The original exception
}
```

### Error handling

Always check `errors` before using `result`:

```ts
const { result, errors } = toCommon(sourceData);

if (errors.length > 0) {
  for (const err of errors) {
    console.error(`[${err.path ?? "unknown"}] ${err.message}`);
    if (err.cause) console.error("  caused by:", err.cause);
  }
} else {
  // result is safe to use
  console.log(result.title);
}
```

`result` is always populated (even on partial failure), but it may be incomplete when errors are present. Do not use it without checking errors first unless you intentionally want partial data.

> [!WARNING]
> `TransformError.sourceValue` contains the full source record and is not redacted by the SDK. Treat it as potentially sensitive and avoid logging it in production without scrubbing PII fields.

---

## Field mapping: Grants.gov → CommonGrants

The table below shows how fields from `GrantsGovOpportunity` (and its nested `summary`) map to `OpportunityBase` fields.

| Source field                              | CommonGrants field             | Notes                                                 |
| ----------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| `opportunity_id`                          | `id`                           | UUID string                                           |
| `opportunity_title`                       | `title`                        | Falls back to `""` if absent                          |
| `summary.summary_description`             | `description`                  | Falls back to `""` if absent                          |
| `opportunity_status`                      | `status.value`                 | See [Status mapping](#status-mapping)                 |
| `created_at`                              | `createdAt`                    | Coerced to JS `Date` via `UTCDateTimeSchema`          |
| `updated_at`                              | `lastModifiedAt`               | Coerced to JS `Date` via `UTCDateTimeSchema`          |
| `summary.estimated_total_program_funding` | `funding.totalAmountAvailable` | Integer → `{ amount: string, currency: "USD" }`       |
| `summary.award_floor`                     | `funding.minAwardAmount`       | Integer → `{ amount: string, currency: "USD" }`       |
| `summary.award_ceiling`                   | `funding.maxAwardAmount`       | Integer → `{ amount: string, currency: "USD" }`       |
| `summary.expected_number_of_awards`       | `funding.estimatedAwardCount`  | Integer                                               |
| `summary.post_date`                       | `keyDates.postDate`            | `singleDate` event                                    |
| `summary.close_date`                      | `keyDates.closeDate`           | `singleDate` event                                    |
| `summary.applicant_types`                 | `acceptedApplicantTypes`       | See [Applicant-type mapping](#applicant-type-mapping) |

All remaining source fields are carried forward as custom fields. See the [Custom fields reference](#custom-fields-reference) below.

---

## Custom fields reference

Custom fields are declared as `CustomFieldSpec` objects in `src/index.ts` and accessed via `opportunity.customFields?.<fieldName>?.value` after parsing or transforming.

### Scalar fields

| Field name                 | `fieldType` | TypeScript type | Source field                    | Description                                                                                      |
| -------------------------- | ----------- | --------------- | ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `legacySerialId`           | `"integer"` | `number`        | `legacy_opportunity_id`         | Integer ID for legacy system compatibility                                                       |
| `federalOpportunityNumber` | `"string"`  | `string`        | `opportunity_number`            | Federal opportunity number                                                                       |
| `federalFundingSource`     | `"string"`  | `string`        | `category`                      | Grant category type code                                                                         |
| `fiscalYear`               | `"integer"` | `number`        | `summary.fiscal_year`           | Fiscal year associated with the opportunity                                                      |
| `sourceCreatedAt`          | `"string"`  | `string`        | `created_at`                    | Original creation timestamp (microsecond precision, see [Wire format notes](#wire-format-notes)) |
| `sourceUpdatedAt`          | `"string"`  | `string`        | `updated_at`                    | Original update timestamp (microsecond precision)                                                |
| `summaryCreatedAt`         | `"string"`  | `string`        | `summary.created_at`            | Opportunity summary creation timestamp                                                           |
| `summaryUpdatedAt`         | `"string"`  | `string`        | `summary.updated_at`            | Opportunity summary update timestamp                                                             |
| `forecastedPostDate`       | `"string"`  | `string`        | `summary.forecasted_post_date`  | Forecasted post date                                                                             |
| `forecastedCloseDate`      | `"string"`  | `string`        | `summary.forecasted_close_date` | Forecasted close date                                                                            |

> **Why `sourceCreatedAt`/`sourceUpdatedAt`?** The CommonGrants schema coerces `createdAt`/`lastModifiedAt` through `UTCDateTimeSchema`, which converts datetime strings to JS `Date` objects (millisecond precision). The Simpler.Grants.gov API uses microsecond precision (6 decimal places). Storing the original strings in `sourceCreatedAt`/`sourceUpdatedAt` lets `fromCommon` reconstruct them exactly, preserving sub-millisecond fidelity across round-trips.
>
> **Why `summaryCreatedAt`/`summaryUpdatedAt`?** `summary.created_at` and `summary.updated_at` track when the summary record changed, independently of the top-level opportunity timestamps. Both are preserved as custom fields so `fromCommon` can reconstruct them accurately.

### Object fields

| Field name       | `fieldType` | Value schema                | Description                                            |
| ---------------- | ----------- | --------------------------- | ------------------------------------------------------ |
| `agency`         | `"object"`  | `AgencyValueSchema`         | Agency code, name, parent name, parent code            |
| `contactInfo`    | `"object"`  | `ContactInfoValueSchema`    | Agency contact email, description, and email link text |
| `additionalInfo` | `"object"`  | `AdditionalInfoValueSchema` | URL and description for additional info                |
| `costSharing`    | `"object"`  | `CostSharingValueSchema`    | Whether cost sharing is required                       |

**AgencyValueSchema**

```ts
z.object({
  code: z.string().nullish(), // e.g. "HHS-ACF"   (source: agency_code)
  name: z.string().nullish(), // e.g. "Administration for Children and Families"
  parentName: z.string().nullish(), // e.g. "Department of Health and Human Services"
  parentCode: z.string().nullish(), // e.g. "HHS"
});
```

**ContactInfoValueSchema**

```ts
z.object({
  name: z.string().nullish(), // Contact name (not in v1 source; always null)
  email: z.string().nullish(), // source: summary.agency_email_address
  emailDescription: z.string().nullish(), // source: summary.agency_email_address_description
  phone: z.string().nullish(), // Not in v1 source; always null
  description: z.string().nullish(), // source: summary.agency_contact_description
});
```

**AdditionalInfoValueSchema**

```ts
z.object({
  url: z.string().nullish(), // source: summary.additional_info_url
  description: z.string().nullish(), // source: summary.additional_info_url_description
});
```

**CostSharingValueSchema**

```ts
z.object({
  isRequired: z.boolean().nullish(), // source: summary.is_cost_sharing
});
```

### Array fields

| Field name           | `fieldType` | Element schema                 | Description                                   |
| -------------------- | ----------- | ------------------------------ | --------------------------------------------- |
| `assistanceListings` | `"array"`   | `AssistanceListingValueSchema` | Assistance listing numbers and program titles |
| `attachments`        | `"array"`   | `AttachmentValueSchema`        | NOFOs and supplemental documents              |
| `fundingInstruments` | `"array"`   | `z.string()`                   | Funding instrument type strings               |
| `fundingCategories`  | `"array"`   | `z.string()`                   | Funding category type strings                 |

**AssistanceListingValueSchema**

```ts
z.object({
  identifier: z.string().nullish(), // source: assistance_listing_number  e.g. "93.123"
  programTitle: z.string().nullish(), // source: program_title
});
```

**AttachmentValueSchema**

```ts
z.object({
  downloadUrl: z.string().nullish(), // source: download_url
  name: z.string(), // source: file_name (required; falls back to "")
  description: z.string().nullish(), // source: file_description
  sizeInBytes: z.number().int().nullish(),
  mimeType: z.string().nullish(),
  createdAt: z.string().datetime(), // source: attachment.created_at ?? opportunity.created_at
  lastModifiedAt: z.string().datetime(), // source: attachment.updated_at ?? opportunity.updated_at
});
```

> **Note:** `opportunity_attachment_id` is not carried forward to CommonGrants — it is intentionally dropped and will be `null` after a `fromCommon` round-trip.

---

## Status mapping

**`toCommon`** (Grants.gov → CommonGrants):

| `opportunity_status` | `status.value` |
| -------------------- | -------------- |
| `"forecasted"`       | `"forecasted"` |
| `"posted"`           | `"open"`       |
| `"closed"`           | `"closed"`     |
| `"archived"`         | `"closed"`     |

**`fromCommon`** (CommonGrants → Grants.gov):

| `status.value` | `opportunity_status`          |
| -------------- | ----------------------------- |
| `"forecasted"` | `"forecasted"`                |
| `"open"`       | `"posted"`                    |
| `"closed"`     | `"closed"`                    |
| `"custom"`     | `"posted"` (default fallback) |

The `is_forecast` field on `OpportunitySummarySource` is derived from the status: it is `true` when `opportunity_status === "forecasted"`.

---

## Applicant-type mapping

**`toCommon`** (Grants.gov → CommonGrants):

| `applicant_types` value                                     | CommonGrants `value`                                       |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| `"state_governments"`                                       | `"government_state"`                                       |
| `"county_governments"`                                      | `"government_county"`                                      |
| `"city_or_township_governments"`                            | `"government_municipal"`                                   |
| `"special_district_governments"`                            | `"government_special_district"`                            |
| `"independent_school_districts"`                            | `"school_district_independent"`                            |
| `"public_and_state_institutions_of_higher_education"`       | `"higher_education_public"`                                |
| `"private_institutions_of_higher_education"`                | `"higher_education_private"`                               |
| `"federally_recognized_native_american_tribal_governments"` | `"government_tribal"`                                      |
| `"other_native_american_tribal_organizations"`              | `"organization_tribal_other"`                              |
| `"nonprofits_non_higher_education_with_501c3"`              | `"non_profit_with_501c3"`                                  |
| `"nonprofits_non_higher_education_without_501c3"`           | `"nonprofit_without_501c3"`                                |
| `"individuals"`                                             | `"individual"`                                             |
| `"for_profit_organizations_other_than_small_businesses"`    | `"for_profit_not_small_business"`                          |
| `"small_businesses"`                                        | `"for_profit_small_business"`                              |
| `"unrestricted"`                                            | `"unrestricted"`                                           |
| _(anything else)_                                           | `"custom"` (with `customValue` set to the original string) |

**`fromCommon`** (CommonGrants → Grants.gov): the reverse of the table above. `"organization"` and `"custom"` both map to `"other"`.

---

## Wire format notes

Custom fields are transmitted as a `customFields` object on the wire. Each entry follows this shape:

```json
{
  "customFields": {
    "fiscalYear": {
      "name": "fiscalYear",
      "fieldType": "integer",
      "value": 2025
    },
    "agency": {
      "name": "agency",
      "fieldType": "object",
      "value": {
        "code": "HHS",
        "name": "Department of Health and Human Services",
        "parentName": null,
        "parentCode": null
      }
    }
  }
}
```

- Field names are **camelCase** on the wire and in TypeScript (`fiscalYear`, `contactInfo`).
- `fieldType` must be one of: `"string"`, `"integer"`, `"number"`, `"boolean"`, `"object"`, `"array"`.
- Optional custom fields are omitted entirely from `customFields` when the source value is absent — absent differs from `null`.
- **Datetime precision:** The source API uses microsecond precision (6 decimal places, e.g. `"2025-01-01T00:00:00.558102+00:00"`). The `toGrantsGovDatetime()` helper in `transforms.ts` normalizes any datetime to this format. When the input is already a UTC string it is preserved without passing through a `Date` object (which would truncate to milliseconds); when the input is a `Date`, the fractional seconds are padded to 6 digits.

---

## Writing your own plugin

This section walks through creating a plugin from scratch using the same pattern as `@common-grants/cg-grants-gov`. For the full SDK reference see the [CommonGrants TypeScript SDK extensions guide](https://github.com/HHS/simpler-grants-protocol/tree/main/lib/ts-sdk/src/extensions).

### 1. Define a source schema

Use Zod to describe your source system's data shape:

```ts
import { z } from "zod";

export const MySourceOpportunitySchema = z.object({
  id: z.string().uuid(),
  title: z.string().nullish(),
  status: z.enum(["open", "closed"]),
  description: z.string().nullish(),
  max_award: z.number().int().nullish(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export type MySourceOpportunity = z.infer<typeof MySourceOpportunitySchema>;
```

If your source schema is not yet stable you can skip it for now — `definePlugin` accepts `sourceSchema` as optional.

### 2. Declare custom fields

Declare a `customFields` object with one `CustomFieldSpec` per field you want to carry forward. The `fieldType` key determines the JSON Schema type on the wire. Supply an optional `value` Zod schema to get runtime validation and TypeScript inference.

```ts
import { z } from "zod";

const customFields = {
  maxAward: {
    fieldType: "integer",
    description: "Maximum award amount in USD",
  },
  programCode: {
    fieldType: "string",
    description: "Internal program identifier",
  },
  // For object values, provide a Zod schema:
  contactInfo: {
    fieldType: "object",
    value: z.object({
      email: z.string().nullish(),
      name: z.string().nullish(),
    }),
    description: "Primary contact for this opportunity",
  },
} as const;
```

### 3. Write transforms

Each transform function takes the source type and returns a `TransformResult`. Build the CommonGrants payload as a plain object and return it directly with an empty `errors` array on success.

```ts
import type { TransformResult } from "@common-grants/sdk/extensions";

function toCommon(source: MySourceOpportunity): TransformResult<unknown> {
  const cf: Record<string, unknown> = {};

  if (source.max_award != null) {
    cf.maxAward = { name: "maxAward", fieldType: "integer", value: source.max_award };
  }
  if (source.status != null) {
    cf.programCode = { name: "programCode", fieldType: "string", value: source.program_code };
  }

  return {
    result: {
      id: source.id,
      title: source.title ?? "",
      description: source.description ?? "",
      status: { value: source.status === "open" ? "open" : "closed" },
      createdAt: source.created_at,
      lastModifiedAt: source.updated_at,
      customFields: Object.keys(cf).length > 0 ? cf : undefined,
    },
    errors: [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromCommon(common: any): TransformResult<MySourceOpportunity> {
  const cf = common.customFields ?? {};

  return {
    result: {
      id: common.id,
      title: common.title ?? null,
      status: common.status?.value === "open" ? "open" : "closed",
      description: common.description ?? null,
      max_award: cf.maxAward?.value ?? null,
      created_at: common.createdAt,
      updated_at: common.lastModifiedAt,
    },
    errors: [],
  };
}
```

To collect validation errors instead of throwing, wrap your transform body in a `try/catch` and push a `TransformError` to the `errors` array:

```ts
import { TransformError } from "@common-grants/sdk/extensions";

function toCommon(source: MySourceOpportunity): TransformResult<unknown> {
  const errors: TransformError[] = [];

  let maxAward: number | undefined;
  try {
    maxAward = source.max_award ?? undefined;
  } catch (cause) {
    errors.push(new TransformError("Failed to read max_award", { path: "max_award", cause }));
  }

  return {
    result: {
      /* ... */
    },
    errors,
  };
}
```

### 4. Assemble the plugin

Wire the four components together with `definePlugin`:

```ts
import { definePlugin } from "@common-grants/sdk/extensions";

const myPlugin = definePlugin({
  meta: {
    name: "my-system",
    sourceSystem: "My Grant System",
    capabilities: ["customFields", "transforms"],
  },
  schemas: {
    Opportunity: {
      customFields,
      sourceSchema: MySourceOpportunitySchema,
      toCommon,
      fromCommon,
    },
  },
} as const);

export default myPlugin;
```

Consumers then use the plugin as:

```ts
import myPlugin from "./my-plugin";

// Parse a CommonGrants-format response with typed custom fields
const opp = myPlugin.schemas.Opportunity.commonSchema.parse(apiResponse);
console.log(opp.customFields?.maxAward?.value); // number | undefined

// Transform from source format
const { result, errors } = myPlugin.schemas.Opportunity.toCommon(sourceData);
if (errors.length === 0) {
  console.log(result.customFields?.maxAward?.value);
}

// Transform back to source format
const { result: native } = myPlugin.schemas.Opportunity.fromCommon(result);
console.log(native.max_award); // number | null
```

`definePlugin` validates the plugin structure at call time and raises errors if the schema wiring is invalid (e.g. an unrecognised `schemas` key). The `as const` assertion is important — it lets TypeScript infer the literal field types for full type safety on `customFields`.

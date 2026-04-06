# @common-grants/cg-grants-gov

A [CommonGrants](https://github.com/common-grants) plugin that defines Grants.gov-specific extensions for the `@common-grants/sdk`. Use this plugin to work with grant opportunities from the [Simpler.Grants.gov API](https://api.simpler.grants.gov/docs) with full type safety and validation.

## Table of contents <!-- omit in toc -->

- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
  - [Parsing API responses](#parsing-api-responses)
  - [Combining with other plugins](#combining-with-other-plugins)
  - [Available custom fields](#available-custom-fields)
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

This plugin extends the `Opportunity` schema with Grants.gov-specific fields such as agency details, assistance listings, attachments, contact info, and more. For the full list of extensions and their types, see the plugin definition in [`src/index.ts`](./src/index.ts).

## License

CC0-1.0

# Examples

Runnable examples demonstrating how to use the `@common-grants/cg-grants-gov` plugin. No server or API key required -- all examples use inline mock data.

## Running the examples

From the project root:

```bash
pnpm install

# Parse a Grants.gov opportunity with typed custom fields
pnpm example:parse
```

## Examples

### Parse Opportunity

Demonstrates parsing a Grants.gov API response and accessing typed custom fields like agency, assistance listings, and contact info.

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

### Combining with other plugins

To learn how to merge this plugin with your own custom fields using `mergeExtensions()` and `definePlugin()`, see the [Combining Plugins](https://github.com/HHS/simpler-grants-protocol/blob/main/lib/ts-sdk/src/extensions/README.md#combining-plugins) section of the TypeScript SDK extensions guide.

# Examples

Runnable examples demonstrating how to use the `@common-grants/cg-grants-gov` plugin. No server or API key required -- all examples use inline mock data.

## Running the examples

From the project root:

```bash
pnpm install

# Parse a Grants.gov opportunity with typed custom fields
pnpm example:parse

# Combine the Grants.gov plugin with a local plugin
pnpm example:combine
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

### Combine Plugins

Demonstrates merging the Grants.gov plugin with a local plugin using `mergeExtensions()` and `definePlugin()`, then accessing fields from both plugins on a single schema.

```bash
pnpm example:combine
```

**Expected output:**

```
=== Combine Plugins ===

Title: STEM Education Grant Program

Grants.gov fields:
  Agency:    Department of Health and Human Services
  Federal #: HHS-2025-001

Local fields:
  Notes:    High priority — aligns with Q3 strategy
  Priority: 1

=== Example Complete ===
```

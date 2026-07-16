import type { SearchResult } from "@common-grants/sdk/client";

/** Collapse a possibly multi-line error message to one readable line. */
function oneLine(message: string, max = 160): string {
  const collapsed = message.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max)}...` : collapsed;
}

/** Run one live search, print the same evidence as the Python example, and report success. */
export async function runSearchScenario<T>(
  label: string,
  search: () => Promise<SearchResult<T>>,
  logOpportunity: (opportunity: T) => void
): Promise<boolean> {
  console.log(`\n=== ${label} ===`);
  try {
    const result = await search();
    console.log(
      `  total matches:           ${result.paginationInfo.totalItems ?? "(not reported)"}`
    );
    console.log(`  items returned (page 1): ${result.items.length}`);
    console.log(`  per-row parse failures:  ${result.errors.length}`);
    console.log(`  filters sent:             ${JSON.stringify(result.filterInfo?.filters)}`);
    const first = result.items[0];
    if (first) logOpportunity(first);
    return true;
  } catch (error) {
    console.log(`  ERROR: ${oneLine((error as Error).message)}`);
    return false;
  }
}

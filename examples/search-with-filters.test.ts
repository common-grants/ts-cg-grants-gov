import { afterEach, describe, expect, it, vi } from "vitest";
import { runSearchScenario } from "./search-with-filters-output";

describe("runSearchScenario", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints classified filters and the parsed opportunity", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const opportunity = { id: "opp-1", title: "Test opportunity" };
    const result = {
      paginationInfo: { totalItems: 1 },
      items: [opportunity],
      errors: [],
      filterInfo: {
        filters: { agency: { operator: "in", value: ["NSF"] } },
      },
    };
    const logOpportunity = vi.fn();

    await expect(runSearchScenario("agency", async () => result, logOpportunity)).resolves.toBe(
      true
    );
    expect(log).toHaveBeenCalledWith(
      `  filters sent:             ${JSON.stringify(result.filterInfo.filters)}`
    );
    expect(logOpportunity).toHaveBeenCalledWith(opportunity);
  });

  it("reports a failed search without masking it as success", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await expect(
      runSearchScenario(
        "agency",
        async () => {
          throw new Error("live API failed");
        },
        vi.fn()
      )
    ).resolves.toBe(false);
    expect(log).toHaveBeenCalledWith("  ERROR: live API failed");
  });
});

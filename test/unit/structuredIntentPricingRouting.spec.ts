import { describe, expect, it } from "vitest";
import { mapStructuredIntentToCategory as mapMhIntent } from "@/lib/handlers/messageHandler";
import { mapStructuredIntentToCategory as mapOrchIntent } from "@/lib/agents/orchestratorAgent";

describe("structured pricing intent routing", () => {
  it("routes pricing_request into reservation flow in messageHandler", () => {
    expect(mapMhIntent("pricing_request")).toBe("reservation");
  });

  it("routes pricing_request into reservation flow in orchestratorAgent", () => {
    expect(mapOrchIntent("pricing_request")).toBe("reservation");
  });

  it("preserves descriptive routing for amenities_info", () => {
    expect(mapMhIntent("amenities_info")).toBe("amenities_info");
    expect(mapOrchIntent("amenities_info")).toBe("amenities_info");
  });
});

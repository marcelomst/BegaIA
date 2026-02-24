export function buildHydrationContext(
  hotelConfig: any,
  runtimeContext?: any
): any {
  const base =
    hotelConfig && typeof hotelConfig === "object"
      ? { ...hotelConfig }
      : {};

  if (runtimeContext && typeof runtimeContext === "object") {
    base.runtime = runtimeContext;
  }

  return base;
}


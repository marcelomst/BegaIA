// Path: /lib/i18n/getDictionary.ts
export async function getDictionary(lang: string) {
  const code = lang?.slice(0, 2).toLowerCase();
  switch (code) {
    case "en":
      return (await import("./en")).default;
    case "pt":
      return (await import("./pt")).default;
    case "es":
      return (await import("./es")).default;
    default:
      return (await import("./en")).default;
  }
}

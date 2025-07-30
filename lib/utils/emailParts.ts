// Path: /root/begasist/lib/utils/emailParts.ts

export function flattenParts(struct: any): any[] {
  const result: any[] = [];
  for (const element of struct) {
    if (Array.isArray(element)) {
      result.push(...flattenParts(element));
    } else {
      result.push(element);
    }
  }
  return result;
}

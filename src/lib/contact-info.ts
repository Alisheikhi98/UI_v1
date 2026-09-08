const baleIds = ["@amirmbd", "@AliSheikhi98"] as const;

export function getBaleContactUrl(baleId: string) {
  return `https://ble.ir/${baleId.replace(/^@/, "")}`;
}

export const CONTACT_INFO = {
  title: "راه ارتباطی",
  baleIds,
  primaryBaleId: baleIds[0],
  primaryBaleUrl: getBaleContactUrl(baleIds[0]),
} as const;

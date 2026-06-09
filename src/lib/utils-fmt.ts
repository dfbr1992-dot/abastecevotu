export const fmtCurrency = (value: number | string) => {
  const num = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value;
  if (isNaN(num) || num === null || num === undefined) return "—";
  return num.toFixed(2).replace(".", ",");
};

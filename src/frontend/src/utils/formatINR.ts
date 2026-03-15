/**
 * Formats a number in Indian numbering system with ₹ prefix.
 * Example: 1234567 → ₹12,34,567
 */
export function formatINR(value: number): string {
  const num = Math.round(value);
  const str = `${num}`;

  let result = "";
  const len = str.length;
  if (len <= 3) {
    result = str;
  } else {
    result = str.slice(-3);
    let remaining = str.slice(0, -3);
    while (remaining.length > 2) {
      result = `${remaining.slice(-2)},${result}`;
      remaining = remaining.slice(0, -2);
    }
    result = `${remaining},${result}`;
  }

  return `₹${result}`;
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? " " + ONES[o] : ""}`.trim();
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h === 0) return twoDigits(rest);
  return `${ONES[h]} Hundred${rest ? " " + twoDigits(rest) : ""}`.trim();
}

interface CurrencyWords {
  major: string;
  minor: string;
  /** Minor units per major unit (100 fils per dirham, 1000 fils per dinar) */
  minorPerMajor: number;
}

const CURRENCY_WORDS: Record<string, CurrencyWords> = {
  AED: { major: "UAE Dirhams", minor: "Fils", minorPerMajor: 100 },
  SAR: { major: "Saudi Riyals", minor: "Halalas", minorPerMajor: 100 },
  BHD: { major: "Bahraini Dinars", minor: "Fils", minorPerMajor: 1000 },
  OMR: { major: "Omani Rials", minor: "Baisa", minorPerMajor: 1000 },
  QAR: { major: "Qatari Riyals", minor: "Dirhams", minorPerMajor: 100 },
  KWD: { major: "Kuwaiti Dinars", minor: "Fils", minorPerMajor: 1000 },
  EUR: { major: "Euros", minor: "Cents", minorPerMajor: 100 },
  GBP: { major: "Pounds Sterling", minor: "Pence", minorPerMajor: 100 },
  USD: { major: "US Dollars", minor: "Cents", minorPerMajor: 100 },
  CZK: { major: "Czech Koruna", minor: "Haléřů", minorPerMajor: 100 },
  DKK: { major: "Danish Kroner", minor: "Øre", minorPerMajor: 100 },
  HUF: { major: "Hungarian Forints", minor: "Fillér", minorPerMajor: 100 },
  PLN: { major: "Polish Złoty", minor: "Groszy", minorPerMajor: 100 },
  RON: { major: "Romanian Lei", minor: "Bani", minorPerMajor: 100 },
  SEK: { major: "Swedish Kronor", minor: "Öre", minorPerMajor: 100 },
  INR: { major: "Rupees", minor: "Paise", minorPerMajor: 100 },
};

function integerInWords(n: number): string {
  if (n === 0) return "Zero";
  const scales = ["", "Thousand", "Million", "Billion"];
  const parts: string[] = [];
  let rest = n;
  for (let i = 0; rest > 0 && i < scales.length; i++) {
    const chunk = rest % 1000;
    if (chunk) parts.unshift(`${threeDigits(chunk)}${scales[i] ? " " + scales[i] : ""}`);
    rest = Math.floor(rest / 1000);
  }
  return parts.join(" ");
}

/** Indian numbering: lakh (1,00,000) and crore (1,00,00,000). */
function integerInWordsIndian(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  let rest = n % 10000000;
  if (crore) parts.push(`${integerInWordsIndian(crore)} Crore`);
  const lakh = Math.floor(rest / 100000);
  rest %= 100000;
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  const thousand = Math.floor(rest / 1000);
  rest %= 1000;
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));
  return parts.join(" ");
}

/**
 * Amount in words for the invoice footer.
 * e.g. 4200.5 AED → "UAE Dirhams Four Thousand Two Hundred and Fifty Fils Only"
 */
export function amountInWords(amount: number, currency = "AED"): string {
  const words = CURRENCY_WORDS[currency.toUpperCase()] ?? {
    major: currency.toUpperCase(),
    minor: "",
    minorPerMajor: 100,
  };
  if (!Number.isFinite(amount) || amount < 0) return `${words.major} Zero Only`;

  const major = Math.floor(amount);
  const minor = Math.round((amount - major) * words.minorPerMajor);

  const inWords = currency.toUpperCase() === "INR" ? integerInWordsIndian : integerInWords;
  let result = `${words.major} ${inWords(major)}`;
  if (minor > 0 && words.minor) {
    result += ` and ${integerInWords(minor)} ${words.minor}`;
  }
  return `${result} Only`;
}

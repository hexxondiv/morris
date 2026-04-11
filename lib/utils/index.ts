import { roleHierarchy } from "@/app/consts";
import { Role } from "@/types/database.types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatCurrency(
  amount: number,
  currency: string = "NGN",
  options?: {
    forceDecimals?: boolean;
    decimalPlaces?: number;
  }
): string {
  const { forceDecimals = false, decimalPlaces = 2 } = options || {};

  // Determine if we should show decimals
  const shouldShowDecimals = forceDecimals || amount % 1 !== 0;

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: shouldShowDecimals ? decimalPlaces : 0,
    maximumFractionDigits: shouldShowDecimals ? decimalPlaces : 0,
  }).format(amount);
}

export function formatCount(count: number): string {
  return new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(count);
}

export function formatCountAbv(
  count: number,
  options?: {
    useAbbreviation?: boolean;
    decimalPlaces?: number;
  }
): string {
  const { useAbbreviation = false, decimalPlaces = 1 } = options || {};

  if (!useAbbreviation) {
    return formatCount(count);
  }

  const abs = Math.abs(count);

  if (abs >= 1000000000) {
    return (
      (count / 1000000000).toFixed(decimalPlaces).replace(/\.0$/, "") + "B"
    );
  }
  if (abs >= 1000000) {
    return (count / 1000000).toFixed(decimalPlaces).replace(/\.0$/, "") + "M";
  }
  if (abs >= 1000) {
    return (count / 1000).toFixed(decimalPlaces).replace(/\.0$/, "") + "K";
  }

  return count.toString();
}

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toNaira(amount: number | undefined | null): string {
  if (amount == undefined || amount === null || isNaN(amount)) return "";
  return amount.toLocaleString("en-NG", { style: "currency", currency: "NGN" });
}

function isAuthorized(userRole: Role, requiredRole: Role) {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

function formatDate(dateInput: Date | string | number | null): string {
  if (dateInput === null || dateInput === undefined || dateInput === "")
    return "N/A";

  let date: Date;

  if (typeof dateInput === "number" || /^\d+$/.test(String(dateInput))) {
    // treat pure numeric input as milliseconds since epoch
    date = new Date(Number(dateInput));
  } else {
    date = new Date(dateInput);
  }

  if (isNaN(date.getTime())) return "N/A"; // invalid date guard

  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";

  const sameYear = date.getFullYear() === now.getFullYear();

  return sameYear
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) // e.g. Jul 25
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }); // e.g. Mar 12, 2023
}

function formatDateTime(dateInput: Date | string): string {
  const date = new Date(dateInput);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseToDate(input: unknown): Date | null {
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === "string" || typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function omit<T extends object, K extends keyof any>(
  obj: T,
  keys: K[]
): Omit<T, Extract<keyof T, K>> {
  const result = { ...obj } as any;
  keys.forEach((key) => {
    delete result[key as string];
  });
  return result;
}

const irregulars: Record<string, string> = {
  status: "statuses",
  category: "categories",
  person: "people",
  mouse: "mice",
  // add more if needed
};

function pluralize(word: string): string {
  const lower = word.toLowerCase();
  if (irregulars[lower]) return irregulars[lower];

  // if ends with consonant + 'y', drop 'y' and add 'ies'
  if (/[b-df-hj-np-tv-z]y$/i.test(word)) {
    return word.slice(0, -1) + "ies";
  }

  // if ends with s, x, z, ch, sh -> add 'es'
  if (/(s|x|z|ch|sh)$/i.test(word)) {
    return word + "es";
  }

  // default
  return word + "s";
}

export {
  isAuthorized,
  cn,
  formatCurrency,
  capitalize,
  toNaira,
  formatDate,
  formatDateTime,
  omit,
  pluralize,
  parseToDate
};

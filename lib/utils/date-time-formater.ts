interface DateFormatOptions {
  locale?: string;
  timezone?: string;
  includeTime?: boolean;
  includeSeconds?: boolean;
  use24Hour?: boolean;
}

interface FormattedDate {
  short: string;
  medium: string;
  long: string;
  full: string;
  time: string;
  timeWithSeconds: string;
  relative: string;
  iso: string;
  timestamp: number;
  dayOfWeek: string;
  monthYear: string;
}

const formatDate = (
  dateInput: string | Date | number,
  options: DateFormatOptions = {}
): FormattedDate => {
  const {
    locale = "en-US",
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
    includeTime = false,
    includeSeconds = false,
    use24Hour = false,
  } = options;

  // Handle different input types and validate
  let date: Date;
  try {
    if (typeof dateInput === "string") {
      date = new Date(dateInput);
    } else if (typeof dateInput === "number") {
      date = new Date(dateInput);
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      throw new Error("Invalid date input");
    }

    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }
  } catch (error) {
    console.error("Date formatting error:", error);
    const fallback = new Date();
    date = fallback;
  }

  // Base formatter with timezone support
  const baseFormatter = new Intl.DateTimeFormat(locale, { timeZone: timezone });
  
  // Relative time formatter
  const relativeFormatter = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
    style: "long",
  });

  // Get relative time
  const getRelativeTime = (targetDate: Date): string => {
    const now = new Date();
    const diffInMs = targetDate.getTime() - now.getTime();
    const absDiffInMs = Math.abs(diffInMs);
    
    // Use more accurate calculations
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    // For weeks, months, and years, use more precise calculations
    const diffInWeeks = Math.floor(diffInDays / 7);
    
    // Calculate month difference more accurately
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    const diffInMonths = (targetYear - nowYear) * 12 + (targetMonth - nowMonth);
    
    // Calculate year difference
    const diffInYears = targetYear - nowYear;
    
    // Choose the appropriate unit based on absolute difference
    if (absDiffInMs < 60 * 1000) {
      // Less than 1 minute
      return relativeFormatter.format(diffInSeconds, "second");
    } else if (absDiffInMs < 60 * 60 * 1000) {
      // Less than 1 hour
      return relativeFormatter.format(diffInMinutes, "minute");
    } else if (absDiffInMs < 24 * 60 * 60 * 1000) {
      // Less than 1 day
      return relativeFormatter.format(diffInHours, "hour");
    } else if (absDiffInMs < 7 * 24 * 60 * 60 * 1000) {
      // Less than 1 week
      return relativeFormatter.format(diffInDays, "day");
    } else if (Math.abs(diffInMonths) < 1) {
      // Less than 1 month but more than 1 week
      return relativeFormatter.format(diffInWeeks, "week");
    } else if (Math.abs(diffInYears) < 1) {
      // Less than 1 year but more than 1 month
      return relativeFormatter.format(diffInMonths, "month");
    } else {
      // 1 year or more
      return relativeFormatter.format(diffInYears, "year");
    }
  };

  // Create formatted outputs
  return {
    // Short format: "Jan 15"
    short: date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      timeZone: timezone,
    }),

    // Medium format: "Jan 15, 2024"
    medium: date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: timezone,
    }),

    // Long format: "January 15, 2024"
    long: date.toLocaleDateString(locale, {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: timezone,
    }),

    // Full format: "Monday, January 15, 2024"
    full: date.toLocaleDateString(locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: timezone,
    }),

    // Time format
    time: date.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: !use24Hour,
      timeZone: timezone,
    }),

    // Time with seconds
    timeWithSeconds: date.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: !use24Hour,
      timeZone: timezone,
    }),

    // Relative time: "2 hours ago", "in 3 days"
    relative: getRelativeTime(date),

    // ISO string
    iso: date.toISOString(),

    // Unix timestamp
    timestamp: date.getTime(),

    // Day of week: "Monday"
    dayOfWeek: date.toLocaleDateString(locale, {
      weekday: "long",
      timeZone: timezone,
    }),

    // Month and year: "January 2024"
    monthYear: date.toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
      timeZone: timezone,
    }),
  };
};

// Utility functions for common use cases
export const formatDateShort = (dateInput: string | Date | number) =>
  formatDate(dateInput).short;

export const formatDateMedium = (dateInput: string | Date | number) =>
  formatDate(dateInput).medium;

export const formatDateWithTime = (
  dateInput: string | Date | number,
  options: DateFormatOptions = {}
) => {
  const formatted = formatDate(dateInput, options);
  return `${formatted.medium} at ${formatted.time}`;
};

export const formatRelativeTime = (dateInput: string | Date | number) =>
  formatDate(dateInput).relative;

// Smart formatter that chooses appropriate format based on how recent the date is
export const formatDateSmart = (
  dateInput: string | Date | number,
  options: DateFormatOptions = {}
): string => {
  if (!dateInput) return "";
  
  const formatted = formatDate(dateInput, options);
  const date = new Date(dateInput);
  const now = new Date();
  const diffInHours = Math.abs((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  const diffInDays = diffInHours / 24;

  if (diffInHours < 24) {
    return formatted.relative; // "2 hours ago"
  } else if (diffInDays < 7) {
    return `${formatted.dayOfWeek} at ${formatted.time}`; // "Monday at 3:45 PM"
  } else {
    return formatted.medium; // "Jan 15, 2024"
  }
};

export default formatDate;
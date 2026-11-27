import originalDayjs, { Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import advancedFormat from "dayjs/plugin/advancedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";
import quarterOfYear from "dayjs/plugin/quarterOfYear";

originalDayjs.extend(utc);
originalDayjs.extend(timezone);
originalDayjs.extend(advancedFormat);
originalDayjs.extend(relativeTime);
originalDayjs.extend(duration);
originalDayjs.extend(quarterOfYear);

export const FACTORY_TIMEZONE = "Asia/Karachi";
originalDayjs.tz.setDefault(FACTORY_TIMEZONE);

export const DEVICE_TIMEZONE = (() => {
  try {
    return (
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      originalDayjs.tz.guess() ||
      "UTC"
    );
  } catch {
    return "UTC";
  }
})();

/**
 * Karachi-aware dayjs wrapper.
 * Defaults all dayjs operations to Asia/Karachi (Factory timezone)
 * while allowing client devices anywhere in the world to perform
 * accurate calculations without altering their device OS timezone.
 */
function karachiDayjs(date?: any, format?: any, strict?: any): Dayjs {
  if (date === undefined) {
    return originalDayjs.tz(undefined, FACTORY_TIMEZONE);
  }
  if (date === null) {
    return originalDayjs(null);
  }
  if (originalDayjs.isDayjs(date)) {
    if (!date.isValid()) return date;
    try {
      return date.tz(FACTORY_TIMEZONE);
    } catch {
      return date;
    }
  }
  if (typeof date === "string") {
    // If string already contains an ISO timezone offset (Z, +HH:mm, -HH:mm)
    if (/(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(date)) {
      const d = originalDayjs(date);
      if (!d.isValid()) return d;
      try {
        return d.tz(FACTORY_TIMEZONE);
      } catch {
        return d;
      }
    }
    // String without timezone offset (e.g. IoT/DB date "2026-10-06 14:00:00" or "YYYY-MM-DD")
    // Parse directly in factory timezone (Asia/Karachi)
    const raw = typeof format === "string" ? originalDayjs(date, format, strict) : originalDayjs(date);
    if (!raw.isValid()) return raw;
    try {
      if (typeof format === "string") {
        return originalDayjs.tz(date, format, FACTORY_TIMEZONE);
      }
      return originalDayjs.tz(date, FACTORY_TIMEZONE);
    } catch {
      return raw;
    }
  }
  if (typeof date === "number") {
    if (isNaN(date)) return originalDayjs(NaN);
    const d = originalDayjs(date);
    if (!d.isValid()) return d;
    try {
      return d.tz(FACTORY_TIMEZONE);
    } catch {
      return d;
    }
  }
  if (date instanceof Date) {
    const d = originalDayjs(date);
    if (!d.isValid()) return d;
    try {
      return d.tz(FACTORY_TIMEZONE);
    } catch {
      return d;
    }
  }
  const d = originalDayjs(date);
  if (!d.isValid()) return d;
  try {
    return d.tz(FACTORY_TIMEZONE);
  } catch {
    return d;
  }
}

// Preserve all Dayjs static methods and properties
Object.setPrototypeOf(karachiDayjs, originalDayjs);
Object.assign(karachiDayjs, originalDayjs);

// Unix timestamp helper defaulting to factory timezone
karachiDayjs.unix = (timestamp: number): Dayjs => {
  if (timestamp === undefined || timestamp === null || isNaN(Number(timestamp))) {
    return originalDayjs(NaN);
  }
  const d = originalDayjs.unix(Number(timestamp));
  if (!d.isValid()) return d;
  try {
    return d.tz(FACTORY_TIMEZONE);
  } catch {
    return d;
  }
};

// Dayjs timezone helper
karachiDayjs.tz = (...args: any[]): Dayjs => {
  try {
    const firstArg = args[0];
    if (firstArg !== undefined && firstArg !== null) {
      const d = originalDayjs(firstArg);
      if (!d.isValid()) return d;
    }
    return (originalDayjs.tz as any)(...args);
  } catch {
    return originalDayjs(args[0]);
  }
};

// Helper: convert any dayjs instance to the device's local timezone
karachiDayjs.toDeviceTz = (d: Dayjs): Dayjs => {
  if (!d || !d.isValid()) return d;
  try {
    return d.tz(DEVICE_TIMEZONE);
  } catch {
    return d;
  }
};

// Helper: convert any dayjs instance to Karachi timezone
karachiDayjs.toKarachiTz = (d: Dayjs): Dayjs => {
  if (!d || !d.isValid()) return d;
  try {
    return d.tz(FACTORY_TIMEZONE);
  } catch {
    return d;
  }
};

karachiDayjs.deviceTimeZone = DEVICE_TIMEZONE;
karachiDayjs.factoryTimeZone = FACTORY_TIMEZONE;

export type { Dayjs };
export default karachiDayjs as unknown as typeof originalDayjs & {
  deviceTimeZone: string;
  factoryTimeZone: string;
  toDeviceTz: (d: Dayjs) => Dayjs;
  toKarachiTz: (d: Dayjs) => Dayjs;
};

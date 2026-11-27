import dayjs from "../dayjs";
const minifiedSecFormatter = (rawSeconds: number): string => {
  const seconds = Math.max(0, Math.floor(rawSeconds || 0));
  const duration = dayjs.duration(seconds, "seconds");

  const weeks = Math.floor(duration.asWeeks());
  if (weeks > 0) {
    return `${weeks}w`;
  }

  const days = Math.floor(duration.asDays());
  if (days > 0) {
    return `${days}d`;
  }

  const hours = Math.floor(duration.asHours());
  if (hours > 0) {
    return `${hours}h`;
  }

  const minutes = Math.floor(duration.asMinutes());
  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${seconds}s`;
};

export default minifiedSecFormatter;

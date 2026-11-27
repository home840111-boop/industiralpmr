const secondsToHourMin = (time: any): string => {
  if (time === undefined || time === null) return "00:00";
  if (typeof time === "string") {
    if (time.includes(":")) return time;
    time = Number(time);
  }
  if (typeof time !== "number" || isNaN(time)) return "00:00";

  let secs = Math.floor(time);
  if (secs < 0) secs = 0;
  if (secs >= 86400) secs = secs % 86400;

  const hours = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);

  const hh = String(hours).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  return `${hh}:${mm}`;
};
export default secondsToHourMin;


const timeToSec = (time: string): number => {
  const [hours, minutes] = time.split(":");
  return +hours * 3600 + +minutes * 60;
};
export default timeToSec;

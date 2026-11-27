import formatter from "./numberFormatter";

const lengthFormatter = (value: number) => {
  // value is in m, if less than 1m, convert to mm, else show in m
  if (value < 1) return formatter(+(value * 1000).toFixed(2), "mm");
  return formatter(+value.toFixed(2), "m");
};

export default lengthFormatter;

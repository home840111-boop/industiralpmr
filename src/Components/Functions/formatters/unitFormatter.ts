import formatter from "./numberFormatter";

const format = (value: number, suffix: string = "kWh") => {
  return formatter(+value.toFixed(3), suffix);
};

export default format;

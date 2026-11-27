import formatter from "./numberFormatter";

const weightFormatterFunc = (value: number, pc_weight?: number | null): string => {
  if (pc_weight) {
    const pcs = +(value / pc_weight).toFixed(0);
    return `${weightFormatterFunc(value)} / ${formatter(pcs, "pc(s)")}`;
  }
  if (value < 1000) {
    if (value < -1000) {
      value /= 1000;
      return formatter(+value.toFixed(2), "kg");
    }
    if (value < 0.01 && value !== 0) {
      value *= 1000;
      return formatter(+value.toFixed(2), "mg");
    }
    return formatter(+value.toFixed(2), "g");
  } else {
    value /= 1000;
    return formatter(+value.toFixed(2), "kg");
  }
};

export default weightFormatterFunc;

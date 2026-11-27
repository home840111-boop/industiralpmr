const format = (value: number, suffix: string) => {
  return `${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ${suffix}`;
};

export default format;

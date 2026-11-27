const hourlyTimeFixer = (data: any) => {
  const newData = Object.entries(data).map(([key, hour]: any) => {
    let actual_duration = hour.time - hour.from;
    // actual_duration += 60;
    const { ontime, shutdown_time, status } = hour;
    if (status) {
      const extra = actual_duration - (ontime + (shutdown_time || 0));
      if (extra < 0) hour.ontime += extra;
      if (hour.ontime < 0) hour.ontime = 0;
    }
    return [key, hour];
  });
  return Object.fromEntries(newData);
};

export default hourlyTimeFixer;

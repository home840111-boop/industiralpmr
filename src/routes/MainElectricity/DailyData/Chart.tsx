import { Line } from '@ant-design/plots';
import { useEffect, useState } from 'react';
import { Breakdown } from '.';
import unitFormatter from "../../../Components/Functions/formatters/unitFormatter";
import dayjs from "../../../Components/Functions/dayjs";

interface Data {
  time: string;
  value: number;
  type: 'Today' | 'Yesterday';
}

const HourlyChart = ({
  today,
  yesterday,
}: {
  today: Breakdown;
  yesterday: Breakdown;
}) => {
  const [animation, setAnimation] = useState<boolean>(true);
  const [data, setData] = useState<Data[]>([]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimation(false);
    }, 5000);
    return () => {
      clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    const func = async () => {
      const data: Data[] = [];
      for await (const [index, value] of yesterday.values.entries()) {
        const time = dayjs("1970-01-01 " + yesterday.names[index].split(" - ")[0]).format("ha");
        data.push({
          time,
          value,
          type: 'Yesterday',
        });
      }
      for await (const [index, value] of today.values.entries()) {
        const time = dayjs("1970-01-01 " + today.names[index].split(" - ")[0]).format("ha");
        data.push({
          time,
          value,
          type: 'Today',
        });
      }
      setData(data);
    }

    func();
  }, [today, yesterday]);

  const config = {
    animation,
    data,
    height: 350,
    yAxis: {
      label: {
        formatter: (v: string) => {
          return `${v} kWh`;
        },
      },
      grid: {
        line: {
          style: {
            stroke: 'transparent',
          },
        },
      },
    },
    smooth: true,
    xField: 'time',
    yField: 'value',
    seriesField: 'type',
  };

  return <Line
    legend={{
      position: 'bottom',
    }}
    lineStyle={{
      lineWidth: 3,
    }}
    color={['#8080805e', '#ED8936']}
    tooltip={{
      formatter: (datum: any) => {
        return {
          name: datum.type,
          value: unitFormatter(datum.value),
        };
      }
    }}
    {...config} />;
};

export default HourlyChart;
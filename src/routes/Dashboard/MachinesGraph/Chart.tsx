import { Bar } from '@ant-design/plots';
import { useEffect, useState } from 'react';
import lengthFormatter from '../../../Components/Functions/formatters/lengthFormatter';
import format from "../../../Components/Functions/formatters/numberFormatter";
import unitFormat from "../../../Components/Functions/formatters/unitFormatter";
import weightFormat from "../../../Components/Functions/formatters/weightFormatter";

interface props {
  machines: {
    name: string;
    shots: number;
    production: number;
    material: number;
    electricity: number;
  }[];
  view: "shots" | "production" | "material" | "electricity" | "production_meters";
}
const Chart = ({
  machines,
  view
}: props) => {
  const [animation, setAnimation] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimation(false);
    }, 5000);

    return () => {
      clearTimeout(timeout);
    }
  }, []);
  const config = {
    data: machines,
    xField: view,
    yField: 'name',
    animation,
    // round the bar
    barStyle: {
      radius: 5,
    },
    // remove bg lines
    xAxis: {
      grid: {
        line: {
          style: {
            lineWidth: 0,
          },
        },
      },
    },
    // update text
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: datum.name,
          value: view === "shots" ? format(datum[view], "shot(s)")
            : view === "production" ? format(datum[view], "pc(s)")
              : view === "electricity" ? unitFormat(datum[view])
                : view === "production_meters" ? lengthFormatter(datum[view])
                  : view === "material" ? weightFormat(datum[view])
                    : datum[view]
        };
      }
    }
  };

  return <Bar
    height={200}
    legend={false}
    {...config
    } />
}

export default Chart
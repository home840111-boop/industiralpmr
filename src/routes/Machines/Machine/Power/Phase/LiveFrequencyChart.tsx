import { Line } from "@ant-design/plots"
import { Box, Text } from "@chakra-ui/react"
import { useEffect, useState } from "react";

const LiveFrequencyChart = ({
    freq,
    voltage
}: {
    freq: number,
    voltage: number
}) => {
    const [freqnowData, setFreqnowData] = useState<{
        ms: number,
        value: number
    }[]>([]);

    useEffect(() => {
        if (!freq) return;
        const cycle = 1000 / freq;
        // nowData will start from 0ms with value 0 then cycle/4 ms with value voltage then cycle/2 ms with value 0 then cycle*3/4 ms with value -voltage then cycle ms with value 0, do two times
        const nowData = [
            { ms: 0, value: 0 },
            { ms: cycle / 4, value: voltage },
            { ms: cycle / 2, value: 0 },
            { ms: cycle * 3 / 4, value: -voltage },
            { ms: cycle, value: 0 },
        ];
        setFreqnowData(nowData);

    }, [freq, voltage]);
    const freqConfig = {
        range: [0, 1],
        data: freqnowData,
        xField: 'ms',
        yField: 'value',
        yAxis: {
            label: {
                formatter: (v: any) => `${v} V`,
            },
            tickCount: 3,
        },
        xAxis: {
            label: {
                formatter: (v: any) => `${(+v).toFixed(1)}ms`,
            },
            tickCount: 5,
        },

    };

  return <Box w="80%">
  <Line
      tooltip={false}
      animation={false}
      lineStyle={{
          stroke: '#1979C9',
          lineWidth: 4,
      }}
      smooth={true}
      height={100}
      {...freqConfig} />
  <Box mt={2} display="flex" flexDir={"row"} w="100%" justifyContent={"center"} gap={1}>
      <Text opacity={0.8} fontSize="md" fontWeight={500} textAlign="center">Frequency: </Text>
      <Text opacity={1} fontSize="md" fontWeight={500} textAlign="center">{freq.toFixed(0)}Hz</Text>
  </Box>

</Box>
}

export default LiveFrequencyChart
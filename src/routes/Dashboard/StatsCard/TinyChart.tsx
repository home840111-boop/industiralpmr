import { TinyArea } from '@ant-design/plots';
import { Box } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

const TinyChart = ({
    data = [],
    color = '#ED8936'
}: {
    data: number[],
    color?: string
}) => {
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
        height: 40,
        autoFit: true,
        data,
        smooth: true,
        line: {
            color,
            style: {
                lineWidth: 2,
            }
        },
        areaStyle: {
            fill: `l(270) 0:${color}00 1:${color}60`,
        },
        animation,
    }

    return <Box w="100%" h="40px" minW={0} overflow="hidden">
        <TinyArea
            {...config} />
    </Box>
}

export default TinyChart
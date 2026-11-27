import { Sankey } from '@ant-design/plots';
import { CardBody, CardHeader, Center, Heading, useColorMode } from '@chakra-ui/react'
import { useMemo } from 'react';
import { ChartData } from '.';
import MyCard from '../../../Components/micro/Card'
import weightFormatter from '../../../Components/Functions/formatters/weightFormatter';
import { SmallFill } from '../../../Components/Loaders';

const Chart = ({
    loading,
    data
}: {
    loading: boolean,
    data: ChartData[]
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`,
    }), [colorMode]);

    const config = {
        data,
        sourceField: 'source',
        targetField: 'target',
        weightField: 'value',
        nodeWidthRatio: 0.008,
        nodePaddingRatio: 0.03,
    };

    return <MyCard p={0}>
        <CardHeader
            borderBottom="1px solid"
            borderColor={border}
            justifyContent="space-between"
            alignItems={"center"}
            p={4}>
            <Heading
                fontWeight={500}
                size="sm">Material Distribution</Heading>
        </CardHeader>
        <CardBody>
            {
                loading ? <Center h="300px">
                    <SmallFill />
                </Center> : <Sankey
                    height={350}
                    tooltip={{
                        formatter: (datum: any) => {
                            return { name: `${datum.source} -> ${datum.target}`, value: weightFormatter(datum.value * 1000) };
                        }
                    }}
                    {...config} />}
        </CardBody>
    </MyCard>
}

export default Chart
import {
    Box,
    Flex,
    Text,
    Icon,
    Tag,
    Heading,
    BoxProps,
    Skeleton,
    SimpleGrid,
    GridItem
} from "@chakra-ui/react";
import { useMemo, Suspense } from "react";
import { IconType } from "react-icons";
import NumberFormatter from "../../../Components/micro/NumberFormatter";
import WeightFormatter from "../../../Components/micro/WeightFormatter";
import UnitFormatter from "../../../Components/micro/UnitFormatter";
import MyCard from "../../../Components/micro/Card";
import { BsArrowDownShort, BsArrowUpShort } from "react-icons/bs";
import TinyChart from "./TinyChart";
import NotFound from "../../../Components/micro/NotFound";
import LengthFormatter from "../../../Components/micro/LengthFormatter";
import MyTooltip from "../../../Components/micro/MyTooltip";

interface StatProps extends BoxProps {
    title: string
    realtimeKW?: {
        current: number
        change: number
    }
    value?: number
    icon: IconType
    changeInverse?: boolean
    change?: number
    outOff?: number | null
    format?: "units" | "weight" | "shots" | "pieces" | "quantity" | "meter",
    chart?: number[],
    notFound?: boolean
}
const Stat = ({
    title,
    realtimeKW,
    value = -1,
    icon,
    change,
    changeInverse = false,
    outOff = null,
    format = "quantity",
    chart = [],
    notFound = false,
    ...props
}: StatProps): JSX.Element => {
    const increase = useMemo(() => change === undefined ? false : change >= 0, [change]);
    const loading = useMemo(() => value < 0, [value]);

    return <Box
        px={5}
        py={4}
        {...props}
        noPadding
        as={MyCard}>
        <Flex
            mb={5}
            justifyContent={"space-between"}
            flexDir="row">
            <Text
                textTransform={"uppercase"}
                fontWeight='medium'
                opacity={0.8}
                letterSpacing={"wide"}
                fontSize={14}>{title}</Text>
            <Icon
                fontSize={"2xl"}
                opacity={0.8}
                as={icon} />
        </Flex>
        <SimpleGrid
            columns={{ base: 1, sm: 3 }}
            justifyContent={"space-between"}
            alignItems={'flex-end'}>
            <Flex
                minH={"80px"}
                 colSpan={{ base: 1, sm: notFound ? 3 : 2 }}
                as={GridItem}
                mt={3}
                gap={2}
                flexDir="column"
                justify={"flex-end"}
                alignItems={notFound ? "center" : "flex-start"}>
                {
                    notFound ? <Suspense fallback={<Skeleton
                        h={"30px"}
                        w={"90%"} />}>
                        <NotFound />
                    </Suspense> : <>
                        {loading ? <Skeleton
                            h={"30px"}
                            w={"90%"} /> : <Flex
                                alignItems={"flex-end"}
                                gap={2} flexDir={"row"} flexGrow={1} flexShrink={1} flexBasis={"100%"}
                            ><Heading
                                letterSpacing={"wide"}
                                fontSize={"2xl"}
                                fontWeight={600}>{outOff === null ?
                                    format === "weight" ? <WeightFormatter number={value} /> :
                                        format === "units" ? <UnitFormatter number={value} /> :
                                            format === "meter" ? <LengthFormatter number={value} /> :
                                                format === "shots" ? <NumberFormatter number={value} suffix="shot(s)" /> :
                                                    format === "pieces" ? <NumberFormatter number={value} suffix="pc(s)" /> :
                                                        <NumberFormatter number={value} /> : `${value}/${outOff}`}</Heading>
                            {realtimeKW ? (<MyTooltip label={realtimeKW.change === 0 ? "unchanged load" : `load ${realtimeKW.change < 0 ? "decreased" : "incresed"} by ${Math.abs(realtimeKW.change)}%`}>
                                <Text
                                    w="fit-content"
                                    fontSize="md"
                                    fontWeight={700}
                                    color={realtimeKW.change === 0 ? undefined : realtimeKW.change > 0 ? "red" : "green"}>
                                    {realtimeKW.change === 0 ? null : <Icon as={realtimeKW.change > 0 ? BsArrowUpShort : BsArrowDownShort} />}
                                    <NumberFormatter number={realtimeKW.current} suffix={"KW"} />
                                </Text>
                            </MyTooltip>) : null}</Flex>}
                        {change !== undefined ? <Flex gap={2}>
                            <Tag size="xs" p="2px">
                                <Text display={"flex"} fontWeight={600} color={increase ? changeInverse ? "red.500" : "green.500" : changeInverse ? "green.500" : "red.500"} fontSize="xs">
                                    <Icon as={increase ? BsArrowUpShort : BsArrowDownShort} />{` ${Math.abs(change).toFixed(2)}%`}</Text>
                            </Tag>
                            <Text fontSize="xs"> vs. previous hour</Text>
                        </Flex> : null}
                    </>
                }
            </Flex>
            <Box w="100%" minW={0} mt={{ base: 3, sm: 0 }}>
                {chart.length > 0 ? <TinyChart
                    color={
                        format === "weight" ? "#0d9f8b" :
                            format === "units" ? "#e95e44" :
                                format === "shots" ? "#FDD36A" :
                                    undefined
                    }
                    data={chart} /> : null}
            </Box>
        </SimpleGrid>
    </Box >
}

export default Stat;
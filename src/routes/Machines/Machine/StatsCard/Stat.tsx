import {
    Box,
    Flex,
    Text,
    Icon,
    Tag,
    Heading,
    BoxProps,
    Skeleton,
    GridItem
} from "@chakra-ui/react";
import { useMemo, Suspense } from "react";
import { IconType } from "react-icons";
import NumberFormatter from "../../../../Components/micro/NumberFormatter";
import WeightFormatter from "../../../../Components/micro/WeightFormatter";
import UnitFormatter from "../../../../Components/micro/UnitFormatter";
import MyCard from "../../../../Components/micro/Card";
import { BsArrowDownShort, BsArrowUpShort } from "react-icons/bs";
import NotFound from "../../../../Components/micro/NotFound";
import LengthFormatter from "../../../../Components/micro/LengthFormatter";

interface StatProps extends BoxProps {
    title: string
    value?: number
    icon: IconType
    changeInverse?: boolean
    change?: number
    outOff?: number | null
    format?: "units" | "weight" | "shots" | "pieces" | "quantity" | "meter",
    chart?: number[],
    notFound?: boolean
    actionBadge?: React.ReactNode
}
const Stat = ({
    title,
    value = -1,
    icon,
    change,
    changeInverse = false,
    outOff = null,
    format = "quantity",
    chart = [],
    notFound = false,
    actionBadge,
    ...props
}: StatProps): JSX.Element => {
    const increase = useMemo(() => change === undefined ? false : change >= 0, [change]);
    const loading = useMemo(() => value < 0, [value]);

    return <Box
        px={5}
        py={3}
        {...props}
        noPadding
        as={MyCard}>
        <Flex
            mb={2}
            justifyContent={"space-between"}
            alignItems="center"
            flexDir="row">
            <Flex align="center" gap={2} flexWrap="wrap">
                <Text
                    textTransform={"uppercase"}
                    fontWeight='medium'
                    opacity={0.8}
                    letterSpacing={"wide"}
                    fontSize={14}>{title}</Text>
                {actionBadge}
            </Flex>
            <Icon
                fontSize={"2xl"}
                opacity={0.8}
                as={icon} />
        </Flex>
        <Flex
            justifyContent={"space-between"}
            alignItems={'flex-end'}>
            <Flex
                minH={"50px"}
                as={GridItem}
                mt={1}
                gap={2}
                flexDir="column"
                justify={"flex-end"}
                alignItems={notFound ? "center" : "flex-start"}>
                {
                    notFound ? <Suspense fallback={<Skeleton
                        h={"30px"}
                        w={"100px"} />}>
                        <NotFound />
                    </Suspense> : <>
                        {loading ? <Skeleton
                            h={"30px"}
                            w={"100px"} /> : <Heading
                                letterSpacing={"wide"}
                                fontSize={"2xl"}
                                fontWeight={600}>{outOff === null ?
                                    format === "weight" ? <WeightFormatter number={value} /> :
                                        format === "units" ? <UnitFormatter number={value} /> :
                                            format === "meter" ? <LengthFormatter number={value} /> :
                                                format === "shots" ? <NumberFormatter number={value} suffix="shot(s)" /> :
                                                    format === "pieces" ? <NumberFormatter number={value} suffix="pc(s)" /> :
                                                        <NumberFormatter number={value} /> : `${value}/${outOff}`}</Heading>}
                    </>
                }
            </Flex>
            {change !== undefined && !isNaN(change as number) ? <Flex gap={2}>
                <Tag size="md" p="2px">
                    <Text display={"flex"} fontWeight={600} color={increase ? changeInverse ? "red.500" : "green.500" : changeInverse ? "green.500" : "red.500"} fontSize="xs">
                        <Icon as={increase ? BsArrowUpShort : BsArrowDownShort} />{` ${Math.abs(change).toFixed(2)}%`}</Text>
                </Tag>
            </Flex> : null}
        </Flex>
    </Box>
}

export default Stat;
import { CardHeader, Text, useColorMode, VStack, CardBody, Center, Flex, Skeleton, HStack, CardFooter, Icon, Box, Heading } from "@chakra-ui/react";
import MyTooltip from "../../../Components/micro/MyTooltip";
import { useMemo } from "react";
import minifiedSecFormatter from "../../../Components/Functions/formatters/minifiedSecFormatter";
import MyCard from "../../../Components/micro/Card";
import dayjs from "../../../Components/Functions/dayjs";
import { BiTimeFive } from "react-icons/bi";
import UnitFormatter from "../../../Components/micro/UnitFormatter";
import UnitDisplay from "../../../Components/micro/UnitDisplay";
import { equipmentDetailsType, Report } from ".";
import secFormatter from "../../../Components/Functions/formatters/secFormatter";

const EquipmentDetails = ({
    report,
    details
}: {
    report: Report | null,
    details: equipmentDetailsType | null
}) => {
    const { colorMode } = useColorMode();
    const { border, subText, text, displayBG } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
            subText: `${colorMode}.subText`,
            text: `${colorMode}.text`,
            displayBG: colorMode === "light" ? "gray.200" : "whiteAlpha.200"
        }
    }, [colorMode]);

    if (!details || !report) return <LoadingCard />;

    return <MyCard
        h="100%"
        noPadding>
        <CardHeader
            display={"flex"}
            justifyContent={"space-between"}
            alignItems={"center"}
            py={4}
            borderBottom="1px solid"
            borderColor={border}>
            <Text
                fontSize="md"
                fontWeight={500}>Equipment Details</Text>
        </CardHeader>
        <CardBody as={VStack} px={0} pb={0} h={"100%"}>
            <Center w="90%" flexDir={"column"} mb={5}>
                <Box
                    borderRadius={5}
                    py={5}
                    w="100%"
                    bgColor={displayBG}>
                    <Heading fontSize="5xl" textAlign="center" fontFamily={"Orbitron"} fontStyle={'normal'}>
                        <UnitFormatter number={report.total.electricity} />
                    </Heading>
                </Box>
            </Center>
            <VStack w="100%" alignItems={"flex-start"} borderTop={"1px solid"} borderColor={border} px={5} py={2} m={0}>
                <Text fontSize={"xl"} fontWeight={600}>{details.name}</Text>
                <Flex
                    w="100%"
                    justifyContent={"space-between"}>
                    <Text fontSize={"md"} fontWeight={500} color={
                        details.status === "NA" ? "gray" :
                            details.isUpToDate !== true ? "cadetblue" :
                                details.status === "ON" ? "green" :
                                    details.status === "OFF" ? "red" :
                                        details.status === "IDLE" ? "orange" :
                                            undefined
                    }>
                        <MyTooltip label={dayjs.unix(details.statusSince).format("DD-MM-YYYY HH:mm:ss")}>
                            {`${details.status}${(details.isUpToDate === true || details.status === "OFF") ? "" : `(${details.isUpToDate})`} • ${minifiedSecFormatter(dayjs().unix() - details.statusSince)}`}
                        </MyTooltip>
                    </Text>
                </Flex>
            </VStack>
            <VStack w="100%" alignItems={"flex-start"} borderTop={"1px solid"} borderColor={border} px={5} py={2} m={0}>
                <Text fontSize={"md"} fontWeight={500} mb={2} textDecor="underline">Current Operations</Text>
                <VStack
                    fontWeight={600}
                    alignItems={"flex-start"}>
                    <Text
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        T. Sessions: <Text
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={text}>
                            {report.total.sessions}
                        </Text>
                    </Text>
                    <Text
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        On Time: <Text
                            textTransform={"lowercase"}
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={text}>
                            <MyTooltip label={secFormatter(report.total.ontime)}>
                                {minifiedSecFormatter(report.total.ontime)}
                            </MyTooltip>
                        </Text>
                    </Text>
                </VStack>
            </VStack>
        </CardBody>
        <CardFooter
            borderTop={"1px solid"}
            borderColor={border}
            display={"flex"}
            flexDir={"row"}
            justifyContent={"space-between"}
            p={2}
            px={4}>
            <UnitDisplay
                unit={details.unit}
                opacity={0.9}
                fontSize="xs">
                {`UNIT#${String(details.unit).padStart(2, "0")}`}
            </UnitDisplay>
            <Text
                display={"flex"}
                alignItems={"center"}
                textAlign={"center"}
                fontSize={"xs"}
                color={text}
                fontWeight={600}>
                <Icon
                    fontSize={"md"}
                    color={text}
                    mr={1}
                    as={BiTimeFive} />
                <MyTooltip label={dayjs.unix(details.lastUpdated).format("DD-MM-YYYY HH:mm:ss")}>
                    {dayjs.unix(details.lastUpdated).fromNow()}
                </MyTooltip>
            </Text>
        </CardFooter>
    </MyCard>
}

const LoadingCard = () => {
    const { colorMode } = useColorMode();
    const { border } = {
        border: `${colorMode}.border`
    }

    return <MyCard p={0}>
        <CardHeader
            borderTopRadius={"md"}
            borderBottom={`1px solid`}
            borderBottomColor={border}
            display={"flex"}
            flexDir={"row"}
            justifyContent={"space-between"}
            py={3}>
            <Skeleton h="20px" w="50%" />
        </CardHeader>
        <CardBody
            h={"100%"}
            p={0}
            as={VStack}>
            <Center flexDir={"column"} w="100%" p={7}>
                <Skeleton h="100px" w="100%" mt={5} />
            </Center>
            <HStack
                w="100%"
                px={3}
                borderTop="1px solid"
                borderTopColor={border}>
                <VStack alignItems={"flex-start"} py={3} w="50%" gap={2}>
                    <Skeleton h="20px" w="50%" mt={3} />
                    <Skeleton h="15px" w="100%" mt={5} />
                    <Skeleton h="15px" w="100%" mt={3} />
                </VStack>
            </HStack>
        </CardBody>
        <CardFooter
            borderTop={`1px solid`}
            borderTopColor={border}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            p={2}
            px={4}>
            <Skeleton h="15px" w="30%" />
            <Skeleton h="15px" w="30%" />
        </CardFooter>
    </MyCard>
}

export default EquipmentDetails
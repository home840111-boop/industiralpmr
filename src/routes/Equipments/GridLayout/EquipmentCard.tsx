import { Box, CardBody, CardFooter, CardHeader, Center, Heading, Text, useColorMode, VStack, Icon, Flex } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { Equipment } from '..';
import minifiedSecFormatter from '../../../Components/Functions/formatters/minifiedSecFormatter';
import MyCard from '../../../Components/micro/Card';
import dayjs from "../../../Components/Functions/dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import secFormatter from '../../../Components/Functions/formatters/secFormatter';
import NumberFormatter from '../../../Components/micro/NumberFormatter';
import { BiTimeFive } from 'react-icons/bi';
import UnitFormatter from '../../../Components/micro/UnitFormatter';
import MyTooltip from '../../../Components/micro/MyTooltip';
import { BsArrowDownShort, BsArrowUpShort } from 'react-icons/bs';
dayjs.extend(relativeTime);

const EquipmentCard = ({
    equipment
}: {
    equipment: Equipment
}) => {
    const { colorMode } = useColorMode();
    const { text, subText, border, displayBG } = {
        text: `${colorMode}.text`,
        subText: `${colorMode}.subText`,
        border: `${colorMode}.border`,
        displayBG: colorMode === "light" ? "gray.200" : "whiteAlpha.200"
    }
    const headingText = "whiteAlpha.900";

    return <Box
        maxW={{
            base: "100%",
            sm: 350
        }}
        as={Link}
        to={`/equipments/${equipment.id}`}>
        <MyCard
            _hover={{
                transform: "translateY(-3px)",
                boxShadow: "xl"
            }}
            transition={"all 0.2s ease-in-out"}
            p={0}>
            <CardHeader
                h="70px"
                borderTopRadius={"md"}
                bgColor={
                    equipment.status === "NA" ? "gray" :
                        equipment.status === "OFF" ? "red" :
                            equipment.isUpToDate !== true ? "cadetblue" :
                                equipment.status === "ON" ? "green" :
                                    equipment.status === "IDLE" ? "orange" :
                                        undefined
                }
                borderBottom={`1px solid`}
                borderBottomColor={border}
                display={"flex"}
                flexDir={"column"}
                justifyContent={"center"}
                py={3}>
                <Heading textAlign={"center"} color={headingText} size={"md"}>{equipment.name}</Heading>
                <Text textAlign={"center"} fontSize={"xs"} color={headingText} fontWeight={600}>
                    <MyTooltip label={dayjs.unix(equipment.statusSince).format("DD-MM-YYYY HH:mm:ss")}>
                        {minifiedSecFormatter(dayjs().unix() - equipment.statusSince)}
                    </MyTooltip>
                    {(equipment.isUpToDate === true || equipment.status === "OFF") ? "" : `(${equipment.isUpToDate})`}
                    {` - ${equipment.status}`}
                </Text>
            </CardHeader>
            <CardBody
                p={0}
                as={VStack}>
                <Center
                    p={5}
                    flexDir={"column"}
                    w="100%">
                    <Box
                        borderRadius={5}
                        py={5}
                        w="100%"
                        bgColor={displayBG}>
                        <Heading fontSize="5xl" textAlign="center" fontFamily={"Orbitron"} fontStyle={'normal'}>
                            <UnitFormatter number={equipment.electricity} />
                        </Heading>
                    </Box>
                </Center>
                <Flex
                    justify={"space-between"}
                    w="100%"
                    p={3}
                    borderTop="1px solid"
                    borderTopColor={border}>
                    <Text
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        T. Sessions: <Text
                            textTransform={"lowercase"}
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={text}>
                            <NumberFormatter number={equipment.sessions} suffix={""} />
                        </Text>
                    </Text>
                    <Text
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        on time: <Text
                            textTransform={"lowercase"}
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={text}>
                            <MyTooltip label={secFormatter(equipment.ontime)}>
                                {minifiedSecFormatter(equipment.ontime)}
                            </MyTooltip>
                        </Text>
                    </Text>
                    <Text
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        KW: <MyTooltip label={equipment.realtimeKW.change === 0 ? "unchanged load" : `load ${equipment.realtimeKW.change < 0 ? "decreased" : "incresed"} by ${Math.abs(equipment.realtimeKW.change)}%`}>
                            <Text
                                textTransform={"uppercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={equipment.realtimeKW.change === 0 ? text : equipment.realtimeKW.change > 0 ? "red" : "green"}>
                                {equipment.realtimeKW.change === 0 ? null : <Icon as={equipment.realtimeKW.change > 0 ? BsArrowUpShort : BsArrowDownShort} />}
                                <NumberFormatter number={equipment.realtimeKW.current} suffix={"KW"} />
                            </Text>
                        </MyTooltip>
                    </Text>
                </Flex>
            </CardBody>
            <CardFooter
                borderTop={`1px solid`}
                borderTopColor={border}
                display="flex"
                justifyContent="flex-end"
                alignItems="center"
                p={2}
                px={4}>
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
                    <MyTooltip label={dayjs.unix(equipment.updated).format("DD-MM-YYYY HH:mm:ss")}>
                        {dayjs.unix(equipment.updated).fromNow()}
                    </MyTooltip>
                </Text>
            </CardFooter>
        </MyCard>
    </Box>
}

export default EquipmentCard
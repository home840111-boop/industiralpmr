import { Tr, Td, useColorMode, HStack, VStack, Text, IconButton, Icon } from '@chakra-ui/react';
import dayjs from "../../../Components/Functions/dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import NumberFormatter from '../../../Components/micro/NumberFormatter';
import UnitFormatter from '../../../Components/micro/UnitFormatter';
import secFormatter from '../../../Components/Functions/formatters/secFormatter';
import minifiedSecFormatter from '../../../Components/Functions/formatters/minifiedSecFormatter';
import { Equipment } from '..';
import { BsArrowDownShort, BsArrowRight, BsArrowUpShort } from 'react-icons/bs';
import MyTooltip from '../../../Components/micro/MyTooltip';
dayjs.extend(relativeTime);

const EquipmentRow = ({
    equipment
}: {
    equipment: Equipment
}) => {
    const { colorMode } = useColorMode();
    const { hoverBG, hoverColor, border, subText, text } = useMemo(() => ({
        hoverBG: `${colorMode}.hoverBG`,
        hoverColor: `${colorMode}.hoverColor`,
        border: `${colorMode}.border`,
        subText: `${colorMode}.subText`,
        text: `${colorMode}.text`,
    }), [colorMode]);

    return <Tr
        fontWeight={600}
        _hover={{
            bg: hoverBG,
            color: hoverColor
        }}
        transition="all 0.2s ease"
        minH="100px"
        p="0 20px">
        <Td
            borderRight={"1px solid"}
            borderColor={border}>
            <HStack gap={3}>
                <VStack alignItems={"flex-start"}>
                    <Text fontWeight={700} fontSize={"lg"}>
                        <Link to={`/equipments/${equipment.id}`}>{equipment.name}</Link>
                    </Text>
                    <Text fontSize={"xs"} fontWeight={700} color={
                        equipment.status === "NA" ? "gray" :
                            equipment.status === "OFF" ? "red" :
                                equipment.isUpToDate !== true ? "cadetblue" :
                                    equipment.status === "ON" ? "green" :
                                        equipment.status === "IDLE" ? "orange" :
                                            undefined
                    }>
                        <MyTooltip label={dayjs.unix(equipment.statusSince).format("DD-MM-YYYY HH:mm:ss")}>
                            {`${minifiedSecFormatter(dayjs().unix() - equipment.statusSince)}${(equipment.isUpToDate === true || equipment.status === "OFF") ? "" : `(${equipment.isUpToDate})`} • ${equipment.status}`}
                        </MyTooltip>
                    </Text>
                </VStack>
            </HStack>
        </Td>
        <Td>
            <VStack alignItems={"flex-start"}>
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
                    ontime: <Text
                        textTransform={"lowercase"}
                        as={"span"}
                        ml={2}
                        fontWeight={"bold"}
                        color={text}>
                        <Text
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
                </Text>
            </VStack>
        </Td>
        <Td>
            <VStack alignItems={"flex-start"}>
                <Text
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"sm"}>
                    electricity: <Text
                        textTransform={"lowercase"}
                        as={"span"}
                        ml={2}
                        fontWeight={"bold"}
                        color={text}>
                        <UnitFormatter number={equipment.electricity} />
                    </Text>
                </Text>
                <Text
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"sm"}>
                    Curr KW: <MyTooltip label={equipment.realtimeKW.change === 0 ? "unchanged speed" : `speed ${equipment.realtimeKW.change > 0 ? "decreased" : "incresed"} by ${Math.abs(equipment.realtimeKW.change)}%`}>
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
            </VStack>
        </Td>
        <Td>
            <IconButton
                to={`/equipments/${equipment.id}`}
                as={Link}
                aria-label='Goto Equipment'
                icon={<BsArrowRight />} />
        </Td>
    </Tr>
}

export default EquipmentRow;
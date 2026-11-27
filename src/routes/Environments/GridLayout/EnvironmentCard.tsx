import { Box, CardBody, CardFooter, CardHeader, Heading, Text, useColorMode, VStack, Icon, SimpleGrid } from '@chakra-ui/react';
import { BiTimeFive } from 'react-icons/bi';
import { Link } from 'react-router-dom';
import { Environment } from '..'
import MyCard from '../../../Components/micro/Card';
import HumidityChart from './HumidityChart';
import TemperatureChart from './TemperatureChart';
import UnitDisplay from '../../../Components/micro/UnitDisplay';
import dayjs from "../../../Components/Functions/dayjs";
import MyTooltip from '../../../Components/micro/MyTooltip';

const EnvironmentCard = ({
    environment
}: {
    environment: Environment
}) => {
    const { colorMode } = useColorMode();
    const { border, text, subText } = {
        border: `${colorMode}.border`,
        text: `${colorMode}.text`,
        subText: `${colorMode}.subText`
    }
    const headingText = "whiteAlpha.900";

    return <Box
        maxW={{
            base: "100%",
            sm: 350
        }}
        as={Link}
        to={`/environments/${environment.id}`}>
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
                bgColor={environment.isOnline ? environment.isUpToDate === true ? "green" : "cadetblue" : "gray"}
                borderBottom={`1px solid`}
                borderBottomColor={border}
                display={"flex"}
                flexDir={"column"}
                justifyContent={"center"}
                py={3}>
                <Heading textAlign={"center"} color={headingText} size={"md"}>{environment.name}</Heading>
                <Text textAlign={"center"} fontSize={"xs"} color={headingText} fontWeight={600}>
                {environment.isUpToDate === true ? "" : environment.isOnline ? `${environment.isUpToDate} - ` : ""}
                {`${environment.isOnline ? "ON" : "NA"}`}
                </Text>
            </CardHeader>
            <CardBody
                p={0}
                as={VStack}>
                <HumidityChart humidity={environment.now.humidity} />
                <TemperatureChart temperature={environment.now.temperature} />
                <SimpleGrid
                    columns={2}
                    w="100%"
                    px={3}
                    borderTop="1px solid"
                    borderTopColor={border}>
                    <VStack alignItems={"flex-start"}>
                        <Text textDecor="underline" my={2} w="100%" fontSize="sm" textAlign="center" fontWeight={"semibold"} color={text}>Humidity</Text>
                        <Text
                            textTransform={"uppercase"}
                            color={subText}
                            fontSize={"sm"}>
                            avg: <Text
                                textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={text}>
                                {environment.today.humidity.avg.toFixed(2)}%
                            </Text>
                        </Text>
                        <Text
                            textTransform={"uppercase"}
                            color={subText}
                            fontSize={"sm"}>
                            max: <Text
                                textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={text}>
                                {environment.today.humidity.max.toFixed(2)}%
                            </Text>
                        </Text>
                        <Text
                            textTransform={"uppercase"}
                            color={subText}
                            fontSize={"sm"}>
                            min: <Text
                                textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={text}>
                                {environment.today.humidity.min.toFixed(2)}%
                            </Text>
                        </Text>
                    </VStack>
                    <VStack
                        borderLeft={`1px solid`}
                        borderLeftColor={border}
                        pl={3}
                        alignItems={"flex-start"}>
                        <Text textDecor="underline" my={2} w="100%" fontSize="sm" textAlign="center" fontWeight={"semibold"} color={text}>Temperature</Text>
                        <Text
                            textTransform={"uppercase"}
                            color={subText}
                            fontSize={"sm"}>
                            avg: <Text
                                textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={text}>
                                {environment.today.temperature.avg.toFixed(2)}℃
                            </Text>
                        </Text>
                        <Text
                            textTransform={"uppercase"}
                            color={subText}
                            fontSize={"sm"}>
                            max: <Text
                                textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={text}>
                                {environment.today.temperature.max.toFixed(2)}℃
                            </Text>
                        </Text>
                        <Text
                            textTransform={"uppercase"}
                            color={subText}
                            fontSize={"sm"}>
                            min: <Text
                                textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={text}>
                                {environment.today.temperature.min.toFixed(2)}℃
                            </Text>
                        </Text>
                    </VStack>
                </SimpleGrid>
            </CardBody>
            <CardFooter
                borderTop={`1px solid`}
                borderTopColor={border}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                p={2}
                px={4}>
                <UnitDisplay
                    unit={environment.unit}
                    opacity={0.9}
                    fontSize="xs"
                />
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
                    <MyTooltip label={dayjs.unix(environment.updated).format("DD-MM-YYYY HH:mm:ss")}>
                        {dayjs.unix(environment.updated).fromNow()}
                    </MyTooltip>
                </Text>
            </CardFooter>
        </MyCard>
    </Box>
}

export default EnvironmentCard
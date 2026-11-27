import { Box, CardBody, CardHeader, Flex, Text, useColorMode, Icon } from "@chakra-ui/react";
import MyTooltip from "../../../Components/micro/MyTooltip";
import { Suspense, useMemo } from "react";
import { SmallFill } from "../../../Components/Loaders";
import MyCard from "../../../Components/micro/Card";
import { RiCheckboxBlankCircleLine } from "react-icons/ri";
import dayjs from "../../../Components/Functions/dayjs";
import NotFound from "../../../Components/micro/NotFound";

interface DataProps {
    activities: ActivityProps[] | "NOT_FOUND";
}
interface ActivityProps {
    name: string;
    state: string;
    status: "OK" | "WARNING" | "ERROR";
    title: string;
    unix: number;
}
const FactoryActivies = ({
    activities
}: DataProps) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => {
        return {
            border: `${colorMode}.border`
        }
    }, [colorMode]);
    const isLoading = activities.length === 0;
    const notFound = activities === "NOT_FOUND";
    const myActivities = useMemo(() => {
        if (notFound) return [];
        return activities.map((activity, index) => {
            const { name, state, status, title, unix } = activity;
            const titleText = title.replace("$NAME$", `<b>${name}</b>`).replace("$STATE$", `<b>${state}</b>`);
            const time = dayjs.unix(unix).fromNow();
            const exactTime = dayjs.unix(unix).format("DD MMM, YY HH:mm:ss");
            return <Flex
                key={index}
                px={4}
                py={5}
                borderBottom="1px solid"
                borderColor={border}
                alignItems="center">
                <Icon
                    as={RiCheckboxBlankCircleLine}
                    color={status === "OK" ? "green.500" : status === "WARNING" ? "yellow.500" : "red.500"}
                    mr={4} />
                <Text
                    fontSize="sm"
                    dangerouslySetInnerHTML={{ __html: titleText }} />
                <MyTooltip label={exactTime}>
                    <Text
                        pl="10px"
                        ml="auto"
                        fontSize="sm"
                        color="gray.500">{time}</Text>
                </MyTooltip>
            </Flex>
        });
    }, [activities, border, notFound]);


    return <MyCard
        h="100%"
        minH={"45vh"}
        noPadding>
        <CardHeader
            py={4}
            borderBottom="1px solid"
            borderColor={border}>
            <Text
                fontSize="md"
                fontWeight={500}>Factory Activities</Text>
        </CardHeader>
        <CardBody p={0}>
            {
                notFound ? <Suspense fallback={<SmallFill />}>
                    <NotFound />
                </Suspense> : isLoading ? <SmallFill /> : <Box
                    overflowY="auto"
                    overflowX="hidden"
                    p={4}
                    pb={0}
                    pt={0}
                    maxH="55vh"
                >{
                        myActivities
                    }</Box>
            }
        </CardBody>
    </MyCard>
}

export default FactoryActivies;
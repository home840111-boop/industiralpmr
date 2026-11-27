import { CardBody, CardHeader, Center, Flex, IconButton, Skeleton, Text, useColorMode, Icon } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { EnvironmentData } from ".."
import MyCard from "../../../../Components/micro/Card";
import NotFound from "../../../../Components/micro/NotFound";
import { FaChevronLeft, FaChevronRight, FaThermometerHalf } from "react-icons/fa";
import Temperature from "./Temperature";
import { BsFillDropletFill } from "react-icons/bs";
import Humidity from "./Humidity";

const Last7Days = ({
    data,
    notFound
}: {
    data: EnvironmentData["last7Days"],
    notFound: boolean
}) => {
    const [show, setShow] = useState<"temp" | "humid">("temp");
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`,
    }), [colorMode]);

    return <MyCard p={0} h="100%">
        <CardHeader
            py={4}
            borderBottom="1px solid"
            borderColor={border}>
            <Text
                fontSize="md"
                fontWeight={500}>Last 7 Days</Text>
        </CardHeader>
        <CardBody h="100%">
            <Flex mb={10} w="100%" px={5} justifyContent="space-between" alignItems="center">
                <IconButton isDisabled={show === "temp"} onClick={() => setShow("temp")} aria-label="left" icon={<FaChevronLeft />} variant={"ghost"} />
                <Text fontWeight={600} fontSize="lg" alignItems="center" display="flex" gap={1}>
                    <Icon as={show === "temp" ? FaThermometerHalf : BsFillDropletFill} />
                    {show === "temp" ? "Temperature" : "Humidity"}
                </Text>
                <IconButton isDisabled={show === "humid"} onClick={() => setShow("humid")} aria-label="right" icon={<FaChevronRight />} variant={"ghost"} />
            </Flex>
            {
                notFound ?
                    <Center h="100%">
                        <NotFound />
                    </Center>
                    : Object.keys(data || {}).length === 0 ?
                        Array(7).fill(0).map((_, i) => <LoadingCard key={i} />)
                        : Object.entries(data || {}).reverse().map(([date, data]) => show === "temp" ? <Temperature key={date} date={date} temperature={data.temperature} /> : <Humidity key={date} date={date} humidity={data.humidity} />)
            }
        </CardBody>
    </MyCard>
}

const LoadingCard = () => {
    const { colorMode } = useColorMode();
    const { BG } = useMemo(() => ({
        BG: `${colorMode}.bg`
    }), [colorMode]);


    return <Flex _first={{
        mt: 0
    }} my={3} px={2} py={5} alignItems={"center"} bgColor={BG} justifyContent={"space-between"} borderRadius="md">
        <Skeleton h="35px" w="20%" />
        <Skeleton h="20px" w="30%" />
    </Flex>
}

export default Last7Days
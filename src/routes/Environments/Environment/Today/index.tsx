import { Flex } from "@chakra-ui/react";
import { EnvironmentData } from "..";
import Humidity from "./Humidity";
import Temperature from "./Temperature";

const Today = ({
    data
}: {
    data: EnvironmentData | null
}) => {

    return <Flex flexDir={"column"} gap={5}>
        <Temperature data={data} />
        <Humidity data={data} />
    </Flex>
}

export default Today
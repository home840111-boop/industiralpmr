import { Box, Text, useColorMode, VStack } from "@chakra-ui/react";
import NumberFormatter from "../../../../Components/micro/NumberFormatter";


const MeterBox = ({
    heading,
    value,
    suffix
}: {
    heading: string,
    value: number,
    suffix: string
}) => {
    const { colorMode } = useColorMode();
    const { displayBG } = {
        displayBG: colorMode === "light" ? "gray.200" : "whiteAlpha.200"
    }

    return <VStack w="100%" alignItems={"center"} h="100%">
        <Text fontSize="xs" fontWeight={500}>{heading}</Text>
        <Box
            borderRadius={5}
            py={1}
            w="100%"
            bgColor={displayBG}>
            <Text textAlign="center" fontFamily={"Orbitron"} fontStyle={'normal'} fontSize="2xl" fontWeight={600}><NumberFormatter number={value || 0} suffix={suffix} sideSize="extra-small" /></Text>
        </Box>
    </VStack>
};

export default MeterBox;
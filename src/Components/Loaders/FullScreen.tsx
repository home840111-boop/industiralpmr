import { Box, Spinner, useColorMode } from "@chakra-ui/react";
import { useMemo } from "react";

const FullScreen = () => {
    const {colorMode} = useColorMode();
    const { bgColor, color } = useMemo(() => {
        return {
            bgColor: `${colorMode}.bg`,
            color: `primary`
        }
    }, [colorMode]);
    return <Box
        position="fixed"
        top={0}
        left={0}
        width="100vw"
        height="100vh"
        display="flex"
        justifyContent="center"
        alignItems="center"
        bgColor={bgColor}
        color={color}
        zIndex={9}>
        <Spinner
            color={color}
            size="xl" />
    </Box>
}

export default FullScreen
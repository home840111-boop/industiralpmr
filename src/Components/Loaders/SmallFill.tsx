import { Box, BoxProps, Spinner } from "@chakra-ui/react";

const SmallFill = ({
    ...props
}: BoxProps) => {
    return <Box
        {...props}
        width="100%"
        height="100%"
        display="flex"
        justifyContent="center"
        alignItems="center"
        zIndex={9}>
        <Spinner
            color={"primary"}
            size="xl" />
    </Box>
}

export default SmallFill
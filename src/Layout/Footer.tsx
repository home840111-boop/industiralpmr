import { Box, Text } from '@chakra-ui/react'
import MyCard from '../Components/micro/Card'

const Footer = () => {
    return <Box
        mt="100px"
        borderRadius={"none"}
        boxShadow="md"
        px={10}
        py={4}
        display="flex"
        flexDir={{
            base: "column",
            md: "row"
        }}
        textAlign={{
            base: "center",
            md: "left"
        }}
        justifyContent="space-between"
        alignItems="center"
        noPadding
        as={MyCard}>
        <Text
            opacity={0.9}
            fontSize="xs">
            {`© ${new Date().getFullYear()} - All rights reserved.`}
        </Text>
        <Text
            opacity={0.9}
            fontSize="xs">
            Designed and developed by KunjiSoft Technologies.
        </Text>
    </Box>
}

export default Footer
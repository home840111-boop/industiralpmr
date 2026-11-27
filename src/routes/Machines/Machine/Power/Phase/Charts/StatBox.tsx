import { Box, Text, useColorMode } from "@chakra-ui/react"

const StatBox = ({
  title,
  value
}: {
  title: string,
  value: string
}) => {
  const { colorMode } = useColorMode();
  const { displayBG } = {
      displayBG: colorMode === "light" ? "gray.200" : "whiteAlpha.200"
  }

  return <Box textAlign="center" borderRadius="sm" bgColor={displayBG} p={2} w="100%">
    <Text fontSize="sm" fontWeight={500} opacity={0.9}>{title}</Text>
    <Text fontSize="md" fontWeight={600}>{value}</Text>
  </Box>
}

export default StatBox
import { Box, CardBody, CardFooter, CardHeader, Center, SimpleGrid, Skeleton, SkeletonCircle, useColorMode, VStack } from "@chakra-ui/react"
import { useMemo } from "react";
import MyCard from "../../../Components/micro/Card"

const LoadingCard = () => {
  const { colorMode } = useColorMode();
  const { border } = useMemo(() => ({
    border: `${colorMode}.border`
  }), [colorMode]);

  return <MyCard p={0} h="100%" display="flex" flexDir="column" overflow="hidden">
    <CardHeader
      h="70px"
      flexShrink={0}
      borderTopRadius={"md"}
      borderBottom={`1px solid`}
      borderBottomColor={border}
      display={"flex"}
      flexDir={"column"}
      justifyContent={"center"}
      py={3}>
      <VStack gap={1} w="100%">
        <Skeleton h="20px" w="50%" />
        <Skeleton h="10px" w="30%" />
      </VStack>
    </CardHeader>
    <CardBody
      p={0}
      display="flex"
      flexDir="column"
      flex={1}
      justifyContent="space-between">
      <Center flexDir={"column"} py={4} flex={1}>
        <SkeletonCircle size={"180px"} />
        <Skeleton h="10px" w="40%" mt={3} px={2} />
      </Center>
      <Box w="100%" flexShrink={0}>
        <Box w="100%" h="36px" borderTop="1px solid" borderColor={border} px={3} display="flex" alignItems="center">
          <Skeleton h="14px" w="100%" />
        </Box>
        <Box w="100%" h="36px" borderTop="1px solid" borderColor={border} px={3} display="flex" alignItems="center">
          <Skeleton h="14px" w="100%" />
        </Box>
        <SimpleGrid columns={2} w="100%" h="36px" borderTop="1px solid" borderColor={border}>
          <Box borderRight="1px solid" borderColor={border} px={3} display="flex" alignItems="center">
            <Skeleton h="14px" w="80%" />
          </Box>
          <Box px={3} display="flex" alignItems="center">
            <Skeleton h="14px" w="80%" />
          </Box>
        </SimpleGrid>
        <Box w="100%" h="36px" borderTop="1px solid" borderColor={border} px={3} display="flex" alignItems="center" justifyContent="center">
          <Skeleton h="14px" w="60%" />
        </Box>
      </Box>
    </CardBody>
    <CardFooter
      mt="auto"
      flexShrink={0}
      borderTop={`1px solid`}
      borderTopColor={border}
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      p={2}
      px={4}>
      <Skeleton h="10px" w="30%" />
      <Skeleton h="10px" w="30%" />
    </CardFooter>
  </MyCard>
}

export default LoadingCard
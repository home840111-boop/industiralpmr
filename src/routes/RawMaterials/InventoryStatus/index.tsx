import { Box, CardBody, CircularProgress, CircularProgressLabel, Divider, Heading, HStack, Text, Icon, VStack, Link as ChakraLink, CardHeader, useColorMode } from "@chakra-ui/react"
import { useMemo } from "react"
import { BsArrowRightShort } from "react-icons/bs"
import { Link } from "react-router-dom"
import MyCard from "../../../Components/micro/Card"
import NumberFormatter from "../../../Components/micro/NumberFormatter"
import WeightFormatter from "../../../Components/micro/WeightFormatter"

const InventoryStatus = ({
    loading,
    available,
    materials,
    consumed
}: {
    loading: boolean,
    available: number,
    materials: number,
    consumed: number
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);

    return <MyCard pt={0} minH="200px">
        <CardHeader
            w="98%"
            p={0}
            pt={1}
            display={"flex"}
            justifyContent={"flex-end"}
            pos="absolute">
            <ChakraLink
                to={"/raw-materials/manage"}
                as={Link}
                cursor={"pointer"}
                transition="all ease 0.2s"
                _hover={{
                    opacity: 1
                }}
                textTransform="lowercase"
                opacity={0.8}
                fontSize='sm'
                fontWeight={500}
                display="flex"
                alignItems={"center"}>Manage
                <Icon fontSize="xl" as={BsArrowRightShort} />
            </ChakraLink>
        </CardHeader>
        <CardBody>
            <HStack flexDir={{
                base: "column",
                md: "row"
            }} h="100%" gap={5} divider={<Divider orientation={"vertical"} />}>
                <VStack w="100%" alignItems={"flex-start"} gap={7} justifyContent="space-between" h="100%">
                    <Box>
                        <Text fontWeight={600} fontSize="md">Available Quantity</Text>
                        <Text fontWeight={500} fontSize="sm" opacity={0.7}>Total inventory</Text>
                    </Box>
                    <HStack w="100%" alignItems="flex-end">
                        <Heading fontWeight={700}>
                            <WeightFormatter number={available * 1000} />
                        </Heading>
                        <Text fontSize="xs" fontWeight={500} opacity={0.7}> Available</Text>
                    </HStack>
                </VStack>
                <VStack w="100%" alignItems={"flex-start"} gap={7} justifyContent="space-between" h="100%" p={{
                    base: 5,
                    md: undefined
                }} borderY={{
                    base: "1px solid",
                    md: "none"
                }} borderColor={border}>
                    <Box>
                        <Text fontWeight={600} fontSize="md">Total Materials</Text>
                        <Text fontWeight={500} fontSize="sm" opacity={0.7}>Total inventory</Text>
                    </Box>
                    <HStack w="100%" alignItems="flex-end">
                        <Heading fontWeight={700}>
                            <NumberFormatter number={materials} />
                        </Heading>
                        <Text fontSize="xs" fontWeight={500} opacity={0.7}> Materials</Text>
                    </HStack>
                </VStack>
                <CircularProgress
                    mt={2}
                    thickness={"8px"}
                    rounded={"full"}
                    size={"170px"}
                    value={(consumed / available * 100)}
                    color={'orange'}
                    trackColor={"#cccccc40"}
                    capIsRound>
                    <CircularProgressLabel>
                        <Text fontSize="lg" fontWeight={600}>{
                            `${consumed && available ? (consumed / available * 100).toFixed(2) : 0.00}%`
                        }</Text>
                        <Text fontSize="lg" fontWeight={600} opacity={0.7}> Utilized</Text>
                    </CircularProgressLabel>
                </CircularProgress>
            </HStack>
        </CardBody>
    </MyCard>
}

export default InventoryStatus
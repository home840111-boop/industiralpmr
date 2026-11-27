import { Avatar, Box, CardBody, CardHeader, Center, Flex, HStack, Progress, Text, useColorMode, VStack } from "@chakra-ui/react"
import { useMemo } from "react"
import { Link } from "react-router-dom"
import { DataToSet } from "."
import { SmallFill } from "../../Components/Loaders"
import MyCard from "../../Components/micro/Card"
import NotFound from "../../Components/micro/NotFound"

const DepartmentsList = ({
    list
}: {
    list: DataToSet["departmentsList"] | null
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    return <MyCard noPadding>
        <CardHeader p={2} borderBottom="1px solid" borderColor={border}>
            <Text
                fontSize="md"
                fontWeight={500}>Departments Status</Text>
        </CardHeader>
        <CardBody p={0}>
            {list === null ? <Center h="100%">
                <SmallFill />
            </Center> : list.length === 0 ? <Center h="100%">
                <NotFound text="No Departments" />
            </Center> : <Flex flexDir="column" overflow="auto" maxHeight="330px" gap={5}>
                {list.map((depart, i) => <Flex key={i} px={3} pt={3} _last={{
                    pb: 5
                }} _notFirst={{
                    borderTop: "1px solid",
                    borderColor: border
                }} w="100%" justifyContent={"space-between"} alignItems="center">
                    <Flex gap={3}>
                        <Avatar name={depart.name} bg="orange.300" color={"white"} fontSize="sm" />
                        <Box>
                            <Link to={`/departments/${depart.name}`}>
                                <Text fontWeight={600}>{depart.name}</Text>
                            </Link>
                            <Text fontWeight={500} opacity={0.8} fontSize="xs">{depart.supervisor}</Text>
                        </Box>
                    </Flex>
                    <HStack w="150px">
                        <VStack alignItems="flex-start" w="30%">
                            <Text fontSize="xs" opacity="0.8" fontWeight="500">M. ON</Text>
                            <Text fontSize="xs" opacity="0.8" fontWeight="500">E. ON</Text>
                        </VStack>
                        <VStack w="60%" spacing={5}>
                            <Progress
                                w="100%"
                                size="xs"
                                borderRightRadius={'md'}
                                colorScheme="green"
                                value={depart.machineOns.total ? depart.machineOns.on / depart.machineOns.total * 100 : 0}
                            />
                            <Progress
                                w="100%"
                                size="xs"
                                borderRightRadius={'md'}
                                colorScheme="orange"
                                value={depart.equipmentOns.total ? depart.equipmentOns.on / depart.equipmentOns.total * 100 : 0}
                            />
                        </VStack>
                        <VStack w="10%">
                            <Text fontSize="xs" fontWeight="bold">{`${depart.machineOns.on}/${depart.machineOns.total}`}</Text>
                            <Text fontSize="xs" fontWeight="bold">{`${depart.equipmentOns.on}/${depart.equipmentOns.total}`}</Text>
                        </VStack>
                    </HStack>
                </Flex>)}
            </Flex>}
        </CardBody>
    </MyCard>
}

export default DepartmentsList
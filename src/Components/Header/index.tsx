import {
    Box,
    Flex,
    Input,
    Select,
    Text,
    useColorMode,
} from "@chakra-ui/react"
import { useMemo } from "react";
import { HeaderProps, MachineStatusTypes } from "../../routes/Machines/types";
import ViewSelector from "./ViewSelector";

const Header = ({
    options = ["DEPARTMENTS", "STATUS"],
    view,
    setView,
    type,
    setType,
    setDepartment,
    department,
    departments,
    search,
    total,
    viewing,
    viewingName,
    hideLayoutSelector = false,
    extraChildren
}: HeaderProps) => {
    const { colorMode } = useColorMode();
    const { inputBG } = useMemo(() => {
        return {
            inputBG: `${colorMode}.navBG`
        }
    }, [colorMode]);
    if (setDepartment === undefined || departments === undefined) options.splice(options.indexOf("DEPARTMENTS"), 1);
    if (setType === undefined) options.splice(options.indexOf("STATUS"), 1);

    return <>
        <Flex
            flexDir={{
                base: 'column-reverse',
                md: 'row'
            }}
            gap={{
                base: 3,
                md: 0
            }}
            justifyContent="space-between"
            alignItems={'center'}>
            <Flex
                flexDir={{
                    base: 'column',
                    md: 'row'
                }}
                gap={3}>
                <Box>
                    <Text fontSize={"xs"} opacity={0.9}>Search</Text>
                    <Input
                        borderRadius={"md"}
                        bgColor={inputBG}
                        boxShadow="sm"
                        _focus={{
                            borderColor: "primary",
                            boxShadow: "none"
                        }}
                        variant="outline"
                        placeholder={`Search ${viewingName} ...`}
                        size='sm'
                        minW="250px"
                        onChange={(e) => search(e.target.value)}
                    />
                </Box>
                <Flex gap={3}>
                    {options.includes("DEPARTMENTS") && setDepartment && departments && <Box>
                        <Text fontSize={"xs"} opacity={0.9}>Department</Text>
                        <Select
                            bgColor={inputBG}
                            _focus={{
                                borderColor: "primary",
                                boxShadow: "none"
                            }}
                            borderRadius={"md"}
                            minW="150px"
                            boxShadow="sm"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            size="sm">
                            <option value="ALL">All</option>
                            {Object.keys(departments).map((department) => <option key={department} value={department}>{department}</option>)}
                        </Select>
                    </Box>}
                    {options.includes("STATUS") && setType && <Box>
                        <Text fontSize={"xs"} opacity={0.9}>Status</Text>
                        <Select
                            bgColor={inputBG}
                            _focus={{
                                borderColor: "primary",
                                boxShadow: "none"
                            }}
                            borderRadius={"md"}
                            minW="150px"
                            boxShadow="sm"
                            value={type}
                            onChange={(e) => setType(e.target.value as MachineStatusTypes)}
                            size="sm">
                            <option value="ALL">All</option>
                            <option value="ON">On</option>
                            <option value="OFF">Off</option>
                            <option value="IDLE">Idle</option>
                            <option value="NA">Offline</option>
                        </Select>
                    </Box>}
                    {extraChildren}
                </Flex>
            </Flex>
            {!hideLayoutSelector && <ViewSelector view={view} setView={setView} />}
        </Flex>
        <Text mt={'40px'} fontSize={"xs"} opacity={0.9}> Viewing {viewing} of {total} {viewingName}</Text>
    </>
}

export default Header
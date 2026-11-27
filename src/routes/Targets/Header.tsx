import {
    Box,
    Button,
    ButtonGroup,
    Flex,
    HStack,
    Icon,
    Input,
    InputGroup,
    InputLeftElement,
    InputRightElement,
    Select,
    Tag,
    TagLabel,
    useColorMode,
    IconButton,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import ViewSelector from "../../Components/Header/ViewSelector";
import { HeaderProps, MachineStatusTypes } from "../../routes/Machines/types";
import { useIsSapEnabled } from "../../Services/sap";

interface HeaderPropsNow extends HeaderProps {
    setShowOnlyWithTargets?: (val: boolean) => void;
    showOnlyWithTargets?: boolean;
    targetFilter?: "ALL" | "ACTIVE" | "SAP";
    setTargetFilter?: (filter: "ALL" | "ACTIVE" | "SAP") => void;
}

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
    showOnlyWithTargets,
    setShowOnlyWithTargets,
    targetFilter,
    setTargetFilter,
    hideLayoutSelector = false,
}: HeaderPropsNow) => {
    const isSapEnabled = useIsSapEnabled();
    const { colorMode } = useColorMode();
    const isDark = colorMode === "dark";
    const [searchValue, setSearchValue] = useState<string>("");

    const effectiveFilter: "ALL" | "ACTIVE" | "SAP" =
        targetFilter || (showOnlyWithTargets ? "ACTIVE" : "ALL");

    const { inputBG, borderColor } = useMemo(() => {
        return {
            inputBG: `${colorMode}.navBG`,
            borderColor: isDark ? "whiteAlpha.200" : "gray.200",
        };
    }, [colorMode, isDark]);

    const activeOptions = useMemo(() => {
        let opts = [...options];
        if (setDepartment === undefined || departments === undefined) {
            opts = opts.filter((o) => o !== "DEPARTMENTS");
        }
        if (setType === undefined) {
            opts = opts.filter((o) => o !== "STATUS");
        }
        return opts;
    }, [options, setDepartment, departments, setType]);

    const handleSearchChange = (val: string) => {
        setSearchValue(val);
        search(val);
    };

    const handleClearSearch = () => {
        setSearchValue("");
        search("");
    };

    const handleTargetFilterChange = (filter: "ALL" | "ACTIVE" | "SAP") => {
        if (setTargetFilter) {
            setTargetFilter(filter);
        }
        if (setShowOnlyWithTargets) {
            setShowOnlyWithTargets(filter === "ACTIVE" || filter === "SAP");
        }
        localStorage.setItem("targetsFilter", filter);
    };

    return (
        <Box w="100%" mb={2}>
            <Flex
                w="100%"
                flexDir={{
                    base: "column",
                    md: "row",
                }}
                gap={2}
                justifyContent="space-between"
                alignItems={{ base: "stretch", md: "center" }}
                flexWrap="wrap"
            >
                {/* Search and Filters Inline Group */}
                <Flex
                    gap={2}
                    alignItems="center"
                    flexWrap="wrap"
                    flex={1}
                >
                    {/* Compact Search Input */}
                    <Box minW={{ base: "100%", sm: "220px" }} maxW={{ md: "260px" }}>
                        <InputGroup size="xs">
                            <InputLeftElement pointerEvents="none" h="28px">
                                <Icon as={FiSearch} color="gray.400" />
                            </InputLeftElement>
                            <Input
                                h="28px"
                                borderRadius="md"
                                bgColor={inputBG}
                                borderColor={borderColor}
                                fontSize="xs"
                                _focus={{
                                    borderColor: "primary",
                                    boxShadow: "0 0 0 1px var(--chakra-colors-primary)",
                                }}
                                variant="outline"
                                placeholder={`Search ${viewingName}...`}
                                value={searchValue}
                                onChange={(e) => handleSearchChange(e.target.value)}
                            />
                            {searchValue && (
                                <InputRightElement h="28px">
                                    <IconButton
                                        aria-label="Clear search"
                                        icon={<Icon as={FiX} />}
                                        size="xs"
                                        variant="ghost"
                                        h="20px"
                                        minW="20px"
                                        onClick={handleClearSearch}
                                    />
                                </InputRightElement>
                            )}
                        </InputGroup>
                    </Box>

                    {/* Department Filter */}
                    {activeOptions.includes("DEPARTMENTS") && setDepartment && departments && (
                        <Select
                            w="auto"
                            minW="120px"
                            h="28px"
                            bgColor={inputBG}
                            borderColor={borderColor}
                            _focus={{
                                borderColor: "primary",
                                boxShadow: "0 0 0 1px var(--chakra-colors-primary)",
                            }}
                            borderRadius="md"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            size="xs"
                            fontSize="xs"
                        >
                            <option value="ALL">All Departments</option>
                            {Object.keys(departments).map((dept) => (
                                <option key={dept} value={dept}>
                                    {dept}
                                </option>
                            ))}
                        </Select>
                    )}

                    {/* Status Filter */}
                    {activeOptions.includes("STATUS") && setType && (
                        <Select
                            w="auto"
                            minW="110px"
                            h="28px"
                            bgColor={inputBG}
                            borderColor={borderColor}
                            _focus={{
                                borderColor: "primary",
                                boxShadow: "0 0 0 1px var(--chakra-colors-primary)",
                            }}
                            borderRadius="md"
                            value={type}
                            onChange={(e) => setType(e.target.value as MachineStatusTypes)}
                            size="xs"
                            fontSize="xs"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="ON">● On</option>
                            <option value="OFF">● Off</option>
                            <option value="IDLE">● Idle</option>
                            <option value="NA">● Offline</option>
                        </Select>
                    )}

                    {/* Target Filter Segmented Buttons */}
                    <ButtonGroup size="xs" isAttached variant="outline">
                        <Button
                            h="28px"
                            fontSize="2xs"
                            colorScheme={effectiveFilter === "ALL" ? "orange" : "gray"}
                            variant={effectiveFilter === "ALL" ? "solid" : "outline"}
                            onClick={() => handleTargetFilterChange("ALL")}
                            fontWeight={600}
                            px={2.5}
                        >
                            All
                        </Button>
                        <Button
                            h="28px"
                            fontSize="2xs"
                            colorScheme={effectiveFilter === "ACTIVE" ? "orange" : "gray"}
                            variant={effectiveFilter === "ACTIVE" ? "solid" : "outline"}
                            onClick={() => handleTargetFilterChange("ACTIVE")}
                            fontWeight={600}
                            px={2.5}
                        >
                            Active Targets
                        </Button>
                        {isSapEnabled && (
                            <Button
                                h="28px"
                                fontSize="2xs"
                                colorScheme={effectiveFilter === "SAP" ? "blue" : "gray"}
                                variant={effectiveFilter === "SAP" ? "solid" : "outline"}
                                onClick={() => handleTargetFilterChange("SAP")}
                                fontWeight={600}
                                px={2.5}
                            >
                                SAP Orders
                            </Button>
                        )}
                    </ButtonGroup>
                </Flex>

                {/* Right side: Compact counts & View selector */}
                <HStack gap={2} justifyContent="flex-end" alignItems="center">
                    <Tag size="sm" variant="subtle" colorScheme="gray" borderRadius="md" py={0.5} px={2}>
                        <TagLabel fontSize="2xs" fontWeight={600}>
                            {viewing} / {total} {viewingName}s
                        </TagLabel>
                    </Tag>
                    {effectiveFilter === "ACTIVE" && (
                        <Tag size="sm" colorScheme="orange" variant="solid" borderRadius="full" py={0.5} px={2}>
                            <TagLabel fontSize="2xs">Active Only</TagLabel>
                        </Tag>
                    )}
                    {effectiveFilter === "SAP" && (
                        <Tag size="sm" colorScheme="blue" variant="solid" borderRadius="full" py={0.5} px={2}>
                            <TagLabel fontSize="2xs">SAP Only</TagLabel>
                        </Tag>
                    )}
                    {!hideLayoutSelector && <ViewSelector view={view} setView={setView} />}
                </HStack>
            </Flex>
        </Box>
    );
};

export default Header;
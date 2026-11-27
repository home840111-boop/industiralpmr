import { Box, Button, HStack, Input, InputGroup, InputLeftElement, Text, VStack, Icon, useColorMode, Stack, Popover, PopoverTrigger, PopoverContent, PopoverBody, useDisclosure } from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react";
import { IconType } from "react-icons";
import { BiSearch, BiSort } from "react-icons/bi"
import { BsFilterLeft } from "react-icons/bs"
import { IoIosOptions } from "react-icons/io";
import { RiArrowRightSLine } from "react-icons/ri";
import { SearchOptions } from ".";
import MyPopover from "../../../../Components/micro/MyPopover";

const FilterOptions = ({
    setSearchOptions
}: {
    setSearchOptions: (options: SearchOptions) => void
}) => {
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<"Ascending" | "Descending">("Ascending");
    const [option, setOption] = useState<"Name" | "Consumed" | "Remaining" | "Updated" | "Last Used">("Name");

    useEffect(() => {
        setSearchOptions({
            search,
            sort,
            option
        });
        // eslint-disable-next-line
    }, [search, sort, option]);

    const clear = () => {
        setSearch("");
        setSort("Ascending");
        setOption("Name");
    }

    return <HStack alignItems="flex-end" gap={3} id="filter-options">
        <MyPopover>
            <Button variant="outline" size="sm" leftIcon={<BsFilterLeft />} fontWeight="medium" pr={4}>Filter</Button>
            <Box px={1}>
                <HStack justifyContent={"space-between"} w="100%">
                    <Text fontSize="sm" fontWeight={600}>Filter Options</Text>
                    <Text fontSize="sm" color="primary" fontWeight={500}
                        onClick={clear}
                        _hover={{
                            cursor: "pointer",
                            color: "orange.400"
                        }}>Clear</Text>
                </HStack>
                <VStack mt={2} spacing={4}>
                    <InputGroup>
                        <InputLeftElement pointerEvents='none'>
                            <BiSearch />
                        </InputLeftElement>
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            focusBorderColor={"primary"}
                            placeholder="Search by name"
                            variant={"filled"}
                            maxW="250px"
                        />
                    </InputGroup>
                    <OptionSelect
                        onChange={setOption}
                        icon={IoIosOptions}
                        text={"Option"}
                        selected={option}
                        options={[
                            "Name",
                            "Department",
                            "Consumed",
                            "Remaining",
                            "Updated",
                            "Last Used"
                        ]} />
                    <OptionSelect
                        onChange={setSort}
                        icon={BiSort}
                        text={"Sort by"}
                        selected={sort}
                        options={["Ascending", "Descending"]} />
                </VStack>
            </Box>
        </MyPopover>
    </HStack>
}

const OptionSelect = ({
    text,
    selected,
    options,
    icon,
    onChange
}: {
    text: string,
    selected: string,
    options: string[],
    icon: IconType,
    onChange: (option: any) => void
}) => {
    const { onClose, onOpen, isOpen } = useDisclosure();
    const { colorMode } = useColorMode();
    const { hoverBgColor, hoverColor, popoverContentBgColor } = useMemo(() => {
        return {
            hoverBgColor: `${colorMode}.accountHoverBG`,
            hoverColor: `${colorMode}.popOverHoverColor`,
            popoverContentBgColor: `${colorMode}.popoverContentBgColor`,
        }
    }, [colorMode]);

    return <Popover
        isOpen={isOpen}
        onOpen={onOpen}
        onClose={onClose}>
        <PopoverTrigger>
            <HStack
                transition="all 0.3s"
                _hover={{
                    cursor: "pointer",
                    bgColor: hoverBgColor,
                    pr: 3
                }}
                borderRadius="5px"
                p={2}
                w="100%"
                justifyContent={"space-between"}>
                <HStack>
                    <Icon as={icon} fontSize="lg" />
                    <Text fontSize="sm" fontWeight={500}>{text}</Text>
                </HStack>
                <HStack>
                    <Text fontSize="sm" fontWeight={500} opacity={0.8}>{selected}</Text>
                    <Icon as={RiArrowRightSLine} opacity={0.8} style={{
                        marginLeft: "0px"
                    }} />
                </HStack>
            </HStack>
        </PopoverTrigger>
        <PopoverContent
            border={0}
            boxShadow={'xl'}
            bg={popoverContentBgColor}
            rounded={'md'}
            maxW={'max-content'}>
            <PopoverBody>
                <Box px={1}>
                    {options.map((item) => <Stack key={item}>
                        <Text
                            onClick={() => {
                                onClose();
                                onChange(item);
                            }}
                            cursor="pointer"
                            _hover={{
                                bg: hoverColor,
                                color: "orange.400"
                            }}
                            p={1}
                            textTransform={"capitalize"}
                            rounded={'md'}
                            fontSize="xs"
                            fontWeight="medium"
                            letterSpacing={"wider"}>{item}</Text>
                    </Stack>
                    )}
                </Box>
            </PopoverBody>
        </PopoverContent>
    </Popover>
}

export { OptionSelect };
export default FilterOptions;
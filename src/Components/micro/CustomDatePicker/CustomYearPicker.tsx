import { Box, Button, Center, HStack, SimpleGrid, Stack, Text, useColorMode, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { HiOutlineCalendar } from "react-icons/hi";
import MyPopover from "../MyPopover";
import dayjs from "../../Functions/dayjs";
import { SmallCloseIcon } from "@chakra-ui/icons";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

type presetType = "This Year" | "Last Year" | "This Decade";
const preset: presetType[] = ["This Year", "Last Year", "This Decade"];
interface CustomDatePickerType {
    set: (date: {
        from?: string,
        to?: string
    } | undefined) => void,
};
const CustomYearPicker = ({
    set
}: CustomDatePickerType) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const [date, setDate] = useState<{
        from: string,
        to: string
    }>({
        from: dayjs().format("YYYY"),
        to: dayjs().format("YYYY")
    });
    const [selected, setSelected] = useState<presetType | undefined>(undefined);
    const selectedTitle = useMemo(() => {
        if (date === undefined) return "None";
        if (date.from === date.to) return date.from;
        return `${date.from} - ${date.to}`;
    }, [date]);


    const selectYear = (_date: {
        from: string,
        to: string
    }, fromPreset: boolean = false) => {
        setDate(_date);
        set(_date);
        if (!fromPreset) setSelected(undefined);
    }

    const selectPresets = (preset: presetType) => {
        setSelected(preset);
        switch (preset) {
            case "This Year":
                selectYear({
                    from: dayjs().format("YYYY"),
                    to: dayjs().format("YYYY")
                }, true);
                break;
            case "Last Year":
                selectYear({
                    from: dayjs().subtract(1, "year").format("YYYY"),
                    to: dayjs().subtract(1, "year").format("YYYY"),
                }, true);
                break;
            case "This Decade":
                const decade = dayjs().year().toString().slice(0, 3);
                selectYear({
                    from: `${decade}1`,
                    to: `${+decade + 1}0`
                }, true);
                break;
        }
    }

    // eslint-disable-next-line
    useEffect(() => selectPresets("This Year"), []);

    return <MyPopover placement={"bottom"}>
        <Button rightIcon={<HiOutlineCalendar />} minW="-webkit-fill-available" display={"flex"} justifyContent="space-between" alignItems="center" size="sm" variant="outline" borderWidth={"2px"} fontWeight={500}>{
            selected ? `${selected}: ${selectedTitle}` : selectedTitle
        }</Button>
        <VStack w="100%" alignItems={"flex-start"}>
            <Stack flexDir={{
                base: "column",
                md: "row"
            }} w="100%" alignItems={"flex-start"}>
                <VStack w="100%" alignItems={"flex-start"} pr={5} pt={5}>
                    {
                        preset.map((item, index) => {
                            return <Button
                                isActive={selected === item}
                                onClick={() => selectPresets(item)}
                                justifyContent={"flex-start"} w="100%" colorScheme={"orange"} variant="ghost" size="sm" key={index}>{item}</Button>
                        })
                    }
                </VStack>
                <Button
                    left={{
                        base: "10px",
                        md: "20px"
                    }}
                    bottom={{
                        base: "35px",
                        md: "50px"
                    }}
                    pos="absolute"
                    onClick={() => selectPresets("This Year")} rightIcon={<SmallCloseIcon />} justifyContent={"flex-start"} colorScheme={"red"} variant="outline" size="xs">Reset</Button>
                <Box
                    px={5}
                    py={2}
                    m={0}
                    maxW="90vw"
                    borderTop={{
                        base: "1px solid",
                        md: "none"
                    }}
                    borderTopColor={{
                        base: border,
                        md: "none"
                    }}
                    borderLeft={{
                        base: "none",
                        md: "1px solid"
                    }}
                    borderLeftColor={{
                        base: "none",
                        md: border
                    }}>
                    <YearPicker
                        value={date}
                        setValue={selectYear} />
                </Box>
            </Stack>
            <Text className="rdp-selected-text" fontSize="sm" opacity={0.8}>You Selected:<strong> {selectedTitle}</strong></Text>
        </VStack>
    </MyPopover>
}

const years = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const YearPicker = ({
    value,
    setValue
}: {
    value: {
        from: string,
        to: string
    },
    setValue: (date: {
        from: string,
        to: string
    }) => void
}) => {
    const [decade, setDecade] = useState<number>(+(dayjs().year().toString().slice(0, 3) + "0"));
    const addDecade = () => setDecade(decade => decade + 10);
    const minusDecade = () => setDecade(decade => decade - 10);
    const [selected, setSelected] = useState<{
        from: string,
        to: string
    } | undefined>(undefined);

    const yearSelect = (_year: number) => {
        // if _year is less than both from and to, then dureation: _year - to
        // if _year is greater than both from and to, then duration: from - _year
        // if _year is between from and to, then duration: from - _year
        // if _year is equal to from or to, then duration: _year - _year
        if (selected === undefined) return;
        const yearInFrom = dayjs(selected.from).year();
        const yearInTo = dayjs(selected.to).year();
        if (_year < yearInFrom && _year < yearInTo) {
            // _year is less than both from and to
            setSelected({
                from: _year.toString(),
                to: selected.to
            });
        } else if (_year > yearInFrom && _year > yearInTo) {
            // _year is greater than both from and to
            setSelected({
                from: selected.from,
                to: _year.toString()
            });
        } else if (_year > yearInFrom && _year < yearInTo) {
            // _year is between from and to
            setSelected({
                from: selected.from,
                to: _year.toString()
            });
        } else if (_year === yearInFrom || _year === yearInTo) {
            // _year is equal to from or to
            setSelected({
                from: _year.toString(),
                to: _year.toString()
            });
        }
    }

    useEffect(() => {
        if (selected === undefined) return;
        if (selected.from === value.from && selected.to === value.to) return;
        setValue(selected);
        // eslint-disable-next-line
    }, [selected]);

    useEffect(() => {
        setSelected(value);
    }, [value]);

    useEffect(() => {
        const year = dayjs().year();
        if (decade === +(dayjs().year().toString().slice(0, 3) + "0")) setSelected({
            from: String(year),
            to: String(year)
        });
        else setSelected({
            from: String(decade + 1),
            to: String(decade + 1)
        })
    }, [decade]);

    return <VStack w="250px">
        <HStack w="100%" alignItems={"center"} justifyContent="space-between">
            <Center
                h="25px"
                w="25px"
                border="1.5px solid"
                borderRadius={"5px"}
                opacity={.5}
                _hover={{
                    cursor: "pointer",
                    borderColor: "primary",
                    backgroundColor: "#dd6c2020",
                    color: "primary",
                    opacity: 1
                }}
                onClick={minusDecade}
                transition="all .2s ease-in-out">
                <IoIosArrowBack />
            </Center>
            <Text px={5} fontSize="18px" fontWeight={500} opacity={.9} userSelect="none">{decade}s</Text>
            <Center
                h="25px"
                w="25px"
                border="1.5px solid"
                borderRadius={"5px"}
                opacity={.5}
                _hover={{
                    cursor: "pointer",
                    borderColor: "primary",
                    backgroundColor: "#dd6c2020",
                    color: "primary",
                    opacity: 1
                }}
                onClick={addDecade}
                transition="all .2s ease-in-out">
                <IoIosArrowForward />
            </Center>
        </HStack>
        <SimpleGrid w="100%" columns={3}>
            {years.map((item, index) => {
                // isSelected when month is between from and to
                const year = decade + item;
                const yearInFrom = dayjs(value.from).year();
                const yearInTo = dayjs(value.to).year();
                const isSelected = year >= yearInFrom && year <= yearInTo
                const isFrom = year === yearInFrom;
                const isTo = year === yearInTo;
                const border = (isFrom && isTo) ? "5px" : isFrom ? "5px 0 0 5px" : isTo ? "0 5px 5px 0" : "none";
                return <Center
                    key={index}
                    h="50px"
                    onClick={() => yearSelect(year)}
                    // isSelected 
                    borderRadius={border}
                    {
                    ...(isSelected && {
                        backgroundColor: "primary",
                        color: "white",
                    })}
                    _hover={{
                        cursor: "pointer",
                        ...(!isSelected && {
                            color: "primary",
                            borderRadius: "5px",
                            backgroundColor: "#dd6c2020",
                        })
                    }}
                    transition="all .2s ease-in-out">
                    <Text my={3} mx={5} fontSize="md" fontWeight={500} userSelect="none">{year}</Text>
                </Center>
            })}
        </SimpleGrid>
    </VStack >
}

export default CustomYearPicker
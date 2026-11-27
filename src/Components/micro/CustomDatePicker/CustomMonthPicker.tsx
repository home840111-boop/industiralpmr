import { Box, Button, Center, HStack, SimpleGrid, Stack, Text, useColorMode, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { HiOutlineCalendar } from "react-icons/hi";
import MyPopover from "../MyPopover";
import dayjs from "../../Functions/dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import { SmallCloseIcon } from "@chakra-ui/icons";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
dayjs.extend(quarterOfYear);

const months: {
    [key: number]: string
} = {
    1: "Jan",
    2: "Feb",
    3: "Mar",
    4: "Apr",
    5: "May",
    6: "Jun",
    7: "Jul",
    8: "Aug",
    9: "Sep",
    10: "Oct",
    11: "Nov",
    12: "Dec"
};
type presetType = "This Month" | "Last Month" | "This Quarter" | "This Year";
const preset: presetType[] = ["This Month", "Last Month", "This Quarter", "This Year"];
interface CustomDatePickerType {
    set: (date: {
        from?: string,
        to?: string
    } | undefined) => void,
};
const CustomMonthPicker = ({
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
        from: dayjs().format("YYYY-MM"),
        to: dayjs().format("YYYY-MM")
    });
    const [selected, setSelected] = useState<presetType | undefined>(undefined);
    const selectedTitle = useMemo(() => {
        if (date === undefined) return "None";
        if (date.from === date.to) return date.from;
        return `${date.from} - ${date.to}`;
    }, [date]);


    const selectMonth = (_date: {
        from: string,
        to: string
    }, fromPreset: boolean = false) => {
        let newDate, oldDate;
        // find which changed
        if (_date.from !== date.from) {
            newDate = _date.from;
            oldDate = date.from;
        } else {
            newDate = _date.to;
            oldDate = date.to;
        }
        // if newdate has same year as old date, then set it
        if (dayjs(newDate).year() !== dayjs(oldDate).year()) {
            // set both to new date
            _date.from = newDate;
            _date.to = newDate;
            setDate(_date);
            if (!fromPreset) setSelected(undefined);
            return;
        }
        setDate(_date);
        set(_date);
        if (!fromPreset) setSelected(undefined);
    }

    const selectPresets = (preset: presetType) => {
        setSelected(preset);
        switch (preset) {
            case "This Month":
                selectMonth({
                    from: dayjs().format("YYYY-MM"),
                    to: dayjs().format("YYYY-MM")
                }, true);
                break;
            case "Last Month":
                selectMonth({
                    from: dayjs().subtract(1, "month").format("YYYY-MM"),
                    to: dayjs().subtract(1, "month").format("YYYY-MM"),
                }, true);
                break;
            case "This Quarter":
                selectMonth({
                    from: dayjs().startOf("quarter").format("YYYY-MM"),
                    to: dayjs().endOf("quarter").format("YYYY-MM")
                }, true);
                break;
            case "This Year":
                selectMonth({
                    from: dayjs().startOf("year").format("YYYY-MM"),
                    to: dayjs().endOf("year").format("YYYY-MM")
                }, true);
                break;
        }
    }

    // eslint-disable-next-line
    useEffect(() => selectPresets("This Month"), []);

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
                    onClick={() => selectPresets("This Month")} rightIcon={<SmallCloseIcon />} justifyContent={"flex-start"} colorScheme={"red"} variant="outline" size="xs">Reset</Button>
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
                    <MonthPicker
                        value={date}
                        setValue={selectMonth} />
                </Box>
            </Stack>
            <Text className="rdp-selected-text" fontSize="sm" opacity={0.8}>You Selected:<strong> {selectedTitle}</strong></Text>
        </VStack>
    </MyPopover>
}

const MonthPicker = ({
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
    const [year, setYear] = useState<number>(dayjs().year());
    const addYear = () => setYear(year => year + 1);
    const minusYear = () => setYear(year => year - 1);
    const [selected, setSelected] = useState<{
        from: string,
        to: string
    } | undefined>(undefined);

    const monthSelect = (_month: number) => {
        // if _month is less than both from and to, then dureation: _month - to
        // if _month is greater than both from and to, then duration: from - _month
        // if _month is between from and to, then duration: from - _month
        // if _month is equal to from or to, then duration: _month - _month
        if (selected === undefined) return;
        const monthInFrom = dayjs(selected.from).month() + 1;
        const monthInTo = dayjs(selected.to).month() + 1;
        if (_month < monthInFrom && _month < monthInTo) {
            // _month is less than both from and to
            setSelected({
                from: `${year}-${_month.toString().padStart(2, "0")}`,
                to: selected.to
            });
        } else if (_month > monthInFrom && _month > monthInTo) {
            // _month is greater than both from and to
            setSelected({
                from: selected.from,
                to: `${year}-${_month.toString().padStart(2, "0")}`
            });
        } else if (_month > monthInFrom && _month < monthInTo) {
            // _month is between from and to
            setSelected({
                from: selected.from,
                to: `${year}-${_month.toString().padStart(2, "0")}`
            });
        } else if (_month === monthInFrom || _month === monthInTo) {
            // _month is equal to from or to
            setSelected({
                from: `${year}-${_month.toString().padStart(2, "0")}`,
                to: `${year}-${_month.toString().padStart(2, "0")}`
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
        if (year === dayjs().year()) setSelected({
            from: dayjs().format("YYYY-MM"),
            to: dayjs().format("YYYY-MM")
        });
        else setSelected({
            from: `${year}-01`,
            to: `${year}-01`
        })
    }, [year]);

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
                onClick={minusYear}
                transition="all .2s ease-in-out">
                <IoIosArrowBack />
            </Center>
            <Text px={5} fontSize="18px" fontWeight={500} opacity={.9} userSelect="none">{year}</Text>
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
                onClick={addYear}
                transition="all .2s ease-in-out">
                <IoIosArrowForward />
            </Center>
        </HStack>
        <SimpleGrid w="100%" columns={3}>
            {Object.keys(months).map((item, index) => {
                // isSelected when month is between from and to
                const month = parseInt(item);
                const monthInFrom = dayjs(selected?.from).month() + 1;
                const monthInTo = dayjs(selected?.to).month() + 1;
                const isSelected = month >= monthInFrom && month <= monthInTo
                const isFrom = month === monthInFrom;
                const isTo = month === monthInTo;
                const border = (isFrom && isTo) ? "5px" : isFrom ? "5px 0 0 5px" : isTo ? "0 5px 5px 0" : "none";
                return <Center
                    key={index}
                    h="50px"
                    onClick={() => monthSelect(month)}
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
                    <Text my={3} mx={5} fontSize="md" fontWeight={500} userSelect="none">{months[month]}</Text>
                </Center>
            })}
        </SimpleGrid>
    </VStack >
}

export default CustomMonthPicker
import { Box, Button, Stack, Text, useColorMode, VStack } from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react";
import { HiOutlineCalendar } from "react-icons/hi";
import MyPopover from "../MyPopover";
import { DateRange, DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import dayjs from "../../Functions/dayjs";
import { SmallCloseIcon } from "@chakra-ui/icons";
import "./stylesheet.css";

interface CustomDatePickerType {
    set: (date: DateRange | undefined) => void,
    setOnMount?: presetType,
    singleMonth?: boolean,
    singleDate?: boolean,
    reset?: any
};
type presetType = "Today" | "Yesterday" | "This Week" | "This Month";
const preset: presetType[] = ["Today", "Yesterday", "This Week", "This Month"];
const CustomDatePicker = ({
    set,
    setOnMount,
    singleMonth,
    singleDate,
    reset
}: CustomDatePickerType) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const [date, setDate] = useState<DateRange>({
        from: dayjs().toDate(),
        to: dayjs().add(20, "day").toDate()
    });
    const [month, setMonth] = useState<Date>(dayjs().toDate());
    const [selected, setSelected] = useState<presetType | undefined>(undefined);
    const selectedTitle = useMemo(() => {
        if (date === undefined) return "None";
        if (date.from?.toDateString() === date.to?.toDateString()) return dayjs(date.from).format("DD MMM, YY");
        return `${dayjs(date.from).format("DD MMM, YY")} - ${dayjs(date.to).format("DD MMM, YY")}`;
    }, [date]);

    useEffect(() => {
        if (setOnMount) selectPresets(setOnMount);
        else selectPresets("Today");
        // eslint-disable-next-line
    }, [reset]);

    const selectDate = (_date: DateRange | undefined, fromPreset: boolean = false) => {
        if (_date === undefined) _date = {
            from: date.from,
            to: undefined
        };

        // If single date mode, set both from and to to the same date
        if (singleDate && _date.from) {
            _date.to = _date.from;
            setDate(_date);
            set(_date);
            if (!fromPreset) setSelected(undefined);
            else setMonth(_date?.to || dayjs().toDate());
            return;
        }

        if (singleMonth) {
            let newDate, oldDate;
            // find which changed
            if (_date.from !== date.from) {
                newDate = _date.from;
                oldDate = date.from;
            } else {
                newDate = _date.to;
                oldDate = date.to;
            }
            // if newdate has same month as old date, then set it
            if (dayjs(newDate).month() !== dayjs(oldDate).month()) {
                // set both to new date
                _date.from = newDate;
                _date.to = newDate;
                // setDate(_date);
                // console.log(_date)
                // return;
            }
        }
        if (_date.to === undefined) _date.to = _date.from;
        setDate(_date);
        set(_date);
        if (!fromPreset) setSelected(undefined);
        else setMonth(_date?.to || dayjs().toDate());
    }

    const selectPresets = (preset: presetType) => {
        setSelected(preset);
        switch (preset) {
            case "Today":
                selectDate({
                    from: dayjs().toDate(),
                    to: dayjs().toDate()
                }, true);
                break;
            case "Yesterday":
                selectDate({
                    from: dayjs().subtract(1, "day").toDate(),
                    to: dayjs().subtract(1, "day").toDate()
                }, true);
                break;
            case "This Week":
                selectDate({
                    from: dayjs().startOf("week").toDate(),
                    to: dayjs().endOf("week").toDate()
                }, true);
                break;
            case "This Month":
                selectDate({
                    from: dayjs().startOf("month").toDate(),
                    to: dayjs().endOf("month").toDate()
                }, true);
                break;
        }
    }

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
                            const isRangePreset = item === "This Week" || item === "This Month";
                            return <Button
                                isDisabled={
                                    (singleMonth && item === "This Week") ||
                                    (singleDate && isRangePreset)
                                }
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
                    onClick={() => selectPresets("Today")} rightIcon={<SmallCloseIcon />} justifyContent={"flex-start"} colorScheme={"red"} variant="outline" size="xs">Reset</Button>
                <Box
                    p={0}
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
                    {singleDate ? (
                        <DayPicker
                            initialFocus
                            showOutsideDays
                            onMonthChange={setMonth}
                            mode="single"
                            month={month}
                            defaultMonth={date?.from}
                            selected={date?.from}
                            onSelect={(selectedDate: Date | undefined) => {
                                if (selectedDate) {
                                    selectDate({ from: selectedDate, to: selectedDate });
                                }
                            }}
                        />
                    ) : (
                        <DayPicker
                            initialFocus
                            showOutsideDays
                            onMonthChange={setMonth}
                            mode="range"
                            month={month}
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={(selectedRange: DateRange | undefined) => {
                                selectDate(selectedRange);
                            }}
                        />
                    )}
                </Box>
            </Stack>
            <Text className="rdp-selected-text" fontSize="sm" opacity={0.8}>You Selected:<strong> {selectedTitle}</strong></Text>
        </VStack>
    </MyPopover>
}

export default CustomDatePicker
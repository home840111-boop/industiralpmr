import { FormControl, FormLabel, GridItem, SimpleGrid } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import SearchableSelector, { SearchableSelectorOptions } from "../../../Components/Inputs/SearchableSelector"
import { shiftsAtom } from "../../../Components/Store/atoms";
import Get from "../../../Components/Store/hooks/Get";
import type { Option, ReportParametrsType } from "./types";

const EquipmentSelector = ({
    equipments,
    setReportParameters,
    reportParameters
}: {
    equipments: SearchableSelectorOptions,
    setReportParameters?: (params: ReportParametrsType) => void,
    reportParameters?: ReportParametrsType
}) => {
    const [selected, setSelected] = useState<null | Option | Option[]>(null);
    const [shift, _setShift] = useState<Option[]>([]);
    const shifts = Get(shiftsAtom);

    useEffect(() => {
        if (shifts === null) return;
        // by default, select all the shifts
        setShift(shifts.shifts === 1 ? [{ label: "A", value: "a" }] :
            shifts.shifts === 2 ? [{ label: "A", value: "a" }, { label: "B", value: "b" }] :
                shifts.shifts === 3 ? [{ label: "A", value: "a" }, { label: "B", value: "b" }, { label: "C", value: "c" }] : []);
    }, [shifts]);

    const setShift = (shift: Option[]) => {
        if (shift.length === 0) return;
        _setShift(shift);
    };

    useEffect(() => {
        if (!setReportParameters || !reportParameters) return;
        setReportParameters({
            ...reportParameters,
            equipment: {
                ...reportParameters.equipment,
                option: selected,
                secondaryOption: shift
            }
        });
        // eslint-disable-next-line
    }, [selected, shift])

    return <SimpleGrid columns={3} gap={5}>
        <GridItem colSpan={2}>
            <FormControl w="100%">
                <FormLabel fontSize="sm" opacity={0.9}>Equipment</FormLabel>
                <SearchableSelector
                    onChange={setSelected}
                    value={selected}
                    isDisabled={equipments.length === 0}
                    options={equipments}
                    className="border-radius-5"
                    size="sm" />
            </FormControl>
        </GridItem>
        <FormControl w="100%">
            <FormLabel fontSize="sm" opacity={0.9}>Shifts</FormLabel>
            <SearchableSelector
                onChange={setShift}
                value={shift}
                isMulti
                closeMenuOnSelect={false}
                isDisabled={shifts === null || true}
                options={shifts !== null ?
                    shifts.shifts === 1 ? [
                        { label: "A", value: "a" },
                    ] : shifts.shifts === 2 ? [
                        { label: "A", value: "a" },
                        { label: "B", value: "b" }
                    ] : shifts.shifts === 3 ? [
                        { label: "A", value: "a" },
                        { label: "B", value: "b" },
                        { label: "C", value: "c" }
                    ] : [] : []}
                className="border-radius-5"
                size="sm" />
        </FormControl>
    </SimpleGrid>
}

export default EquipmentSelector
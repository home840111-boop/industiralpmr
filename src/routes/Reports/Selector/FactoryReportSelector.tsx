import { FormControl, FormLabel, SimpleGrid } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import SearchableSelector from "../../../Components/Inputs/SearchableSelector"
import { shiftsAtom } from "../../../Components/Store/atoms";
import Get from "../../../Components/Store/hooks/Get";
import type { Option, ReportParametrsType } from "./types";

const FactoryReportSelector = ({
    setReportParameters,
    reportParameters
}: {
    setReportParameters?: (params: ReportParametrsType) => void,
    reportParameters?: ReportParametrsType
}) => {
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
            factory: {
                ...reportParameters.factory,
                secondaryOption: shift
            }
        });
        // eslint-disable-next-line
    }, [shift])

    return <SimpleGrid gap={5}>
        <FormControl w="100%">
            <FormLabel fontSize="sm" opacity={0.9}>Shifts</FormLabel>
            <SearchableSelector
                onChange={setShift}
                value={shift}
                isMulti
                closeMenuOnSelect={false}
                isDisabled={shifts === null}
                options={[
                    { label: "A", value: "a" },
                    { label: "B", value: "b" },
                    { label: "C", value: "c" }
                ]}
                className="border-radius-5"
                size="sm" />
        </FormControl>
    </SimpleGrid>
}

export default FactoryReportSelector
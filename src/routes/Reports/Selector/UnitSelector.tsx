import { FormControl, FormLabel, GridItem, SimpleGrid } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import SearchableSelector, { SearchableSelectorOptions } from "../../../Components/Inputs/SearchableSelector"
import type { Option, ReportParametrsType } from "./types";

const UnitSelector = ({
    units,
    setReportParameters,
    reportParameters
}: {
    units: SearchableSelectorOptions,
    setReportParameters?: (params: ReportParametrsType) => void,
    reportParameters?: ReportParametrsType
}) => {
    const [selected, setSelected] = useState<null | Option | Option[]>(null);

    useEffect(() => {
        if (!setReportParameters || !reportParameters) return;
        setReportParameters({
            ...reportParameters,
            "unit-power": {
                ...reportParameters.machine,
                option: selected
            }
        });
        // eslint-disable-next-line
    }, [selected])

    return <SimpleGrid gap={5}>
        <GridItem>
            <FormControl w="100%">
                <FormLabel fontSize="sm" opacity={0.9}>Unit</FormLabel>
                <SearchableSelector
                    onChange={setSelected}
                    value={selected}
                    isDisabled={units.length === 0}
                    options={units}
                    className="border-radius-5"
                    size="sm" />
            </FormControl>
        </GridItem>
    </SimpleGrid>
}

export default UnitSelector
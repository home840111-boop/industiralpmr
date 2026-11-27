import { FormControl, FormLabel, GridItem, SimpleGrid } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import SearchableSelector, { SearchableSelectorOptions } from "../../../Components/Inputs/SearchableSelector"
import type { Option, ReportParametrsType } from "./types";

const EnvironmentSelector = ({
    environments,
    setReportParameters,
    reportParameters
}: {
    environments: SearchableSelectorOptions,
    setReportParameters?: (params: ReportParametrsType) => void,
    reportParameters?: ReportParametrsType
}) => {
    const [selected, setSelected] = useState<null | Option | Option[]>(null);

    useEffect(() => {
        if (selected) {
            const selectedVal = (selected as Option).value;
            const exists = (environments as any[])?.some((group: any) =>
                group.options
                    ? group.options.some((opt: any) => opt.value === selectedVal)
                    : group.value === selectedVal
            );
            if (!exists) {
                setSelected(null);
            }
        }
    }, [environments, selected]);

    useEffect(() => {
        if (!setReportParameters || !reportParameters) return;
        setReportParameters({
            ...reportParameters,
            environment: {
                ...reportParameters.environment,
                option: selected
            }
        });
        // eslint-disable-next-line
    }, [selected])

    return <SimpleGrid gap={5}>
        <GridItem>
            <FormControl w="100%">
                <FormLabel fontSize="sm" opacity={0.9}>Environment</FormLabel>
                <SearchableSelector
                    onChange={setSelected}
                    value={selected}
                    isDisabled={environments.length === 0}
                    options={environments}
                    className="border-radius-5"
                    size="sm" />
            </FormControl>
        </GridItem>
    </SimpleGrid>
}

export default EnvironmentSelector
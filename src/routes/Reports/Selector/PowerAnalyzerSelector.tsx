import { FormControl, FormLabel, GridItem, SimpleGrid } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import SearchableSelector, { SearchableSelectorOptions } from "../../../Components/Inputs/SearchableSelector";
import type { Option, ReportParametrsType } from "./types";

interface PowerAnalyzerSelectorProps {
    options: SearchableSelectorOptions;
    setReportParameters?: (params: ReportParametrsType) => void;
    reportParameters?: ReportParametrsType;
}

const PowerAnalyzerSelector = ({
    options,
    setReportParameters,
    reportParameters
}: PowerAnalyzerSelectorProps) => {
    const [selected, setSelected] = useState<null | Option | Option[]>(null);

    useEffect(() => {
        if (!setReportParameters || !reportParameters) return;
        setReportParameters({
            ...reportParameters,
            "power-analyzer": {
                ...reportParameters["power-analyzer"],
                option: selected
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected]);

    return (
        <SimpleGrid columns={3} gap={5}>
            <GridItem colSpan={3}>
                <FormControl w="100%">
                    <FormLabel fontSize="sm" opacity={0.9}>Target Device / Meter</FormLabel>
                    <SearchableSelector
                        onChange={setSelected}
                        value={selected}
                        isDisabled={options.length === 0}
                        options={options}
                        className="border-radius-5"
                        placeholder="Search or select Machine, Equipment, or Main Meter..."
                        size="sm"
                    />
                </FormControl>
            </GridItem>
        </SimpleGrid>
    );
};

export default PowerAnalyzerSelector;

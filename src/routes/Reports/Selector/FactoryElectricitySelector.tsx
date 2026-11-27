import { FormControl, FormLabel } from "@chakra-ui/react"
import dayjs from "../../../Components/Functions/dayjs";
import { useEffect, useState } from "react"
import PrimarySelect from "../../../Components/Inputs/PrimarySelect"
import type { ReportParametrsType } from "./types";

const FactorySelector = ({
    setReportParameters,
    reportParameters
}: {
    setReportParameters?: (params: ReportParametrsType) => void,
    reportParameters?: ReportParametrsType
}) => {
    const [type, setType] = useState<"day" | "month" | "year">("day");

    useEffect(() => {
        if (!setReportParameters || !reportParameters) return;
        setReportParameters({
            ...reportParameters,
            "main-electricity": {
                ...reportParameters["main-electricity"],
                type,
                date: type === "day" ? dayjs().format("YYYY-MM-DD") : type === "month" ? dayjs().format("YYYY-MM") : dayjs().format("YYYY")
            }
        });
        // eslint-disable-next-line
    }, [type])

    return <FormControl w="100%">
        <FormLabel fontSize="sm" opacity={0.9}>Report by</FormLabel>
        <PrimarySelect size="sm" borderRadius={"5px"} fontWeight={500} value={type} onChange={e => setType(e.target.value as "day" | "month" | "year")}>
            <option value="day">Day (detailed to every hour)</option>
            <option value="month">Month (detailed to every day)</option>
            <option value="year">Year (detailed to every month)</option>
        </PrimarySelect>
    </FormControl>
}

export default FactorySelector
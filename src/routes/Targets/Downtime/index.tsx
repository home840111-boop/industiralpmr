import { Box, GridItem, SimpleGrid } from "@chakra-ui/react";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import Header from "./Header";
import TotalCard from "./TotalCard";

const Downtime = () => {
    const [date, setDate] = useState<DateRange | undefined>(undefined);

    return <Box>
        <Header setDate={setDate} />
        <SimpleGrid columns={{
            base: 1,
            md: 4
        }} gap={5}>
            <TotalCard title={"Total Factory"} date={date} />
            <GridItem colSpan={{
                base: 1,
                md: 3
            }}>
            </GridItem>
        </SimpleGrid>
    </Box>
}

export default Downtime
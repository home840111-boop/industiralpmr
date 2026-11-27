import { Box, SimpleGrid } from "@chakra-ui/react"
import dayjs from "../../../Components/Functions/dayjs";
import { useEffect, useMemo, useState } from "react"
import fetch, { DataToSet } from "./fetch";
import Header from "./Header";
import UnitsProduced from "./UnitsProduced";

const TargetStats = () => {
  const [month, setMonth] = useState<{
    from?: string,
    to?: string
  }>({
    from: undefined,
    to: undefined
  });
  const [data, setData] = useState<DataToSet | null>(null);

  const formattedMonths = useMemo(() => {
    if (!month.from) return "";
    if (!month.to) month.to = month.from = month.to;
    if (month.from === month.to) return dayjs(month.from, "YYYY-MM").format("MMM, YY");
    else return `${dayjs(month.from, "YYYY-MM").format("MMM, YY")} - ${dayjs(month.to, "YYYY-MM").format("MMM, YY")}`;
  }, [month]);

  useEffect(() => {
    if (month.from === undefined) return;
    fetch(month).then(setData)
      .catch((error: any) => {
        console.error(error);
      });
  }, [month]);

  return <Box>
    <Header setMonth={setMonth} />
    <SimpleGrid columns={{
      base: 1,
      lg: 3
    }}
      gap={5}>
      <UnitsProduced duration={formattedMonths} unitsProduced={data?.unitsProduced} />
    </SimpleGrid>
  </Box>
}

export default TargetStats
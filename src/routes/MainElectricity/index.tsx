import { Flex, GridItem, SimpleGrid } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import NotFoundAlert from "../../Components/micro/NotFoundAlert";
import fetch from "./fetch";
import DailyData from "./DailyData";
import SevenDaysData from "./SevenDaysData";
import { dateAtom } from "../../Components/Store/atoms";
import SixMonthsData from "./SixMonthsData";
import Listen from "../../Components/Store/hooks/Listen";
import { Helmet } from "react-helmet";

const MainElectricity = () => {
  const [hasMeter, setHasMeter] = useState<null | boolean>(null);
  const date = Listen(dateAtom);

  useEffect(() => {
    if (!date) return;
    const func = () => {
      fetch().then(res => {
        setHasMeter(res);
      }).catch((err: any) => {
        console.log(err);
      })
    }

    func();
  }, [date]);

  return <Flex flexDir={"column"} gap={5}>
    <Helmet>
      <title>Main Electricity | industrialpmr</title>
    </Helmet>
    {hasMeter === false && <NotFoundAlert
      title="No Meter Found"
      description="No meter found in your factory, Kindly contact support to add meter. For now, you can view the demo data."
    />}
    <SimpleGrid
      w="100%"
      gap={5}
      columns={{
        base: 1,
        md: 3
      }}>
      <GridItem
        colSpan={{
          base: 1,
          md: 2
        }}>
        <DailyData hasMeter={hasMeter} />
      </GridItem>
      <GridItem>
        <SevenDaysData hasMeter={hasMeter} />
      </GridItem>
      <SixMonthsData hasMeter={hasMeter} />
    </SimpleGrid>
  </Flex >
}

export default MainElectricity
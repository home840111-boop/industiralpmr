import { Box, CardBody, CardHeader, Flex, Text, useColorMode } from "@chakra-ui/react";
import MyTooltip from "../../../Components/micro/MyTooltip";
import { Suspense, useEffect, useMemo, useState } from "react";
import { SmallFill } from "../../../Components/Loaders";
import MyCard from "../../../Components/micro/Card";
import NotFound from "../../../Components/micro/NotFound";
import Chart from "./Chart";
import ShowSelector from "../../../Components/micro/ShowSelector";
import NumberFormatter from "../../../Components/micro/NumberFormatter";
import WeightFormatter from "../../../Components/micro/WeightFormatter";
import UnitFormatter from "../../../Components/micro/UnitFormatter";
import { factoryProductionAtom } from "../../../Components/Store/atoms";
import Get from "../../../Components/Store/hooks/Get";
import LengthFormatter from "../../../Components/micro/LengthFormatter";

interface DataProps {
  hours: any[];
  notFound?: boolean;
}
type views = "shots" | "production" | "material" | "electricity" | "production_meters";
const HourlyChart = ({
  hours,
  notFound = false
}: DataProps) => {
  const { colorMode } = useColorMode();
  const { border } = useMemo(() => {
    return {
      border: `${colorMode}.border`,
    }
  }, [colorMode]);
  const isLoading = useMemo(() => hours.length === 0, [hours]);
  const productionType = Get(factoryProductionAtom);
  const [view, _setView] = useState<views>("shots");

  const setView = (view: views) => {
    if (productionType === null) return;
    if (productionType === "meter" && view === "production") view = "production_meters";
    _setView(view);
  }

  useEffect(() => {
    if (productionType === null) return;
    if (productionType === "meter") _setView("production_meters");
  }, [productionType]);

  const [sortedHours, hoursInfo] = useMemo(() => {
    const sortedHours = {
      total: [] as any[],
      others: [] as any[]
    };
    const hoursInfo: {
      avg: number,
      best: {
        name: string,
        value: number
      },
      worst: {
        name: string,
        value: number
      }
    } = {
      avg: Infinity,
      best: {
        name: "",
        value: -Infinity
      },
      worst: {
        name: "",
        value: Infinity
      }
    }
    const totalMachinesEquipments: {
      [key: string]: {
        value: number,
        name: string
      }
    } = {};
    for (const hour of hours) {
      const { machines, equipments, time } = hour;
      const totalToPush = {
        time,
        value: 0,
        name: "Total"
      };
      for (const _machine of Object.keys(machines || {})) {
        const machine: any = machines[_machine];
        let val = 0;
        if (view === "electricity") {
          val = machine.electricity_usage || 0;
        } else if (view === "material") {
          val = machine.material_usage || 0;
        } else if (machine[view] !== undefined) {
          val = machine[view] || 0;
        }
        totalToPush.value += val;
        sortedHours.others.push({
          time,
          value: val,
          name: machine.name
        });
        if (totalMachinesEquipments[_machine] === undefined) totalMachinesEquipments[_machine] = {
          value: 0,
          name: machine.name
        }
        totalMachinesEquipments[_machine].value += val;
      }
      if (view === "electricity") for (const _eq of Object.keys(equipments || {})) {
        const equipmet: any = equipments[_eq];
        let val = 0;
        if (view === "electricity") {
          val = equipmet.electricity_usage;
        }
        totalToPush.value += val;
        sortedHours.others.push({
          time,
          value: val,
          name: equipmet.name
        });
        if (totalMachinesEquipments[_eq] === undefined) totalMachinesEquipments[_eq] = {
          value: 0,
          name: equipmet.name
        };
        totalMachinesEquipments[_eq].value += val;
      }
      sortedHours.total.push(totalToPush);
      if (hoursInfo.avg === Infinity) hoursInfo.avg = totalToPush.value;
      hoursInfo.avg = (hoursInfo.avg + totalToPush.value) / 2;
    }
    for (const _machine of Object.keys(totalMachinesEquipments)) {
      const machine = totalMachinesEquipments[_machine];
      if (machine.value > hoursInfo.best.value) {
        hoursInfo.best = machine;
      }
      if (machine.value < hoursInfo.worst.value) {
        hoursInfo.worst = machine;
      }
    }
    hoursInfo.avg = hoursInfo.avg === Infinity ? 0 : hoursInfo.avg;
    return [sortedHours, hoursInfo];
  }, [hours, view]);



  return <MyCard
    h="100%"
    noPadding>
    <CardHeader
      alignItems="center"
      justifyContent="space-between"
      as={Flex}
      py={4}
      borderBottom="1px dashed"
      borderColor={border}>
      <Text
        fontSize="md"
        fontWeight={500}>Factory Performance</Text>
      <ShowSelector view={view === "production_meters" ? "production" : view} setView={setView} />
    </CardHeader>
    <CardBody h="100%" p={0}>
      {
        notFound ? <Suspense fallback={<SmallFill />}>
          <NotFound />
        </Suspense> : isLoading ? <SmallFill /> : <Flex
          flexDir={"column"}>
          <Flex
            borderBottom="1px dashed"
            borderColor={border}
            flexDir={"row"}
            justifyContent="space-evenly"
            alignItems="center"
            mb={5}>
            <Box
              w='100%'
              h='100%'
              py={5}
              textAlign={"center"}>
              <Text
                fontSize="md"
                fontWeight={600}>
                <MyTooltip label={<FormatAll number={hoursInfo.best.value} view={view} />}>
                  {hoursInfo.best.name}
                </MyTooltip>
              </Text>
              <Text
                textTransform={"capitalize"}
                letterSpacing={1}
                opacity={0.7}
                fontSize="xs">
                Highest Performance
              </Text>
            </Box>
            <Box
              borderRight="1px dashed"
              borderLeft="1px dashed"
              w='100%'
              h='100%'
              py={5}
              borderColor={border}
              textAlign={"center"}>
              <Text
                fontSize="md"
                fontWeight={600}>
                <MyTooltip label={<FormatAll number={hoursInfo.worst.value} view={view} />}>
                  {hoursInfo.worst.name}
                </MyTooltip>
              </Text>
              <Text
                letterSpacing={1}
                opacity={0.7}
                fontSize="xs">
                Lowest Performance
              </Text>
            </Box>
            <Box
              w='100%'
              h='100%'
              py={5}
              textAlign={"center"}>
              <Text
                fontSize="xl"
                fontWeight={600}>
                <FormatAll number={hoursInfo.avg} view={view} />
              </Text>
              <Text
                letterSpacing={1}
                opacity={0.7}
                fontSize="xs">Hourly Avg.</Text>
            </Box>
          </Flex>
          <Box p={5}>
            <Chart hours={sortedHours} view={view} />
          </Box>
        </Flex>}
    </CardBody>
  </MyCard>
}

const FormatAll = ({
  number,
  view
}: {
  number: number;
  view: views;
}) => {
  return view === "shots" ? <NumberFormatter
    number={+number.toFixed(0)}
    suffix=" shot(s)" />
    : view === "production" ? <NumberFormatter
      number={+number.toFixed(0)}
      suffix=" pc(s)" />
      : view === "material" ? <WeightFormatter
        number={number} />
        : view === "production_meters" ? <LengthFormatter
          number={number} />
          : view === "electricity" ? <UnitFormatter
            number={number} />
            : <NumberFormatter
              number={number} />
}

export { FormatAll };
export default HourlyChart;
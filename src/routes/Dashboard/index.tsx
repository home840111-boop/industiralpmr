import {
  Box,
  Flex,
  SimpleGrid,
  GridItem,
  useBreakpointValue
} from "@chakra-ui/react";
import { useEffect, useState, Suspense, useMemo } from "react";
import { dateAtom, factoriesAtom, selectedFactoryAtom, shiftsAtom } from "../../Components/Store/atoms";
import Get from "../../Components/Store/hooks/Get";
import Listen from "../../Components/Store/hooks/Listen";
import fetch from "./fetch";
import StatsCard from "./StatsCard";
import MachinesTable from "./MachinesTable";
import MachinesGraph from "./MachinesGraph";
import MachinesSpiderChart from "./MachinesSpiderChart";
import FactoryActivies from "./FactoryActivities";
import EquipmentsTable from "./EquipmentsTable";
import EquipmentsSpiderChart from "./EquipmentsSpiderChart";
import Units from "./Units";
import HourlyChart from "./HourlyChart";
import { Helmet } from "react-helmet";

const state = {
  // negative value means loading
  value: -1,
  change: 0,
  chart: []
}
const initialstate = {
  total: {
    shots: state,
    production_meters: state,
    production: state,
    electricity: state,
    realtimeKW: {
      current: 0,
      change: 0
    },
    material: state
  },
  machines: {},
  equipments: {},
  units: {},
  machineHourly: [],
  equipmentHourly: [],
  overview: {
    machines: {
      on: 0,
      total: 0
    },
    equipments: {
      on: 0,
      total: 0
    },
    units: {
      on: 0,
      total: 0
    },
    supervisor: "unkown"
  },
  notFound: false,
  supervisor: "unkown",
  hours: [],
  activities: []
}
interface ActivityProps {
  name: string;
  state: string;
  status: "OK" | "WARNING" | "ERROR";
  title: string;
  unix: number;
}
interface eachStat {
  value: number
  change: number
  chart: number[]
}
interface machineProps {
  name: string;
  shots: number;
  production_meters: number;
  production: number;
  material: number;
  electricity: number;
  status: string;
  mold: string;
  at: number;
}
interface equipmentProps {
  name: string;
  electricity: number;
  status: string;
  at: number;
}
interface machinesHour {
  hour: string;
  machine: string;
  value: {
    shots: number;
    production_meters: number;
    production: number;
    material: number;
    electricity: number;
  };
}
interface equipmentHour {
  hour: string;
  equipment: string;
  value: number;
}
interface StatsProps {
  total: {
    shots: eachStat,
    production_meters: eachStat,
    production: eachStat,
    electricity: eachStat,
    realtimeKW: {
      current: number,
      change: number
    },
    material: eachStat
  }
  machines: {
    [key: string]: machineProps;
  };
  equipments: {
    [key: string]: equipmentProps;
  } | "NOT_FOUND";
  units: {
    [key: string]: any
  },
  overview: {
    machines: {
      on: number,
      total: number
    },
    equipments: {
      on: number,
      total: number
    },
    units: {
      on: number,
      total: number
    },
    supervisor: string
  },
  machineHourly: machinesHour[],
  equipmentHourly: equipmentHour[] | "NOT_FOUND",
  notFound: boolean,
  supervisor: string,
  hours: any[],
  activities: ActivityProps[] | "NOT_FOUND"
}
interface selectedFactoryType {
  name: string;
  value: number;
  only: boolean;
}
const Index = () => {
  const { firstRowColumns, firstRowSecondColumn, secondRowColumns } = useBreakpointValue(
    {
      base: { firstRowColumns: 1, firstRowSecondColumn: 1, secondRowColumns: 1 },
      lg: { firstRowColumns: 8, firstRowSecondColumn: 2, secondRowColumns: 3 }
    }
  ) || {};
  const [stats, setStats] = useState<StatsProps>(initialstate);
  const date = Listen(dateAtom);
  const shifts = Get(shiftsAtom);
  const factories = Get(factoriesAtom);
  const selectedFactory = Listen(selectedFactoryAtom);
  const shift_a_start = useMemo(() => {
    if (!shifts) return null;
    return shifts.A;
  }, [shifts]);

  useEffect(() => {
    setStats(initialstate);
  }, [selectedFactory]);

  useEffect(() => {
    if (shift_a_start === null || !date || !selectedFactory || !factories) return;
    const func = async () => {
      try {
        const _stats = await fetch(date, shift_a_start, factories, selectedFactory);
        const stats = {
          ..._stats,
          overview: {
            machines: {
              on: 0,
              total: 0
            },
            equipments: {
              on: 0,
              total: 0
            },
            units: {
              on: 0,
              total: 0
            },
            supervisor: _stats.supervisor
          }
        };
        if (stats.equipments !== 'NOT_FOUND') for await (const eq of Object.values(stats.equipments)) {
          if (eq.status === "ON") stats.overview.equipments.on++;
          stats.overview.equipments.total++;
        }
        for await (const machine of Object.values(stats.machines)) {
          if (machine.status === "ON") stats.overview.machines.on++;
          stats.overview.machines.total++;
        }
        for await (const unit of Object.values(stats.units)) {
          if (unit.connected) stats.overview.units.on++;
          stats.overview.units.total++;
        }
        setStats(stats);
      } catch (err) {
        console.warn("[Dashboard] Error loading dashboard stats:", err);
      }
    };
    const interval = setInterval(func, 30000);
    func();
    return () => clearInterval(interval);
  }, [date, shift_a_start, selectedFactory, factories]);

  return <Box>
    {<>
      <Suspense fallback={<div>loading...</div>}>
        <Helmet>
          <title>Dashboard | industrialpmr</title>
        </Helmet>
        <Flex gap={5} flexDir={"column"}>
          <SimpleGrid
            columns={firstRowColumns}
            gap={5}>
            <GridItem
              colSpan={firstRowColumns && firstRowColumns > 1 ? firstRowColumns / 2 : 1}>
              <StatsCard
                overview={stats.overview}
                notFound={stats.notFound}
                total={stats.total}
              />
            </GridItem>
            <GridItem
              h="100%"
              colSpan={firstRowColumns && firstRowColumns > 1 ? firstRowColumns / 2 : 1}>
              <SimpleGrid
                h="100%"
                gap={5}
                columns={firstRowSecondColumn}>
                <Units
                  notFound={stats.notFound}
                  units={stats.units} />
                <MachinesGraph
                  notFound={stats.notFound}
                  machines={Object.values(stats.machines)} />
              </SimpleGrid>
            </GridItem>
          </SimpleGrid>
          <SimpleGrid
            columns={secondRowColumns}
            spacing={5}>
            <GridItem colSpan={2}>
              <HourlyChart
                notFound={stats.notFound}
                hours={stats.hours} />
            </GridItem>
            <GridItem>
              <FactoryActivies
                activities={stats.activities}
              />
            </GridItem>
          </SimpleGrid>
          <SimpleGrid
            columns={secondRowColumns}
            spacing={5}>
            <GridItem colSpan={{
              base: 2,
              lg: 1
            }}>
              <MachinesSpiderChart
                notFound={stats.notFound}
                machines={stats.machineHourly} />
            </GridItem>
            <GridItem colSpan={2}>
              <MachinesTable
                notFound={stats.notFound}
                machines={stats.machines} />
            </GridItem>
          </SimpleGrid>
          <SimpleGrid
            columns={{
              base: 1,
              lg: 2
            }}
            spacing={5}>
            <EquipmentsTable
              equipments={stats.equipments} />
            <EquipmentsSpiderChart
              notFound={stats.equipmentHourly === "NOT_FOUND"}
              equipments={stats.equipmentHourly === "NOT_FOUND" ? [] : stats.equipmentHourly} />
          </SimpleGrid>
        </Flex>
      </Suspense>
    </>}
  </Box>
}

export type { selectedFactoryType }
export default Index
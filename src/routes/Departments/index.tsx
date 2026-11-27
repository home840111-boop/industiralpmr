import { GridItem, SimpleGrid } from "@chakra-ui/react"
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { departmentAtom, departmentsAtom, factoriesAtom, selectedFactoryAtom } from "../../Components/Store/atoms";
import Get from "../../Components/Store/hooks/Get";
import Listen from "../../Components/Store/hooks/Listen";
import DepartmentsBreakdown from "./DepartmentsBreakdown";
import DepartmentsData from "./DepartmentsData";
import DepartmentsList from "./DepartmentsList";
import fetch from "./fetch";
import HourlyChart from "./HourlyChart";
import TopPerformers from "./TopPerformers";
import TotalStatsBlock from "./TotalStatsBlock";

interface Peformace {
  name: string,
  department: string,
  link: string,
  value: number,
  share: number
}
interface eachStat {
  value: number
  change: number
}
interface DataToSet {
  total: {
    shots: eachStat,
    production: eachStat,
    electricity: eachStat,
    material: eachStat
  },
  departmentsList: {
    name: string,
    supervisor: string,
    machineOns: {
      total: number,
      on: number
    },
    equipmentOns: {
      total: number,
      on: number
    },
  }[],
  departmentBreakdown: {
    [key: string]: {
      shots: number,
      production: number,
      electricity: number,
      material: number,
      supervisor: string,
    }
  },
  topPerformers: {
    shots: Peformace[],
    production: Peformace[],
    electricity: Peformace[],
    material: Peformace[]
  },
  hourlyData: {
    [department: string]: {
      time: string,
      shots: number,
      production: number,
      electricity: number,
      material: number
    }[]
  }
};
const stat: eachStat = {
  value: 0,
  change: 0
}
const defaultData: DataToSet = {
  total: {
    shots: stat,
    production: stat,
    electricity: stat,
    material: stat
  },
  departmentsList: [],
  departmentBreakdown: {},
  topPerformers: {
    shots: [],
    production: [],
    electricity: [],
    material: []
  },
  hourlyData: {}
}

const Departments = () => {
  const [refresh, setRefresh] = useState(false);
  const [data, setData] = useState<null | DataToSet>(null);
  const departments = Get(departmentsAtom);
  const department = Get(departmentAtom);
  const factories = Get(factoriesAtom);
  const selectedFactory = Listen(selectedFactoryAtom);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefresh(prev => !prev);
    }, 30000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (department === null || departments === null || !selectedFactory || !factories) return;
    fetch(department, departments, factories, selectedFactory).then(setData).catch((err: any) => {
      console.error(err);
      setData(defaultData);
    });
  }, [departments, department, factories, selectedFactory, refresh]);

  return <SimpleGrid columns={{
    base: 1,
    midLgXl: 7
  }} gap={5}>
    <Helmet>
      <title>Departments | industrialpmr</title>
    </Helmet>
    <GridItem colSpan={{
      base: 1,
      midLgXl: 3
    }}>
      <SimpleGrid columns={{
        base: 1,
        sm: 2
      }} gap={5}>
        <TotalStatsBlock stats={data?.total} />
        <GridItem colSpan={{
          base: 1,
          sm: 2
        }}>
          <HourlyChart data={data?.hourlyData} />
        </GridItem>
      </SimpleGrid>
    </GridItem>
    <GridItem colSpan={{
      base: 1,
      midLgXl: 4
    }}>
      <SimpleGrid columns={{
        base: 1,
        midLgXl: 2
      }} gap={5}>
        <DepartmentsList list={data ? data.departmentsList : null} />
        <DepartmentsBreakdown data={data?.departmentBreakdown} />
        <GridItem colSpan={{
          base: 1,
          midLgXl: 2
        }}>
          <TopPerformers data={data?.topPerformers} />
        </GridItem>
      </SimpleGrid>
    </GridItem>
    <GridItem colSpan={{
      base: 1,
      midLgXl: 7
    }}>
      <DepartmentsData data={data?.departmentBreakdown} />
    </GridItem>
  </SimpleGrid>
}

export type { DataToSet };
export default Departments;
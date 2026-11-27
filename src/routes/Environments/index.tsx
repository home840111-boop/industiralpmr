import { Box } from "@chakra-ui/react"
import { Suspense, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import Header from "../../Components/Header";
import { SmallFill } from "../../Components/Loaders";
import NotFoundAlert from "../../Components/micro/NotFoundAlert";
import { dateAtom, departmentAtom, departmentsAtom, EnvListAtom, factoriesAtom, isMasterAdminAtom, selectedFactoryAtom, uidAtom } from "../../Components/Store/atoms";
import Listen from "../../Components/Store/hooks/Listen";
import { filterDepartmentsForView, isMasterOwner } from "../../Services/rbac";
import fetch from "./fetch";
import GridLayout from "./GridLayout";
import ListLayout from "./ListLayout";

interface selectedFactoryType {
  name: string;
  value: number;
  only: boolean;
}

interface EnvironmentStats {
  temperature: number;
  humidity: number;
}
interface Environment {
  id: string;
  name: string;
  now: EnvironmentStats;
  today: {
    temperature: {
      min: number;
      max: number;
      avg: number;
    };
    humidity: {
      min: number;
      max: number;
      avg: number;
    };
  };
  updated: number;
  isOnline: boolean;
  isUpToDate: true | string;
  unit: string;
};
interface RawEnvironmentType {
  [key: string]: Environment;
}

const Environments = () => {
  const [view, _setView] = useState<'grid' | 'list'>(localStorage.getItem('environmentsLayoutView') as 'grid' | 'list' || 'grid');
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [department, setDepartment] = useState<string>("ALL");
  const selectedFactory = Listen(selectedFactoryAtom);
  const [rawEnvironments, setRawEnvironments] = useState<RawEnvironmentType | "NOT_FOUND">({});
  const [refresh, setRefresh] = useState<boolean>(false);
  const factories = Listen(factoriesAtom);
  const date = Listen(dateAtom);
  const envList = Listen(EnvListAtom);
  const departments = Listen(departmentsAtom);
  const userDepts = Listen(departmentAtom) as string[] | null;
  Listen(isMasterAdminAtom);
  const uid = Listen(uidAtom);
  const search = setSearchQuery;

  const mySelectedFactory = selectedFactory && factories ? (factories as any)[selectedFactory.value] : undefined;
  const hasAll = isMasterOwner(uid) || (userDepts || []).includes("all");
  const scopedDepartments = useMemo(() => (
    filterDepartmentsForView(departments, userDepts, hasAll, mySelectedFactory, "envs")
  ), [departments, userDepts, hasAll, mySelectedFactory]);

  useEffect(() => {
    if (department !== "ALL" && departments && !scopedDepartments[department]) {
      setDepartment("ALL");
    }
  }, [department, departments, scopedDepartments]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefresh(prev => !prev);
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setRawEnvironments({});
  }, [selectedFactory]);

  useEffect(() => {
    if (!date || !selectedFactory || !factories || !envList) return;

    fetch(date, envList, factories, selectedFactory).then(data => {
      setRawEnvironments(data);
    }).catch((err: any) => {
      console.log(err);
    });
  }, [date, factories, selectedFactory, refresh, envList]);

  const setView = (view: 'grid' | 'list') => {
    localStorage.setItem('environmentsLayoutView', view);
    _setView(view);
  }

  const { environments, totalEnvironments, viewingEnvironments }: {
    environments: Environment[] | "NOT_FOUND",
    totalEnvironments: number,
    viewingEnvironments: number
  } = useMemo(() => {
    if (rawEnvironments === "NOT_FOUND" || !departments) return {
      environments: "NOT_FOUND",
      totalEnvironments: 0,
      viewingEnvironments: 0
    };
    const environments = Object.values(rawEnvironments);
    const toReturn = (() => {
      if (searchQuery) {
        return environments.filter(environment => environment.name.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      const environmentIDsInDepartment = department === "ALL" ? Object.keys(rawEnvironments) : Object.values(departments[department]?.envs || {});
      return environments.filter(environment => environmentIDsInDepartment.includes(environment.id));
    })();
    if (toReturn.length === 0 && environments.length > 0) return {
      environments: "NOT_FOUND",
      totalEnvironments: environments.length,
      viewingEnvironments: toReturn.length
    };
    return {
      environments: toReturn,
      totalEnvironments: environments.length,
      viewingEnvironments: toReturn.length
    };
  }, [rawEnvironments, searchQuery, department, departments]);

  return <Box>
    <Helmet>
      <title>Environments | industrialpmr</title>
    </Helmet>
    <Header
      search={search}
      view={view}
      setView={setView}
      department={department}
      setDepartment={setDepartment}
      departments={scopedDepartments}
      total={totalEnvironments}
      viewing={viewingEnvironments}
      viewingName={"Environments"} />
    {
      rawEnvironments === "NOT_FOUND" ? <NotFoundAlert
        title="No Environment sensors found!"
        description="No Environment sensors found in your factory, please contact support if you'd like to add a new Environment sensor." />
        : view === 'grid' ?
          <Suspense fallback={<SmallFill />}>
            <GridLayout environments={environments === "NOT_FOUND" ? [] : environments} notFound={environments === "NOT_FOUND"} />
          </Suspense> :
          <Suspense fallback={<SmallFill />}>
            <ListLayout environments={environments === "NOT_FOUND" ? [] : environments} notFound={environments === "NOT_FOUND"} />
          </Suspense>
    }
  </Box>
}

export type { RawEnvironmentType, selectedFactoryType, Environment };
export default Environments
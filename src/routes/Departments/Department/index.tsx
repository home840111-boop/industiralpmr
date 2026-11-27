import { Flex, GridItem, SimpleGrid } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom"
import NotFoundAlert from "../../../Components/micro/NotFoundAlert";
import { departmentAtom, departmentsAtom, factoriesAtom, selectedFactoryAtom } from "../../../Components/Store/atoms";
import Get from "../../../Components/Store/hooks/Get";
import Listen from "../../../Components/Store/hooks/Listen";
import TotalStatsBlock from "../TotalStatsBlock";
import Equipments from "./Equipments";
import fetch from "./fetch";
import HourlyChart from "./HourlyChart";
import HourlySpider from "./HourlySpider";
import Machines from "./Machines";
import Overview from "./Overview";

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
    overview: {
        status: "IN PRODUCTION" | "NOT IN PRODUCTION",
        supervisor: string,
        machines: {
            total: number,
            on: number,
        },
        equipments: {
            total: number,
            on: number,
        },
        name: string
    },
    hourly: {
        [time: string]: {
            machines: {
                [machine: string]: {
                    name: string;
                    shots: number;
                    production: number;
                    material: number;
                    electricity: number;
                };
            };
            equipments: {
                [equipment: string]: {
                    name: string;
                    electricity: number;
                };
            };
            total: {
                shots: number;
                production: number;
                material: number;
                electricity: number;
            };
        };
    },
    machines: {
        [machineID: string]: {
            name: string;
            status: "ON" | "OFF" | "IDLE" | "NA";
            shots: number;
            production: number;
            material: number;
            electricity: number;
            mold: string;
        }
    },
    equipments: {
        [equipmentID: string]: {
            name: string;
            status: "ON" | "OFF" | "IDLE" | "NA";
            electricity: number;
        }
    }
}
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
    overview: {
        status: "NOT IN PRODUCTION",
        supervisor: "",
        machines: {
            total: 0,
            on: 0,
        },
        equipments: {
            total: 0,
            on: 0,
        },
        name: ""
    },
    hourly: {},
    machines: {},
    equipments: {}
}

const Department = () => {
    const { departmentName } = useParams();
    const [refresh, setRefresh] = useState(false);
    const [data, setData] = useState<null | DataToSet | "NOT_ALLOWED">(null);
    const department = Get(departmentAtom) as string[];
    const departments = Get(departmentsAtom);
    const factories = Get(factoriesAtom);
    const selectedFactory = Listen(selectedFactoryAtom);

    useEffect(() => {
        if (!departmentName || !department || departments === null || factories === null || !selectedFactory) return;
        if ((!department.includes("all") && !department.includes(departmentName)) || departments[departmentName] === undefined) setData("NOT_ALLOWED");
        else fetch(departmentName, departments[departmentName], factories, selectedFactory).then(setData).catch((err: any) => {
            console.error(err);
            setData(defaultData);
        });
    }, [departmentName, refresh, department, departments, factories, selectedFactory]);

    useEffect(() => {
        const interval = setInterval(() => {
            setRefresh(prev => !prev);
        }, 30000);

        return () => {
            clearInterval(interval);
        }
    }, []);


    return <>
        <Helmet>
            <title>{departmentName || ""} | Departments | industrialpmr</title>
        </Helmet>
        {data === "NOT_ALLOWED" ? <NotFoundAlert
            title="No Department found!"
            description="No department found in your factory with this name, please contact support for assistance." />
            : <Flex gap={5} flexDir={"column"}>
                <SimpleGrid columns={{
                    base: 1,
                    midLgXl: 5
                }} gap={5}>
                    <GridItem colSpan={{
                        base: 1,
                        midLgXl: 2
                    }}>
                        <Overview data={data?.overview} />
                    </GridItem>
                    <GridItem colSpan={{
                        base: 1,
                        midLgXl: 3
                    }}>
                        <SimpleGrid columns={{
                            base: 1,
                            md: 2,
                        }} gap={5}>
                            <TotalStatsBlock stats={data?.total} />
                        </SimpleGrid>
                    </GridItem>
                </SimpleGrid>
                <SimpleGrid columns={{
                    base: 1,
                    midLgXl: 3
                }} gap={5}>
                    <GridItem colSpan={{
                        base: 1,
                        midLgXl: 2
                    }}>
                        <HourlyChart data={data?.hourly} />
                    </GridItem>
                    <HourlySpider data={data?.hourly} />
                </SimpleGrid>
                <Machines data={data?.machines} />
                <Equipments data={data?.equipments} />
            </Flex>}
    </>
}

export type { DataToSet };
export default Department
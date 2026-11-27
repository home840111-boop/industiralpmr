import { Box, GridItem, SimpleGrid } from "@chakra-ui/react"
import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "./Header";
import dayjs, { Dayjs } from "../../Components/Functions/dayjs";
import TotalConsumptionCard, { ChartData } from "./TotalConsumptionCard";
import {
    dateAtom,
    departmentAtom,
    departmentsAtom,
    factoriesAtom,
    isMasterAdminAtom,
    machinesAtom,
    selectedFactoryAtom,
    uidAtom,
} from "../../Components/Store/atoms";
import fetch from "./fetch";
import InventoryStatus from "./InventoryStatus";
import BreakdownPlusInsights, { InsightsData } from "./BreakdownPlusInsights";
import { ChartData as BreakdownChartData } from "./BreakdownPlusInsights";
import Listen from "../../Components/Store/hooks/Listen";
import { filterDepartmentsForView, isMasterOwner } from "../../Services/rbac";
import { Helmet } from "react-helmet";
interface SelectedTime {
    text: string,
    value: string,
    start?: Dayjs,
    end?: Dayjs
}
interface EachDay {
    date: string,
    total: number,
    materials: {
        [key: string]: {
            total: number,
            machines: {
                [key: string]: {
                    total: number,
                    name: string
                }
            }
        }
    }
}
interface Data {
    report: {
        total: number,
        days: EachDay[]
    },
    inventory: {
        available: number,
        materials: number,
        consumption: number
    },
    distribution: BreakdownChartData[],
    insights: InsightsData
}

const RawMaterials = () => {
    const [selectedTime, setSelectedTime] = useState<SelectedTime>({
        text: "",
        value: "",
        start: dayjs(),
        end: dayjs()
    });
    const [selectedDepart, setSelectedDepart] = useState<SelectedTime>({
        text: "Department",
        value: "ALL"
    });
    const [data, setData] = useState<Data | null>(null);
    const date = Listen(dateAtom);
    const factories = Listen(factoriesAtom);
    const selectedFactory = Listen(selectedFactoryAtom);
    const userDepts = Listen(departmentAtom) as string[] | null;
    const allDepartments = Listen(departmentsAtom);
    const machines = Listen(machinesAtom);
    Listen(isMasterAdminAtom);
    const uid = Listen(uidAtom);

    const mySelectedFactory = selectedFactory && factories ? (factories as any)[selectedFactory.value] : undefined;
    const hasAllDepartments = isMasterOwner(uid) || (userDepts || []).includes("all");
    const scopedDepartments = useMemo(() => (
        Object.keys(filterDepartmentsForView(allDepartments, userDepts, hasAllDepartments, mySelectedFactory, "machines"))
    ), [allDepartments, userDepts, hasAllDepartments, mySelectedFactory]);
    const scopedDepartmentsKey = scopedDepartments.join("|");

    useEffect(() => {
        if (!date) return;
        changeSelectedTime("Last 7 days");
        changeSelectedDepart("ALL")
        // eslint-disable-next-line
    }, [date]);

    const changeSelectedTime = useCallback((time: string) => {
        let start: Dayjs = dayjs();
        let end: Dayjs = dayjs();
        switch (time) {
            case "Last 7 days":
                start = dayjs().subtract(7, "day");
                end = dayjs();
                break;
            case "Last 30 days":
                start = dayjs().subtract(30, "day");
                end = dayjs();
                break;
            case "Last 90 days":
                start = dayjs().subtract(90, "day");
                end = dayjs();
                break;
        }
        setSelectedTime({
            text: time,
            value: `${start.format("MMM D, YYYY")} - ${end.format("MMM D, YYYY")}`,
            start,
            end
        });
    }, []);

    const changeSelectedDepart = useCallback((depart: string) => {
        setSelectedDepart({
            text: "Department",
            value: depart
        });
    }, []);

    useEffect(() => {
        if (selectedDepart.value !== "ALL" && !scopedDepartments.includes(selectedDepart.value)) {
            changeSelectedDepart("ALL");
        }
    }, [selectedDepart.value, scopedDepartments, changeSelectedDepart]);

    useEffect(() => {
        if (!factories || !selectedFactory || userDepts === null || machines === null) return;
        setData(null);
        fetch(
            selectedTime.start as Dayjs,
            selectedTime.end as Dayjs,
            selectedDepart.value,
            setData,
            factories,
            selectedFactory,
            scopedDepartments,
            hasAllDepartments,
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDepart, selectedTime, selectedFactory, factories, scopedDepartmentsKey, hasAllDepartments, machines]);

    const chartsData: ChartData[] = useMemo(() => {
        if (!data) return [];
        return data.report.days.map((day) => {
            return {
                day: day.date,
                value: day.total
            }
        });
    }, [data]);

    return <Box>
        <Helmet>
            <title>Raw Materials | industrialpmr</title>
        </Helmet>
        <Header
            departments={scopedDepartments}
            selectedDepart={selectedDepart}
            changeSelectedDepart={changeSelectedDepart}
            selectedTime={selectedTime}
            changeSelectedTime={changeSelectedTime}
        />
        <SimpleGrid
            w="100%"
            gap={5}
            columns={{
                base: 1,
                xl: 3
            }}>
            <TotalConsumptionCard
                loading={!data}
                total={data?.report.total || 0}
                time={selectedTime.text}
                chartsData={chartsData}
            />
            <GridItem colSpan={{
                base: 1,
                xl: 2
            }}>
                <InventoryStatus
                    loading={!data}
                    available={data?.inventory.available || 0}
                    materials={data?.inventory.materials || 0}
                    consumed={data?.inventory.consumption || 0}
                />
            </GridItem>
            <GridItem colSpan={{
                base: 1,
                xl: 3
            }}>
                <BreakdownPlusInsights
                    loading={!data}
                    chartData={data?.distribution || []}
                    insights={data?.insights || null}
                />
            </GridItem>
        </SimpleGrid>
    </Box>
}

export type { SelectedTime, Data, EachDay }
export default RawMaterials
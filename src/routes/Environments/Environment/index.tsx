import { GridItem, SimpleGrid } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { dateAtom, EnvListAtom } from "../../../Components/Store/atoms";
import Get from "../../../Components/Store/hooks/Get";
import fetch from "./fetch";
import TodayHeader from "./Today";
import { Environment as _EnvironmentData } from "..";
import NotFoundAlert from "../../../Components/micro/NotFoundAlert";
import Last7Days from "./Last7Days";
import Listen from "../../../Components/Store/hooks/Listen";
import { Helmet } from "react-helmet";

interface Hours {
    time: string;
    temperature: {
        avg: number;
        min: number;
        max: number;
    };
    humidity: {
        avg: number;
        min: number;
        max: number;
    };
}
interface EnvironmentData extends _EnvironmentData {
    hourly: Hours[] | null,
    last7Days: {
        [date: string]: _EnvironmentData["today"]
    } | null
};

const Environment = () => {
    const { environmentID } = useParams<{ environmentID: string }>();
    const [refresh, setRefresh] = useState<boolean>(false);
    const [data, setData] = useState<EnvironmentData | null | "NOT_FOUND">(null);
    const date = Listen(dateAtom);
    const envList = Get(EnvListAtom);

    useEffect(() => {
        const interval = setInterval(() => {
            setRefresh(prev => !prev);
        }, 30000);

        return () => {
            clearInterval(interval);
        }
    }, []);

    useEffect(() => {
        if (!date || !environmentID || !envList) return;
        const name = envList[environmentID];
        fetch(date, name, environmentID).then(res => {
            setData(res);
        });
    }, [date, refresh, environmentID, envList]);

    if (data === "NOT_FOUND") return <NotFoundAlert />;

    return <SimpleGrid columns={{
        base: 1,
        xl: 7
    }} gap={5}>
        <GridItem colSpan={{
            base: 1,
            xl: 5
        }}>
            <Helmet>
                <title>{data?.name || ""} | Environments | industrialpmr</title>
            </Helmet>
            <TodayHeader data={data} />
        </GridItem>
        <GridItem colSpan={{
            base: 1,
            xl: 2
        }}>
            <Last7Days data={data?.last7Days || {}} notFound={data?.last7Days === null} />
        </GridItem>
    </SimpleGrid>
}

export type { EnvironmentData, Hours };
export default Environment;
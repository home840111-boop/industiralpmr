import { Box, Flex } from "@chakra-ui/react"
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";
import { equipmentsAtom, machinesAtom, shiftsAtom } from "../../Components/Store/atoms";
import Get from "../../Components/Store/hooks/Get";
import { isMasterOwner } from "../../Services/rbac";
import Selector from "./Selector";
import { ReportSubmitType, ReportTypes, Option } from "./Selector/types";
import EnvironmentReport from "./Viewer/EnvironmentReport";
import EquipmentReport from "./Viewer/EquipmentReport";
import FactoryReport from "./Viewer/FactoryReport";
import MachineReport from "./Viewer/MachineReport";
import MainelectricityReport from "./Viewer/MainelectricityReport";
import MaterialReport from "./Viewer/MaterialReport";
import MoldReport from "./Viewer/MoldReport";
import ProductionTargetReport from "./Viewer/ProductionTargetReport";
import UnitPowerReport from "./Viewer/UnitPowerReport";
import UniversalMoldReport from "./Viewer/UniversalMoldReport";
import PowerAnalyzerReport from "./Viewer/PowerAnalyzerReport";

const Reports = () => {
    const searchParams = useSearchParams()[0];
    const reportRef = useRef<null | HTMLDivElement>(null);
    const [reportParameters, _setReportParameters] = useState<ReportSubmitType | null>(null);
    const setReportParameters = (reportParameters: ReportSubmitType) => {
        _setReportParameters(reportParameters);
        reportRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    // the last report made with the Generate button, so Back can bring it back
    // after a link (e.g. "Categorize") replaced it with a report from the URL
    const lastGeneratedRef = useRef<ReportSubmitType | null>(null);
    const generateReport = (reportParameters: ReportSubmitType) => {
        lastGeneratedRef.current = reportParameters;
        setReportParameters(reportParameters);
    };
    const machines = Get(machinesAtom);
    const equipments = Get(equipmentsAtom);
    const shifts = Get(shiftsAtom);

    useEffect(() => {
        if (!machines || !equipments || !shifts) return;
        // searchParams can have type = factory | machine | equipment | main-electricity | unit-power | environment | material | mold
        // and then, date_from (date), date_to (date), option, secondary_option
        const searchParamsObject = Object.fromEntries(searchParams.entries());
        const type = searchParamsObject.type as ReportTypes;
        if (!type) {
            // back to a plain /reports address: show the report that was generated before
            if (lastGeneratedRef.current) _setReportParameters(lastGeneratedRef.current);
            return;
        }
        const date_from = searchParamsObject.date_from as string;
        const date_to = searchParamsObject.date_to as string;
        const option = searchParamsObject.option as string;
        // const secondaryOption = searchParamsObject.secondary_option as string;
        const generated = new Date().getTime();
        const shiftsData = [{
            label: "A",
            value: "a"
        }];
        if (shifts.shifts > 1) shiftsData.push({
            label: "B",
            value: "b"
        })
        if (shifts.shifts > 2) shiftsData.push({
            label: "C",
            value: "c"
        })
        switch (type) {
            case "factory":
                setReportParameters({
                    type,
                    [type]: {
                        date: {
                            from: new Date(date_from),
                            to: new Date(date_to)
                        },
                        secondaryOption: shiftsData,
                        generated
                    }
                } as ReportSubmitType);
                break;
            case "machine":
                if (!machines[option]) return;
                setReportParameters({
                    type,
                    [type]: {
                        date: {
                            from: new Date(date_from),
                            to: new Date(date_to)
                        },
                        option: {
                            label: machines[option],
                            value: option
                        },
                        secondaryOption: shiftsData,
                        generated
                    }
                } as ReportSubmitType);
                break;
            case "equipment":
                if (!equipments[option]) return;
                setReportParameters({
                    type,
                    [type]: {
                        date: {
                            from: new Date(date_from),
                            to: new Date(date_to)
                        },
                        option: {
                            label: equipments[option],
                            value: option
                        },
                        secondaryOption: shiftsData,
                        generated
                    }
                } as ReportSubmitType);
                break;
            case "power-analyzer": {
                let optType = "";
                let optLabel = "";
                if (machines && machines[option]) {
                    optType = "machine";
                    optLabel = machines[option];
                } else if (equipments && equipments[option]) {
                    optType = "equipment";
                    optLabel = equipments[option];
                } else if (option === "MAIN" && isMasterOwner()) {
                    optType = "main";
                    optLabel = "Main Meter";
                } else {
                    return;
                }
                setReportParameters({
                    type,
                    [type]: {
                        date: {
                            from: new Date(date_from),
                            to: new Date(date_to)
                        },
                        option: {
                            label: optLabel,
                            value: option,
                            type: optType
                        },
                        generated
                    }
                } as unknown as ReportSubmitType);
                break;
            }
            default:
                break;
        }
    }, [searchParams, machines, equipments, shifts]);

    return <Flex ref={reportRef} flexDir={"column"} gap={10}>
        <Helmet>
            <title>Reports | industrialpmr</title>
        </Helmet>
        <Selector onSubmit={generateReport} />
        <Box minH="80vh" w="100%">{
            reportParameters && (
                reportParameters.type === "factory" ? <FactoryReport parameters={reportParameters[reportParameters.type]} /> :
                    reportParameters.type === "machine" ? <MachineReport parameters={reportParameters[reportParameters.type]} /> :
                        reportParameters.type === "equipment" ? <EquipmentReport parameters={reportParameters[reportParameters.type]} /> :
                            reportParameters.type === "main-electricity" ? <MainelectricityReport parameters={reportParameters[reportParameters.type]} /> :
                                reportParameters.type === "unit-power" ? <UnitPowerReport parameters={reportParameters[reportParameters.type]} /> :
                                    reportParameters.type === "environment" ? <EnvironmentReport parameters={reportParameters[reportParameters.type]} /> :
                                        reportParameters.type === "production-targets" ? <ProductionTargetReport parameters={reportParameters[reportParameters.type]} /> :
                                            reportParameters.type === "material" ? <MaterialReport parameters={reportParameters[reportParameters.type]} /> :
                                                reportParameters.type === "power-analyzer" ? <PowerAnalyzerReport parameters={reportParameters[reportParameters.type]} /> :
                                                    reportParameters.type === "mold" ?
                                                        (reportParameters[reportParameters.type].option !== null && (reportParameters[reportParameters.type].option as Option).value === "UNIVERSAL_MOLDS") ?
                                                            <UniversalMoldReport parameters={reportParameters[reportParameters.type]} />
                                                            : <MoldReport parameters={reportParameters[reportParameters.type]} />
                                                        : null
            )
        }</Box>
    </Flex>
}

export default Reports

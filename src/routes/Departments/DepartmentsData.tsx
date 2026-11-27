import { CardBody, CardHeader, IconButton, Text, useColorMode } from "@chakra-ui/react";
import { useMemo } from "react";
import { FaChevronRight } from "react-icons/fa";
import { Link } from "react-router-dom";
import { DataToSet } from ".";
import MyCard from "../../Components/micro/Card";
import Table from "../../Components/micro/Table";
import { viewAll } from "../Reports/Viewer/FactoryReport/Machine/MachineBreakdown/PieChart";

const headings = [
    "Department",
    "Supervisor",
    "Shots",
    "Production",
    "Electricity",
    "Material",
    ""
];
const DepartmentsData = ({
    data
}: {
    data?: DataToSet["departmentBreakdown"]
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const myData = useMemo(() => {
        if (data === undefined) return [];
        const Keys = Object.keys(data);
        if (Keys.length === 0 || (Keys.length === 1 && Keys[0] === "All")) return "NOT_FOUND";
        const myData = [];
        for (const department in data) {
            const { shots, production, electricity, material, supervisor } = data[department];
            myData.push([
                {
                    element: Text,
                    children: department,
                    props: {
                        fontSize: "sm",
                        fontWeight: 600
                    }
                },
                supervisor,
                viewAll(shots, "shots"),
                viewAll(production, "production"),
                viewAll(electricity, "electricity"),
                viewAll(material, "material"),
                {
                    element: Link,
                    props: {
                        to: `/departments/${department}`,
                    },
                    children: {
                        element: IconButton,
                        props: {
                            "icon-label": "Goto page",
                            icon: <FaChevronRight />,
                            size: "sm"
                        },
                    }
                }
            ]);
        }
        return myData;
    }, [data]);

    return <MyCard noPadding>
        <CardHeader
            p={2}
            borderBottom="1px solid"
            borderColor={border}>
            <Text
                fontSize="md"
                fontWeight={500}>Departments Stats</Text>
        </CardHeader>
        <CardBody p={0}>
            <Table
                headings={headings}
                notFound={myData === "NOT_FOUND"}
                rows={myData === "NOT_FOUND" ? [] : myData} />
        </CardBody>
    </MyCard>
}

export default DepartmentsData
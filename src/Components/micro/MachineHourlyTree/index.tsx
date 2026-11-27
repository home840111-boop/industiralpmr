import { Column } from 'primereact/column';
import { TreeTable } from 'primereact/treetable';
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import React, { CSSProperties } from 'react';
import { Badge, HStack, Text, useColorModeValue, VStack } from '@chakra-ui/react';
import Table from "../Table";
import { SortedHourTree } from '../../../routes/Machines/Machine/types';
import "./stylesheet.css";
import Get from '../../Store/hooks/Get';
import { factoryProductionAtom } from '../../Store/atoms';

export const lightHeaderStyle: CSSProperties = {
    padding: "5px 0",
    fontFamily: 'var(--chakra-fonts-heading)',
    fontWeight: 'var(--chakra-fontWeights-bold)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--chakra-letterSpacings-wider)',
    textAlign: 'start',
    WebkitPaddingStart: 'var(--chakra-space-6)',
    paddingInlineStart: 'var(--chakra-space-6)',
    WebkitPaddingEnd: 'var(--chakra-space-6)',
    paddingInlineEnd: 'var(--chakra-space-6)',
    paddingTop: 'var(--chakra-space-3)',
    paddingBottom: 'var(--chakra-space-3)',
    lineHeight: 'var(--chakra-lineHeights-4)',
    fontSize: 'var(--chakra-fontSizes-xs)',
    borderBottom: 'var(--chakra-borders-1px)',
    borderColor: 'var(--chakra-colors-gray-100)',
    color: 'var(--chakra-colors-light-tableHeaderColor)',
    backgroundColor: "#f3f6f9",
    wordWrap: "normal",
};
export const darkHeaderStyle: CSSProperties = {
    padding: "5px 0",
    fontFamily: 'var(--chakra-fonts-heading)',
    fontWeight: 'var(--chakra-fontWeights-bold)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--chakra-letterSpacings-wider)',
    textAlign: 'start',
    WebkitPaddingStart: 'var(--chakra-space-6)',
    paddingInlineStart: 'var(--chakra-space-6)',
    WebkitPaddingEnd: 'var(--chakra-space-6)',
    paddingInlineEnd: 'var(--chakra-space-6)',
    paddingTop: 'var(--chakra-space-3)',
    paddingBottom: 'var(--chakra-space-3)',
    lineHeight: 'var(--chakra-lineHeights-4)',
    fontSize: 'var(--chakra-fontSizes-xs)',
    borderBottom: 'var(--chakra-borders-1px)',
    borderColor: 'var(--chakra-colors-gray-700)',
    color: 'var(--chakra-colors-dark-tableHeaderColor)',
    backgroundColor: "#2c3034",
    wordWrap: "normal"
};
export const lightBodyStyle: CSSProperties = {
    fontFamily: "Poppins",
    fontSize: "14px",
};
export const darkBodyStyle: CSSProperties = {
    fontFamily: "Poppins",
    fontSize: "14px",
    backgroundColor: "#212529",
    color: "RGBA(255, 255, 255, 0.80)",
    borderColor: "#2D3748"
};

const DowntimeReasonCell: React.FC<{ node: SortedHourTree }> = ({ node }) => {
    const d = node.data;
    if (!d.downtimeReason || d.downtimeReason === "-") {
        return <Text fontSize="xs" color="gray.500">-</Text>;
    }
    const isUncat = d.downtimeReason.toLowerCase().includes("uncategorized");
    const isPlanned = !!d.isPlanned || d.downtimeReason.toLowerCase().includes("planned");

    return (
        <VStack align="start" spacing={0.5} py={1}>
            <HStack spacing={1.5} wrap="wrap">
                <Text
                    fontSize="xs"
                    fontWeight={600}
                    color={isUncat ? "red.400" : (isPlanned ? "primary" : undefined)}
                    textTransform="uppercase"
                >
                    {d.downtimeCategory || d.downtimeReason}
                </Text>
                {isPlanned && (
                    <Badge colorScheme="blue" variant="subtle" fontSize="3xs" px={1} borderRadius="sm">
                        Planned
                    </Badge>
                )}
            </HStack>
            {d.downtimeNote && d.downtimeNote !== "None" && (
                <Text fontSize="3xs" color="gray.500" noOfLines={1} title={d.downtimeNote}>
                    {d.downtimeNote}
                </Text>
            )}
        </VStack>
    );
};

const MachineHourlyTree = ({
    notFound,
    data
}: {
    notFound: boolean,
    data: SortedHourTree[]
}) => {
    const productionType = Get(factoryProductionAtom);
    const headerStyle = useColorModeValue(lightHeaderStyle, darkHeaderStyle);
    const bodyStyle = useColorModeValue(lightBodyStyle, darkBodyStyle);

    return data?.length ? <TreeTable
        scrollable
        scrollHeight='450px'
        tableStyle={{
            fontFamily: "Poppins",
            fontSize: "14px",
        }}
        value={data}>
        <Column
            bodyStyle={{
                ...bodyStyle,
                width: "200px"
            }}
            headerStyle={{
                ...headerStyle,
                width: "200px"
            }} field="time" header="Time" expander></Column>
        <Column bodyStyle={{
            ...bodyStyle,
            width: "100px"
        }} headerStyle={{
            width: "100px",
            ...headerStyle
        }} field="status" header="Status"></Column>
        {productionType === "meter" ? null : <Column bodyStyle={{
            ...bodyStyle,
            width: "100px"
        }} headerStyle={{
            width: "100px",
            ...headerStyle
        }} field="shots" header="Shot(s)"></Column>}
        <Column bodyStyle={{
            ...bodyStyle,
            width: "100px"
        }} headerStyle={{
            width: "100px",
            ...headerStyle
        }} field={productionType === "meter" ? "production_meters" : "production"} header="Prod"></Column>
        <Column bodyStyle={{
            ...bodyStyle,
            width: "100px"
        }} headerStyle={{
            width: "100px",
            ...headerStyle
        }} field="material" header="Mat. Consump"></Column>
        <Column bodyStyle={{
            ...bodyStyle,
            width: "100px"
        }} headerStyle={{
            width: "100px",
            ...headerStyle
        }} field="electricity" header="Elec. Consump"></Column>
        <Column bodyStyle={{
            ...bodyStyle,
            width: "100px"
        }} headerStyle={{
            width: "100px",
            ...headerStyle
        }} field="ontime" header="On T."></Column>
        <Column bodyStyle={{
            ...bodyStyle,
            width: "100px"
        }} headerStyle={{
            width: "100px",
            ...headerStyle
        }} field="idletime" header="IDLE T."></Column>
        <Column bodyStyle={{
            ...bodyStyle,
            width: "100px"
        }} headerStyle={{
            width: "100px",
            ...headerStyle
        }} field="offtime" header="Off T."></Column>
        <Column bodyStyle={{
            ...bodyStyle,
            width: "160px"
        }} headerStyle={{
            width: "160px",
            ...headerStyle
        }} field="downtimeReason" header="Downtime Reason" body={(node: SortedHourTree) => <DowntimeReasonCell node={node} />}></Column>
        <Column bodyStyle={{
            ...bodyStyle,
            width: "100px"
        }} headerStyle={{
            width: "100px",
            ...headerStyle
        }} field="cycleTime" header={productionType === "meter" ? "Avg. Sec/Meter" : "Avg. Cyc T."}></Column>
        <Column bodyStyle={{
            ...bodyStyle,
            width: "100px"
        }} headerStyle={{
            width: "100px",
            ...headerStyle
        }} field="operator" header="Operator"></Column>
        <Column bodyStyle={{
            ...bodyStyle,
            width: "100px"
        }} headerStyle={{
            width: "100px",
            ...headerStyle
        }} field="mold" header="Mold"></Column>
        <Column bodyStyle={{
            ...bodyStyle,
            width: "100px"
        }} headerStyle={{
            width: "100px",
            ...headerStyle
        }} field="product" header="Product"></Column>
    </TreeTable> : <Table
        h="100%"
        notFound={notFound}
        headings={[
            "Time",
            "Status",
            ...(productionType === "meter" ? [] : ["Shot(s)"]),
            "Production",
            "Mat. Consumption",
            "Elec. Consumption",
            "OnTime",
            "IDLETime",
            "OffTime",
            "Downtime Reason",
            "Avg. Cycle Time",
            "Operator",
            "Mold",
            "Product"
        ]}
        rows={[]}
    />
}

export default MachineHourlyTree;

import {
    Box,
    TableProps, useColorModeValue,
    Skeleton,
    Table,
    Thead,
    Tr,
    Th,
    Tbody,
    Td,
    Center,
    Heading,
    useColorMode,
} from '@chakra-ui/react'
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { useMemo, isValidElement } from 'react';
import { FiDatabase } from 'react-icons/fi';
import { darkBodyStyle, darkHeaderStyle, lightBodyStyle, lightHeaderStyle } from './MachineHourlyTree';

interface Props extends TableProps {
    notFound?: boolean,
    headings: (string | JSX.Element)[],
    legacy?: boolean,
    rows?: (string | number | object)[][],
    height?: string | number,
    fixHeader?: boolean,
    alignLastToLeft?: boolean,
}

const _Table = ({
    headings,
    legacy = true,
    rows,
    notFound = false,
    height = "auto",
    fixHeader = false,
    alignLastToLeft = true,
    ...props
}: Props): JSX.Element => {
    const { colorMode } = useColorMode();
    const { headBG, headColor } = useMemo(() => {
        return {
            headBG: `${colorMode}.tableHeaderBG`,
            headColor: `${colorMode}.tableHeaderColor`
        }
    }, [colorMode]);
    const headerStyle = useColorModeValue(lightHeaderStyle, darkHeaderStyle);
    const bodyStyle = useColorModeValue(lightBodyStyle, darkBodyStyle);

    const data = useMemo(() => {
        if (!rows) return [];
        const data: {
            [id: string]: string | number | JSX.Element
        }[] = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            for (let j = 0; j < row.length; j++) {
                const cell = row[j];
                const heading_id = `${headings[j]}-${j}`;
                if (isValidElement(cell)) {
                    data[i] = {
                        ...data[i],
                        [heading_id]: cell
                    }
                } else if (typeof cell === "object" && cell !== null && (cell as any).element) {
                    let _cell: any = cell;
                    data[i] = {
                        ...data[i],
                        [heading_id]: <Box
                            {..._cell.props}
                            as={_cell.element}>{
                                isValidElement(_cell.children)
                                    ? _cell.children
                                    : typeof _cell.children === "object" && _cell.children !== null && _cell.children.element
                                        ? <Box {..._cell.children.props} as={_cell.children.element}>{_cell.children.children}</Box>
                                        : _cell.children
                            }</Box>
                    }
                } else {
                    data[i] = {
                        ...data[i],
                        [heading_id]: cell as any
                    }
                }
            }
        }
        return data;
    }, [rows, headings]);

    return legacy ? <Box
        overflowX={'auto'}
        w={'100%'}>
        <Table variant='simple'
            {...props}>
            <Thead
                zIndex={fixHeader ? 1 : undefined}
                pos={fixHeader ? "absolute" : undefined}
                w={fixHeader ? "100%" : undefined}
                bgColor={headBG}>
                <Tr
                    display={fixHeader ? "flex" : undefined}
                    justifyContent={fixHeader ? "space-between" : undefined}
                    w={fixHeader ? "100%" : undefined}>
                    {headings.map((heading, i) => <Th
                        textAlign={
                            (i + 1) === headings.length && alignLastToLeft
                                ? "right"
                                : undefined
                        }
                        key={i}
                        color={headColor}>{heading}</Th>)}
                </Tr>
            </Thead>
            <Tbody
                fontSize={14}>
                {notFound ? <Tr>
                    <Td colSpan={headings.length}>
                        <Center h={"65px"} opacity={0.7}>
                            <FiDatabase size={30} />
                            <Heading
                                textTransform={"uppercase"}
                                ml={2}
                                size={"sm"}>Data not found</Heading>
                        </Center>
                    </Td>
                </Tr> : rows && rows.length !== 0 ? <>
                    {fixHeader && <Tr h={"35px"}>
                        <Td colSpan={rows.length}></Td>
                    </Tr>}
                    {rows.map((row, i) => <Tr key={i}>
                        {row.map((cell, j) => {
                            let _cell: any = cell
                            return typeof cell === "object" ?
                                _cell.element === Td ? <Box
                                    {..._cell.props}
                                    as={_cell.element}>{
                                        typeof _cell.children === "object" ? <Box
                                            {..._cell.children.props}
                                            as={_cell.children.element}>
                                            {_cell.children.children}
                                        </Box>
                                            : _cell.children
                                    }</Box>
                                    : <Td
                                        display={
                                            (j + 1) === headings.length && alignLastToLeft
                                                ? "flex"
                                                : undefined}
                                        justifyContent={
                                            (j + 1) === headings.length && alignLastToLeft
                                                ? "flex-end"
                                                : undefined}
                                        textAlign={
                                            (j + 1) === headings.length && alignLastToLeft
                                                ? "right"
                                                : undefined
                                        }
                                        key={j}>
                                        <Box
                                            {..._cell.props}
                                            as={_cell.element}>{
                                                typeof _cell.children === "object" ? <Box
                                                    {..._cell.children.props}
                                                    as={_cell.children.element}>
                                                    {_cell.children.children}
                                                </Box>
                                                    : _cell.children
                                            }</Box>
                                    </Td>
                                : <Td
                                    textAlign={
                                        (j + 1) === headings.length && alignLastToLeft
                                            ? "right"
                                            : undefined
                                    }
                                    key={j}>{cell}</Td>
                        })}
                    </Tr>)}
                </> : [...Array(5)].map((_, i) => <Tr key={i}>
                    {[...Array(headings.length)].map((_, j) => <Td key={j}><Skeleton height={6} /></Td>)}
                </Tr>)}
            </Tbody>
        </Table>
    </Box > : <DataTable
        loading={!(rows && rows.length !== 0)}
        value={data} scrollable scrollHeight="400px" virtualScrollerOptions={{ itemSize: 30, }} tableStyle={{ minWidth: '50rem', minHeight: '400px' }}>
        {headings.map((heading, i) => <Column
            bodyStyle={bodyStyle}
            headerStyle={headerStyle}
            field={`${heading}-${i}`} header={heading}></Column>)}
    </DataTable>
}

export default _Table;

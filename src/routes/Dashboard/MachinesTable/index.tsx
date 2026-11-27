import { ButtonGroup, CardBody, CardFooter, CardHeader, Flex, IconButton, Tag, Text, useColorMode, Icon, Link as ChakraLink } from "@chakra-ui/react";
import MyTooltip from "../../../Components/micro/MyTooltip";
import { useMemo, useState } from "react";
import { BsArrowLeft, BsArrowRight, BsArrowRightShort } from "react-icons/bs";
import MyCard from "../../../Components/micro/Card";
import NumberFormatter from "../../../Components/micro/NumberFormatter";
import Table from "../../../Components/micro/Table";
import UnitFormatter from "../../../Components/micro/UnitFormatter";
import WeightFormatter from "../../../Components/micro/WeightFormatter";
import dayjs from "../../../Components/Functions/dayjs";
import { Link } from "react-router-dom";
import { factoryProductionAtom } from "../../../Components/Store/atoms";
import Get from "../../../Components/Store/hooks/Get";
import LengthFormatter from "../../../Components/micro/LengthFormatter";

interface DataProps {
  machines: {
    [key: string]: any;
  };
  page: number;
}
const MachinesTable = ({
  machines,
  notFound = false
}: {
  machines: DataProps["machines"];
  notFound?: boolean;
}) => {
  const { colorMode } = useColorMode();
  const { border } = useMemo(() => {
    return {
      border: `${colorMode}.border`
    }
  }, [colorMode]);
  const [page, setPage] = useState<number>(1);
  const productionType = Get(factoryProductionAtom);

  const tableRows: any[][] | "NOT_FOUND" = useMemo(() => {
    if (notFound) return 'NOT_FOUND';
    const start = (page - 1) * 5;
    const end = start + 5;
    const rows = (Object.entries(machines).slice(start, end)).map(([machineID, stats]) => {
      const { name, mold, status, shots, production, production_meters, electricity, material, at }: {
        name: string;
        mold: string;
        status: string;
        shots: number;
        production: number;
        production_meters: number;
        electricity: number;
        material: number;
        at: number;
      } = stats || {};
      const _at = dayjs.unix(at);
      const exact = _at.format("DD-MM-YYYY HH:mm:ss");
      const since = _at.fromNow();
      return [
        {
          element: Link,
          props: {
            style: {
              fontWeight: 500
            },
            to: `/machines/${machineID}`,
          },
          children: name
        },
        {
          element: MyTooltip,
          props: {
            label: `${since} | ${exact}`,
          },
          children: {
            element: Tag,
            props: {
              // stick to right
              position: "relative",
              right: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              w: "60%",
              minW: "fit-content",
              size: "md",
              colorScheme:
                status === "ON"
                  ? "green"
                  : status === "IDLE"
                    ? "red"
                    : status === "OFF"
                      ? "yellow"
                      : "gray",
            },
            children: status,
          }
        },
        ...(productionType === "meter") ? [!isNaN(production_meters) ? {
          element: LengthFormatter,
          props: {
            number: production_meters,
            sideSize: "medium"
          }
        } : "NA"] : [!isNaN(shots) ? {
          element: NumberFormatter,
          props: {
            number: shots,
            suffix: "shot(s)",
            sideSize: "medium"
          }
        } : "NA",
        !isNaN(production) ? {
          element: NumberFormatter,
          props: {
            number: production,
            suffix: "pc(s)",
            sideSize: "medium"
          }
        } : "NA"
        ],
        !isNaN(electricity) ? {
          element: UnitFormatter,
          props: {
            number: electricity,
            sideSize: "medium"
          }
        } : "NA",
        !isNaN(material) ? {
          element: WeightFormatter,
          props: {
            number: material,
            sideSize: "medium"
          }
        } : "NA",
        mold
      ]
    });
    return rows
  }, [machines, page, notFound, productionType]);

  const totalMachines = useMemo(() => {
    if (notFound) return 0;
    return Object.keys(machines).length;
  }, [machines, notFound]);

  const changePage = (page: number) => {
    setPage(page)
  };


  const headings = ["Machines", "Status", ...(productionType === "meter" ? [] : ["shots"]), "production", "electricity consumption", "material consumption", "mold running"];

  return <MyCard
    h="100%"
    noPadding>
    <CardHeader
      display={"flex"}
      justifyContent={"space-between"}
      alignItems={"center"}
      py={4}
      borderBottom="1px solid"
      borderColor={border}>
      <Text
        fontSize="md"
        fontWeight={500}>Machines Details</Text>
      <ChakraLink
        to={"/machines"}
        as={Link}
        cursor={"pointer"}
        transition="all ease 0.2s"
        _hover={{
          opacity: 1
        }}
        textTransform="lowercase"
        opacity={0.8}
        fontSize='sm'
        fontWeight={500}
        display="flex"
        alignItems={"center"}>View All
        <Icon fontSize="xl" as={BsArrowRightShort} />
      </ChakraLink>
    </CardHeader>
    <CardBody p={0}>
      <Table
        headings={headings}
        notFound={tableRows === "NOT_FOUND"}
        rows={tableRows !== "NOT_FOUND" ? tableRows : undefined} />
    </CardBody>
    <CardFooter
      py={4}
      borderTop="1px solid"
      borderColor={border}>
      <Flex
        w="100%"
        justifyContent={"space-between"}>
        <Text fontSize={"sm"} opacity="0.7">Showing {`${((page - 1) * 5) + 1}-${(((page - 1) * 5)) + tableRows.length}`} of {totalMachines} Machines</Text>
      </Flex>
      <ButtonGroup>
        <IconButton
          aria-label="previous"
          icon={<BsArrowLeft />}
          isDisabled={page === 1}
          onClick={() => changePage(page - 1)}
          size={"xs"} />
        {/* {page !== 1 && <Button
          size={"xs"}
          cursor={"pointer"}
          onClick={() => changePage(1)}>1</Button>}
        <Button
          size={"xs"}
          cursor={"not-allowed"}
          colorScheme={"orange"}>{page}</Button>
        {page !== Math.ceil(totalMachines / 5) && <Button
          size={"xs"}
          cursor={"pointer"}
          onClick={() => changePage(Math.ceil(totalMachines / 5))}>{Math.ceil(totalMachines / 5)}</Button>} */}
        <IconButton
          aria-label="next"
          icon={<BsArrowRight />}
          isDisabled={(page * 5) >= totalMachines}
          onClick={() => changePage(page + 1)}
          size={"xs"} />
      </ButtonGroup>
    </CardFooter>
  </MyCard>
}

export default MachinesTable;
import { ButtonGroup, CardBody, CardFooter, CardHeader, Flex, IconButton, Tag, Text, useColorMode, Link as ChakraLink, Icon } from "@chakra-ui/react";
import MyTooltip from "../../../Components/micro/MyTooltip";
import { useMemo, useState } from "react";
import { BsArrowLeft, BsArrowRight, BsArrowRightShort } from "react-icons/bs";
import MyCard from "../../../Components/micro/Card";
import Table from "../../../Components/micro/Table";
import UnitFormatter from "../../../Components/micro/UnitFormatter";
import dayjs from "../../../Components/Functions/dayjs";
import { Link } from "react-router-dom";

interface equipmentProps {
  name: string;
  electricity: number;
  status: string;
  at: number;
}
interface DataProps {
  equipments: {
    [key: string]: equipmentProps;
  };
  page: number;
}
const EquipmentsTable = ({
  equipments
}: {
  equipments: DataProps["equipments"] | "NOT_FOUND";
}) => {
  const { colorMode } = useColorMode();
  const { border } = useMemo(() => {
    return {
      border: `${colorMode}.border`
    }
  }, [colorMode]);
  const [page, setPage] = useState<number>(1);
  const notFound = equipments === "NOT_FOUND";

  const tableRows: any[][] | "NOT_FOUND" = useMemo(() => {
    if (notFound) return 'NOT_FOUND';
    const start = (page - 1) * 5;
    const end = start + 5;
    const rows = (Object.entries(equipments).slice(start, end)).map(([equipmentID, stats]) => {
      const { name, at, electricity, status }: {
        name: string;
        status: string;
        electricity: number;
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
            to: `/equipments/${equipmentID}`,
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
        !isNaN(electricity) ? {
          element: UnitFormatter,
          props: {
            number: electricity,
            sideSize: "medium"
          }
        } : "NA"
      ]
    });
    return rows;
  }, [equipments, page, notFound]);

  const totalEquipments = useMemo(() => {
    if (notFound) return 0;
    return Object.keys(equipments).length;
  }, [equipments, notFound]);

  const changePage = (page: number) => {
    setPage(page)
  };


  const headings = ["Equipment", "Status", "Electricity Consumption"];

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
        fontWeight={500}>Equipments Details</Text>
      <ChakraLink
        to={"/equipments"}
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
        <Text fontSize={"sm"} opacity="0.7">Showing {`${((page - 1) * 5) + 1}-${(((page - 1) * 5)) + tableRows.length}`} of {totalEquipments} Equipments</Text>
      </Flex>
      <ButtonGroup>
        <IconButton
          aria-label="previous"
          icon={<BsArrowLeft />}
          isDisabled={page === 1}
          onClick={() => changePage(page - 1)}
          size={"xs"} />
        <IconButton
          aria-label="next"
          icon={<BsArrowRight />}
          isDisabled={(page * 5) >= totalEquipments}
          onClick={() => changePage(page + 1)}
          size={"xs"} />
      </ButtonGroup>
    </CardFooter>
  </MyCard>
}

export default EquipmentsTable;
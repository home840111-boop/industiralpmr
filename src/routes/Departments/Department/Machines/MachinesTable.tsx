import { CardBody, CardHeader, Flex, Text, useColorMode } from "@chakra-ui/react";
import { useMemo } from "react";
import MyCard from "../../../../Components/micro/Card";
import Table from "../../../../Components/micro/Table";

const MachinesTable = ({
  rows
}: {
  rows?: (string | object)[][]
}) => {
  const { colorMode } = useColorMode();
  const { border } = useMemo(() => ({
    border: `${colorMode}.border`,
  }), [colorMode]);

  return <MyCard h="100%" noPadding>
    <CardHeader
      alignItems="center"
      justifyContent="space-between"
      as={Flex}
      p={2}
      borderBottom="1px solid"
      borderColor={border}>
      <Text
        fontSize="md"
        fontWeight={500}>Machines</Text>
    </CardHeader>
    <CardBody p={0} maxH="400px" overflow={"auto"}>
      <Table
        rows={rows}
        headings={[
          "Machine",
          "Status",
          "Shots",
          "Production",
          "Material",
          "Electricity",
          "Mold"
        ]} />
    </CardBody>
  </MyCard>
}

export default MachinesTable
import { HStack, IconButton, Td, Text, Tr, useColorMode, VStack } from "@chakra-ui/react";
import { useMemo } from "react";
import { BsArrowRight } from "react-icons/bs";
import { Link } from "react-router-dom";
import { Environment } from "..";
import dayjs from "../../../Components/Functions/dayjs";
import MyTooltip from "../../../Components/micro/MyTooltip";

const EnvironmentRow = ({
  environment
}: {
  environment: Environment
}) => {
  const { colorMode } = useColorMode();
  const { hoverBG, hoverColor, border, subText, text } = useMemo(() => ({
    hoverBG: `${colorMode}.hoverBG`,
    hoverColor: `${colorMode}.hoverColor`,
    border: `${colorMode}.border`,
    subText: `${colorMode}.subText`,
    text: `${colorMode}.text`,
  }), [colorMode]);

  return <Tr
    fontWeight={600}
    _hover={{
      bg: hoverBG,
      color: hoverColor
    }}
    transition="all 0.2s ease"
    minH="100px"
    p="0 20px">
    <Td
      borderRight={"1px solid"}
      borderColor={border}>
      <HStack gap={3}>
        <VStack alignItems={"flex-start"}>
          <Text fontWeight={700} fontSize={"lg"}>
            <Link to={`/environments/${environment.id}`}>{environment.name}</Link>
          </Text>
          <Text fontSize={"xs"} fontWeight={700} color={
            environment.isOnline ? environment.isUpToDate === true ? "green" : "cadetblue" : "gray"
          }>
            <MyTooltip label={"last updated: " + dayjs.unix(environment.updated).format("DD-MM-YYYY HH:mm:ss")}>
              {`${environment.isOnline ? environment.isUpToDate === true ? "ONLINE" : environment.isUpToDate : "OFFLINE"} • ${dayjs.unix(environment.updated).fromNow(true)}`}
            </MyTooltip>
          </Text>
        </VStack>
      </HStack>
    </Td>
    <Td>
      <VStack alignItems={"flex-start"}>
        <Text
          textTransform={"uppercase"}
          color={subText}
          fontSize={"sm"}>
          Temperature: <Text
            textTransform={"lowercase"}
            as={"span"}
            ml={2}
            fontWeight={"bold"}
            color={
              environment.now.temperature > 40 ? "red" :
                environment.now.temperature > 30 ? "orange" :
                  environment.now.temperature > 20 ? "yellow" :
                    environment.now.temperature > 10 ? "green" :
                      "blue"
            }>
            {environment.now.temperature.toFixed(2)}°C
          </Text>
        </Text>
        <Text
          textTransform={"uppercase"}
          color={subText}
          fontSize={"sm"}>
          Humidity: <Text
            textTransform={"lowercase"}
            as={"span"}
            ml={2}
            fontWeight={"bold"}
            color={text}>
            {environment.now.humidity.toFixed(2)}%
          </Text>
        </Text>
      </VStack>
    </Td>
    <Td>
      <VStack alignItems={"flex-start"}>
        <Text
          textTransform={"uppercase"}
          color={subText}
          fontSize={"sm"}>
          avg: <Text
            textTransform={"lowercase"}
            as={"span"}
            ml={2}
            fontWeight={"bold"}
            color={text}>
            {environment.today.temperature.avg.toFixed(2)}°C
          </Text>
        </Text>
        <Text
          textTransform={"uppercase"}
          color={subText}
          fontSize={"sm"}>
          max: <Text
            textTransform={"lowercase"}
            as={"span"}
            ml={2}
            fontWeight={"bold"}
            color={text}>
            {environment.today.temperature.max.toFixed(2)}°C
          </Text>
        </Text>
        <Text
          textTransform={"uppercase"}
          color={subText}
          fontSize={"sm"}>
          min: <Text
            textTransform={"lowercase"}
            as={"span"}
            ml={2}
            fontWeight={"bold"}
            color={text}>
            {environment.today.temperature.min.toFixed(2)}°C
          </Text>
        </Text>
      </VStack>
    </Td>
    <Td>
      <VStack alignItems={"flex-start"}>
        <Text
          textTransform={"uppercase"}
          color={subText}
          fontSize={"sm"}>
          avg: <Text
            textTransform={"lowercase"}
            as={"span"}
            ml={2}
            fontWeight={"bold"}
            color={text}>
            {environment.today.humidity.avg.toFixed(2)}%
          </Text>
        </Text>
        <Text
          textTransform={"uppercase"}
          color={subText}
          fontSize={"sm"}>
          max: <Text
            textTransform={"lowercase"}
            as={"span"}
            ml={2}
            fontWeight={"bold"}
            color={text}>
            {environment.today.humidity.max.toFixed(2)}%
          </Text>
        </Text>
        <Text
          textTransform={"uppercase"}
          color={subText}
          fontSize={"sm"}>
          min: <Text
            textTransform={"lowercase"}
            as={"span"}
            ml={2}
            fontWeight={"bold"}
            color={text}>
            {environment.today.humidity.min.toFixed(2)}%
          </Text>
        </Text>
      </VStack>
    </Td>
    <Td>
      <IconButton
        to={`/environments/${environment.id}`}
        as={Link}
        aria-label='Goto Environment'
        icon={<BsArrowRight />} />
    </Td>
  </Tr>
}

export default EnvironmentRow
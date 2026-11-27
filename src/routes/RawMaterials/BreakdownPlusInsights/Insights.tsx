import { CardBody, CardHeader, Heading, HStack, useColorMode, VStack, Icon, Box, Progress, Text, Divider } from "@chakra-ui/react"
import { useMemo } from "react";
import { FaCogs, FaCubes } from "react-icons/fa";
import { InsightsData } from ".";
import MyCard from "../../../Components/micro/Card"
import MyTooltip from "../../../Components/micro/MyTooltip";
import WeightFormatter from "../../../Components/micro/WeightFormatter";

const Insights = ({
  insights
}: {
  insights: InsightsData | null
}) => {
  const { colorMode } = useColorMode();
  const { border, subText, bgColor } = useMemo(() => ({
    border: `${colorMode}.border`,
    subText: `${colorMode}.text`,
    bgColor: `${colorMode}.navBG`,
  }), [colorMode]);


  return <MyCard p={0}>
    <CardHeader
      borderBottom="1px solid"
      borderColor={border}
      display="flex"
      justifyContent="space-between"
      alignItems={"center"}
      p={4}>
      <Heading
        fontWeight={500}
        whiteSpace="nowrap"
        overflow={"hidden"}
        textOverflow="ellipsis"
        size="sm">Material Insights</Heading>
      <Text fontSize="sm" opacity={0.8}
        whiteSpace="nowrap"
        overflow={"hidden"}
        textOverflow="ellipsis">*Hover for more info</Text>
    </CardHeader>
    <CardBody>
      <VStack
        gap={3}
        divider={
          <Divider orientation="horizontal" />
        }>
        <HStack
          w="100%"
          gap={4}>
          <Icon
            color={subText}
            fontSize="4xl"
            as={FaCogs} />
          <MyTooltip label={<Text mt={2} opacity={0.8} fontSize={"sm"}><strong>{insights?.mostConsumingMachine.name}</strong> consumed the most material of <strong><WeightFormatter number={(insights?.mostConsumingMachine.total || 0) * 1000} /> </strong>.</Text>}>
            <Box w="100%">
              <Progress
                isIndeterminate={insights === null}
                isAnimated
                hasStripe
                h="40px"
                colorScheme="orange"
                borderRadius={'full'}
                value={insights?.mostConsumingMachine.percentage} />
              <Box fontWeight={600} bgColor={bgColor} pos="absolute" top={"80px"} left={"92px"} borderRadius={"full"} py={"2px"} px={"10px"}>{(insights?.mostConsumingMachine.percentage || 0).toFixed(2)}%</Box>
              <Text color={subText} mt={2} opacity={0.8} fontSize={"sm"} fontWeight={700}>{insights?.mostConsumingMachine.name} • <WeightFormatter number={(insights?.mostConsumingMachine.total || 0) * 1000} /></Text>
            </Box>
          </MyTooltip>
        </HStack>
        <HStack
          w="100%"
          gap={4}>
          <Icon
            color={subText}
            fontSize="4xl"
            as={FaCubes} />
          <MyTooltip label={<Text mt={2} opacity={0.8} fontSize={"sm"}><strong>{insights?.mostConsumingMaterial.name.toUpperCase()}</strong> was the most consumed material with <strong><WeightFormatter number={(insights?.mostConsumingMaterial.total || 0) * 1000} /> </strong>.</Text>}>
            <Box w="100%">
              <Progress
                isIndeterminate={insights === null}
                isAnimated
                hasStripe
                h="40px"
                colorScheme="orange"
                borderRadius={'full'}
                value={insights?.mostConsumingMaterial.percentage} />
              <Box fontWeight={600} bgColor={bgColor} pos="absolute" top={"190px"} left={"92px"} borderRadius={"full"} py={"2px"} px={"10px"}>{(insights?.mostConsumingMaterial.percentage || 0).toFixed(2)}%</Box>
              <Text color={subText} mt={2} opacity={0.8} fontSize={"sm"} fontWeight={700}>{insights?.mostConsumingMaterial.name.toUpperCase()} • <WeightFormatter number={(insights?.mostConsumingMaterial.total || 0) * 1000} /></Text>
            </Box>
          </MyTooltip>
        </HStack>
        <HStack
          w="100%"
          gap={4}>
          <Icon
            color={subText}
            fontSize="4xl"
            as={FaCubes} />
          <MyTooltip label={<Text mt={2} opacity={0.8} fontSize={"sm"}><strong>{insights?.mostConsumingDay.name.toUpperCase()}</strong> was the most consuming day with <strong><WeightFormatter number={(insights?.mostConsumingDay.total || 0) * 1000} /> </strong>.</Text>}>
            <Box w="100%">
              <Progress
                isIndeterminate={insights === null}
                isAnimated
                hasStripe
                h="40px"
                colorScheme="orange"
                borderRadius={'full'}
                value={insights?.mostConsumingDay.percentage} />
              <Box fontWeight={600} bgColor={bgColor} pos="absolute" top={"300px"} left={"92px"} borderRadius={"full"} py={"2px"} px={"10px"}>{(insights?.mostConsumingDay.percentage || 0).toFixed(2)}%</Box>
              <Text color={subText} mt={2} opacity={0.8} fontSize={"sm"} fontWeight={700}>{insights?.mostConsumingDay.name.toUpperCase()} • <WeightFormatter number={(insights?.mostConsumingDay.total || 0) * 1000} /></Text>
            </Box>
          </MyTooltip>
        </HStack>
      </VStack>
    </CardBody>
  </MyCard>
}

export default Insights
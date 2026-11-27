import { Center, CircularProgress, CircularProgressLabel, Icon, Text, useColorMode, VStack } from "@chakra-ui/react";
import { DataToSet } from "..";
import MyTooltip from "../../../../Components/micro/MyTooltip";
import { useMemo } from "react";
import dayjs from "../../../../Components/Functions/dayjs";
import IsScreenSmall from "../../../../Components/Store/hooks/IsScreenSmall";
import { FiCheckCircle } from "react-icons/fi";

const ProjectedCompletion = ({
    data,
}: {
    data: DataToSet;
}) => {
    const { colorMode } = useColorMode();
    const { subText } = useMemo(() => ({
        subText: `${colorMode}.subText`,
    }), [colorMode]);
    const isBelow1400 = IsScreenSmall(1400);

    const isTargetReached =
        data.progress.total > 0 && data.progress.current >= data.progress.total;

    const efficiency = useMemo(() => {
        if (isTargetReached) return 100;
        if (data.progress.total === 0) return 0;
        if (data.target.due === null) return 100;
        const start = data.target.started;
        const now = dayjs().unix() - start;
        const dueTime =
            data.target.due === null
                ? dayjs(data.target.due).unix()
                : data.timing.projectedEndTime - start;
        if (dueTime <= 0) return 0;
        return Math.min(100, Math.max(0, (now / dueTime) * 100));
    }, [data, isTargetReached]);

    const projectedEndText = useMemo(() => {
        if (!data.timing.projectedEndTime) return "Calculating...";
        const diffSec = dayjs.unix(data.timing.projectedEndTime).diff(dayjs(), "second");
        if (diffSec <= 0) return "Anytime now";
        return dayjs.unix(data.timing.projectedEndTime).fromNow();
    }, [data.timing.projectedEndTime]);

    return (
        <VStack w="100%" spacing={1} alignItems="center">
            <Text
                textAlign="center"
                fontSize="xs"
                textTransform="uppercase"
                opacity={0.8}
                mb={1}
                fontWeight={700}
            >
                Completion Timeline
            </Text>
            <Center>
                <CircularProgress
                    thickness="6px"
                    rounded="full"
                    size={isBelow1400 ? "180px" : "210px"}
                    value={efficiency}
                    color={
                        isTargetReached
                            ? "green.400"
                            : data.progress.track > 0
                            ? "green.400"
                            : data.progress.track < -1800
                            ? "red.400"
                            : "orange.400"
                    }
                    trackColor="#cccccc30"
                    capIsRound
                >
                    <CircularProgressLabel>
                        {isTargetReached ? (
                            <VStack spacing={0.5} px={2}>
                                <Icon as={FiCheckCircle} color="green.400" fontSize="lg" />
                                <Text fontSize="xs" fontWeight={700} color="green.400" lineHeight={1.2}>
                                    TARGET REACHED
                                </Text>
                                <Text fontSize="3xs" color={subText} textTransform="uppercase">
                                    {data.progress.current} / {data.progress.total} pcs
                                </Text>
                                {data.target.sapOrder ? (
                                    <Text fontSize="3xs" color="purple.400" fontWeight={600}>
                                        Manual End Required
                                    </Text>
                                ) : (
                                    <Text fontSize="3xs" color="gray.400">
                                        Goal Achieved
                                    </Text>
                                )}
                            </VStack>
                        ) : (
                            <VStack spacing={0.5} px={2}>
                                <Text fontSize="2xs" fontWeight={600} lineHeight={1.2}>
                                    {data.target.started ? (
                                        <MyTooltip label={dayjs.unix(data.target.started).format("Do MMM HH:mm A")}>
                                            {dayjs.unix(data.target.started).fromNow()}
                                        </MyTooltip>
                                    ) : (
                                        "Not Started"
                                    )}
                                    <Text color={subText} textTransform="uppercase" fontSize="3xs">
                                        Started
                                    </Text>
                                </Text>
                                <Text fontSize="sm" fontWeight={700} lineHeight={1.2} color="orange.400">
                                    <MyTooltip
                                        label={
                                            data.timing.projectedEndTime
                                                ? dayjs.unix(data.timing.projectedEndTime).format("Do MMM HH:mm A")
                                                : "Calculating"
                                        }
                                    >
                                        {projectedEndText}
                                    </MyTooltip>
                                    <Text color={subText} textTransform="uppercase" fontSize="3xs">
                                        Expected End
                                    </Text>
                                </Text>
                                <Text fontSize="2xs" fontWeight={600} lineHeight={1.2}>
                                    {data.target.due ? (
                                        <MyTooltip label={dayjs(data.target.due).format("Do MMM HH:mm A")}>
                                            {dayjs(data.target.due).fromNow()}
                                        </MyTooltip>
                                    ) : (
                                        "No Due Set"
                                    )}
                                    <Text color={subText} textTransform="uppercase" fontSize="3xs">
                                        Due Set
                                    </Text>
                                </Text>
                            </VStack>
                        )}
                    </CircularProgressLabel>
                </CircularProgress>
            </Center>
        </VStack>
    );
};

export default ProjectedCompletion
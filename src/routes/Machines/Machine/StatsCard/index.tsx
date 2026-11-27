import { SimpleGrid, Tag, Icon, Text } from "@chakra-ui/react";
import { BsFillGearFill } from "react-icons/bs";
import { FaBoxes, FaCubes } from "react-icons/fa";
import { HiLightningBolt } from "react-icons/hi";
import { FiTarget } from "react-icons/fi";
import { Link } from "react-router-dom";
import Stat from "./Stat";
import { returnType } from "../types";
import Get from "../../../../Components/Store/hooks/Get";
import { factoryProductionAtom } from "../../../../Components/Store/atoms";

const StatsCard = ({
    total,
    notFound,
    isPowerAnalyzer = false,
    machineID,
}: {
    total: returnType["report"]["total"] | null,
    notFound: boolean,
    isPowerAnalyzer?: boolean,
    machineID?: string,
}) => {
    const productionType = Get(factoryProductionAtom);

    return <SimpleGrid w="100%" gap={5} columns={{
        base: 1,
        md: productionType === "meter" ? 1 : 2,
        xl: productionType === "meter" ? 3 : 4
    }}>
        {productionType === "meter" ? <Stat
            title={"Production"}
            value={total?.production_meters.value === undefined ? -1 : total?.production_meters.value}
            icon={FaBoxes}
            change={total?.production_meters.change}
            format="meter"
            notFound={notFound}
            actionBadge={machineID ? (
                <Tag
                    as={Link}
                    to={`/targets/${machineID}`}
                    size="sm"
                    colorScheme="orange"
                    variant="subtle"
                    cursor="pointer"
                    borderRadius="full"
                    transition="all 0.2s"
                    _hover={{ transform: "scale(1.05)", shadow: "xs" }}
                >
                    <Icon as={FiTarget} mr={0.5} />
                    <Text fontSize="2xs" fontWeight={700}>Targets &rarr;</Text>
                </Tag>
            ) : undefined}
        /> : <>
            <Stat
                title={"Shots"}
                value={total?.shots.value === undefined ? -1 : total?.shots.value}
                icon={BsFillGearFill}
                change={total?.shots.change}
                format="shots"
                notFound={notFound}
            />
            <Stat
                title={"Production"}
                value={total?.production.value === undefined ? -1 : total?.production.value}
                icon={FaBoxes}
                change={total?.production.change}
                format="pieces"
                notFound={notFound}
                actionBadge={machineID ? (
                    <Tag
                        as={Link}
                        to={`/targets/${machineID}`}
                        size="sm"
                        colorScheme="orange"
                        variant="subtle"
                        cursor="pointer"
                        borderRadius="full"
                        transition="all 0.2s"
                        _hover={{ transform: "scale(1.05)", shadow: "xs" }}
                    >
                        <Icon as={FiTarget} mr={0.5} />
                        <Text fontSize="2xs" fontWeight={700}>Targets &rarr;</Text>
                    </Tag>
                ) : undefined}
            />
        </>}
        <Stat
            format={"units"}
            title={"Electricity"}
            value={total?.electricity.value === undefined ? -1 : total?.electricity.value}
            icon={HiLightningBolt}
            change={total?.electricity.change}
            changeInverse={true}
            notFound={notFound}
            actionBadge={isPowerAnalyzer && machineID ? (
                <Tag
                    as={Link}
                    to={`/machines/${machineID}/power`}
                    size="sm"
                    colorScheme="yellow"
                    variant="subtle"
                    cursor="pointer"
                    borderRadius="full"
                    transition="all 0.2s"
                    _hover={{ transform: "scale(1.05)", shadow: "xs" }}
                >
                    <Icon as={HiLightningBolt} mr={0.5} />
                    <Text fontSize="2xs" fontWeight={700}>Power Analyzer &rarr;</Text>
                </Tag>
            ) : undefined}
        />
        <Stat
            format={"weight"}
            title={"material"}
            value={total?.material.value === undefined ? -1 : total?.material.value}
            icon={FaCubes}
            change={total?.material.change}
            notFound={notFound}
        />
    </SimpleGrid>
}

export default StatsCard;
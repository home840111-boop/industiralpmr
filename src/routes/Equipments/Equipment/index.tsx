import { GridItem, SimpleGrid, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";
import NotFoundAlert from "../../../Components/micro/NotFoundAlert";
import { dateAtom } from "../../../Components/Store/atoms";
import Listen from "../../../Components/Store/hooks/Listen";
import EquipmentDetails from "./EquipmentDetails";
import fetch from "./fetch";
import HourlyCard from "./HourlyCard";

type Status = "ON" | "OFF" | "IDLE" | "NA"
interface equipmentDetailsType {
  name: string,
  status: Status,
  statusSince: number,
  unit: number,
  lastUpdated: number,
  isUpToDate: true | string,
}
interface Hour {
  time: string,
  electricity: number,
  ontime: number,
}
interface Report {
  total: {
    electricity: number,
    sessions: number,
    ontime: number,
  },
  hours: Hour[],
  hourlyStats: {
    best: {
      electricity: string,
      ontime: string,
    }
    worst: {
      electricity: string,
      ontime: string,
    },
    average: {
      electricity: number,
      ontime: number,
    }
  }
}
interface foundType {
  equipment: boolean;
  report: boolean;
}

const Equipment = () => {
  const { equipmentID } = useParams<{ equipmentID: string }>();
  const [refresh, setRefresh] = useState<boolean>(false);
  const [foundStatus, setFoundStatus] = useState<foundType>({
    equipment: true,
    report: true
  });
  const [equipmentDetails, setEquipmentDetails] = useState<equipmentDetailsType | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const date = Listen(dateAtom);

  useEffect(() => {
    // set to loading state
    setFoundStatus({
      equipment: true,
      report: true
    });
    setEquipmentDetails(null);
    setReport(null);
  }, [equipmentID]);

  useEffect(() => {
    if (!date || !equipmentID) return;
    fetch(date, equipmentID).then(data => {
      if (!data.equipmentFound) {
        setFoundStatus(prev => ({
          ...prev,
          equipment: false
        }));
      } else if (!data.reportFound) {
        setFoundStatus(prev => ({
          ...prev,
          report: false
        }));
      }
      setEquipmentDetails(data.equipmentDetails);
      setReport(data.report);
    }).catch(err => {
      console.log(err);
    })
  }, [date, refresh, equipmentID]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefresh(prev => !prev);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!foundStatus.equipment) return <NotFoundAlert
    title="No Equipment found!"
    description="No Equipment found with this ID, please go back to homepage and try again or contact support if issue persists." />

  return <SimpleGrid w="100%" columns={{
    base: 1,
    lg: 4,
  }} gap={5}>
    <Helmet>
      <title>{equipmentDetails?.name || ""} | Equipments | industrialpmr</title>
    </Helmet>
    <GridItem>
      <EquipmentDetails
        report={report}
        details={equipmentDetails}
      />
    </GridItem>
    <GridItem colSpan={{
      base: 1,
      lg: 3
    }}>
      <VStack gap={5} h={"100%"}>
        <HourlyCard notFound={!foundStatus.report} hours={report?.hours || null} hourlyStats={report?.hourlyStats || null} status={equipmentDetails?.status} />
      </VStack>
    </GridItem>
  </SimpleGrid>
}

export type { equipmentDetailsType, foundType, Report, Hour, Status };
export default Equipment;
import {
  ColorProps,
  Flex,
  ModalBody,
  ModalCloseButton,
  ModalHeader,
  Text,
  useDisclosure,
  Box,
  Icon,
  useColorModeValue,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from "@chakra-ui/react";
import { cloneElement, useEffect, useState, useCallback } from "react";
import MyModal from "../../../Components/micro/MyModal";
import BackdropLoader from "../../../Components/Loaders/BackdropLoader";
import { activityType, DeviveInfo } from "../../../Components/micro/logger";
import { get, query } from "../../../Components/firebase/api/db";
import { IconType } from "react-icons";
import NotFound from "../../../Components/micro/NotFound";
import {
  FiActivity,
  FiEdit3,
  FiPlusSquare,
  FiUserMinus,
  FiUserPlus,
  FiInfo,
} from "react-icons/fi";
import dayjs from "../../../Components/Functions/dayjs";

const humanizeMappings = {
  "off_time_based_efficiency": "Efficiency Calculation Method",
  "shift_a_hours": "shift_a_hours",
  "shift_a_start": "shift_a_start",
  "shift_b_hours": "shift_b_hours",
  "shift_b_start": "shift_b_start",
  "shift_c_hours": "shift_c_hours",
  "shift_c_start": "shift_c_start",
  valueMappings: {
    off_time_based_efficiency: {
      "true": "Time-based",
      "false": "Production-based"
    }
  }
};

function formatSecondsToHours(seconds: number): string {
  const hours = seconds / 3600;
  if (hours === 1) return "1 hour";
  return `${hours} hours`;
}

function formatSecondsToTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = (hours % 12) || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

type DBLogs = {
  activity: activityType;
  timestamp: number;
  deviceInfo: DeviveInfo;
  data: any;
};

interface DataToSet {
  name: string;
  totalActivity: number;
  logs: {
    logo: IconType;
    title: string;
    date: string;
    color: ColorProps["color"];
    details?: any;
  }[];
}

type MachineDoc = { model?: string; machine_model?: string; name?: string };

const ActivityModal = ({
  uid,
  allowedUids,
  children,
}: {
  uid: "all" | string;
  allowedUids?: string[];
  children: JSX.Element;
}) => {
  const { isOpen, onClose, onOpen } = useDisclosure();
  const btn = cloneElement(children as JSX.Element, {
    ...children.props,
    onClick: onOpen,
  });

  const [data, setData] = useState<DataToSet | null>(null);

  const [machineNameById, setMachineNameById] = useState<Record<string, string>>({});

  async function fetchMachineModelForId(id: string): Promise<string> {
    try {
      const snap = await get(`machines/${id}`);
      const val = snap?.val?.() ?? snap?.val?.();
      if (val) {
        const doc = val as MachineDoc;
        return (
          doc?.model?.toString() ??
          doc?.machine_model?.toString() ??
          doc?.name?.toString() ??
          id
        );
      }
    } catch {
    }
    try {
      const snap = await get(`machine/${id}`);
      const val = snap?.val?.() ?? snap?.val?.();
      if (val) {
        const doc = val as MachineDoc;
        return (
          doc?.model?.toString() ??
          doc?.machine_model?.toString() ??
          doc?.name?.toString() ??
          id
        );
      }
    } catch {
    }
    return id;
  }

  const loadMachineModels = useCallback(async (ids: Set<string>) => {
    if (!ids.size) {
      setMachineNameById({});
      return;
    }
    const entries = await Promise.all(
      Array.from(ids).map(async (id) => {
        try {
          const name = await fetchMachineModelForId(id);
          return [id, name] as const;
        } catch {
          return [id, id] as const;
        }
      })
    );
    setMachineNameById(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setData(null);

    const func = async () => {
      const machineIds = new Set<string>();

      if (uid === "all") {
        const [usersSnap, snap] = await Promise.all([
          get("sub-users"),
          query("logs"),
        ]);

        const users = Object.fromEntries(
          Object.entries(usersSnap.val() ?? {}).map(([uid, data]) => [
            uid as string,
            `${(data as any).name} (${(data as any).email})`,
          ])
        ) as {
          [uid: string]: string;
        };

        const dataAll = snap.val() as {
          [uid: string]: {
            [key: string]: DBLogs;
          };
        };

        const dataToSet: DataToSet = {
          name: "All",
          totalActivity: 0,
          logs: [],
        };

        for (const userId in dataAll) {
          if (allowedUids && !allowedUids.includes(userId)) continue;
          const userName = users[userId] ?? "Master User";
          const userLogs = dataAll[userId];
          for (const key in userLogs) {
            dataToSet.totalActivity++;
            const activity = userLogs[key];

            const mId = activity?.data?.machineID;
            if (mId != null) machineIds.add(String(mId));

            dataToSet.logs.push(
              activitySwitch(activity.activity, activity.timestamp, userName, activity.data)
            );
          }
        }

        dataToSet.logs.sort((a, b) => {
          return dayjs(b.date).unix() - dayjs(a.date).unix();
        });

        setData(dataToSet);
      } else {
        const [userSnap, snap] = await Promise.all([
          get(`sub-users/${uid}`),
          get(`logs/${uid}`),
        ]);

        const user = userSnap.val() as {
          name: string;
          email: string;
        };

        const dataUser = snap.val() as {
          [key: string]: DBLogs;
        };

        const dataToSet: DataToSet = {
          name: `${user.name} (${user.email})`,
          totalActivity: 0,
          logs: [],
        };

        for (const key in dataUser) {
          dataToSet.totalActivity++;
          const activity = dataUser[key];

          const mId = activity?.data?.machineID;
          if (mId != null) machineIds.add(String(mId));

          dataToSet.logs.push(
            activitySwitch(activity.activity, activity.timestamp, user.name, activity.data)
          );
        }

        dataToSet.logs.sort((a, b) => {
          return dayjs(b.date).unix() - dayjs(a.date).unix();
        });

        setData(dataToSet);
      }

      try {
        await loadMachineModels(machineIds);
      } catch (e) {
        console.error("Failed to load machine models", e);
      }
    };

    try {
      func();
    } catch (err) {
      console.error(err);
      onClose();
    }
  }, [uid, isOpen, onClose, loadMachineModels, allowedUids]);

  return data === null && isOpen ? (
    <BackdropLoader text={"Loading logs"} />
  ) : (
    <>
      {btn}
      {data !== null && (
        <MyModal size={"xl"} isOpen={isOpen} onClose={onClose}>
          <ModalHeader>
            <Flex direction="column">
              <Text fontSize="lg" fontWeight="bold" pb=".5rem">
                {data.name} user activity
              </Text>
              <Text fontSize="sm" opacity={0.8} fontWeight="normal">
                <Text fontWeight="bold" as="span" color="primary">
                  {data.totalActivity}
                </Text>{" "}
                activities
              </Text>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody ps="26px" pe="0px" mb="31px" position="relative">
            <Flex direction="column">
              {data.logs.length ? (
                data.logs.map((row, index, arr) => {
                  return (
                    <TimelineRow
                      key={index}
                      logo={row.logo}
                      title={row.title}
                      date={row.date}
                      color={row.color}
                      details={row.details}
                      index={index}
                      arrLength={arr.length}
                      machineNameById={machineNameById}
                    />
                  );
                })
              ) : (
                <NotFound icon={FiActivity} text="No Activity Found." />
              )}
            </Flex>
          </ModalBody>
        </MyModal>
      )}
    </>
  );
};

function TimelineRow({
  logo,
  title,
  date,
  color,
  details,
  index,
  arrLength,
  machineNameById,
}: {
  logo: IconType;
  title: string;
  date: string;
  color: ColorProps["color"];
  details?: any;
  index: number;
  arrLength: number;
  machineNameById?: Record<string, string>;
}) {
  const textColor = useColorModeValue('gray.700', 'white.300');
  const detailColor = useColorModeValue('gray.500', 'gray.400');
  const [isExpanded, setIsExpanded] = useState(false);

  const humanizeValue = (key: string, value: any): string => {
    const valueMappings = humanizeMappings.valueMappings as Record<string, Record<string, string>>;
    if (key in valueMappings) {
      const mapping = valueMappings[key];
      const stringValue = String(value);
      if (stringValue in mapping) {
        return mapping[stringValue];
      }
    }
    if (typeof value === 'number') {
      if (key.toLowerCase().includes('hour') || key.toLowerCase().includes('duration')) {
        return formatSecondsToHours(value);
      }
      if (key.toLowerCase().includes('start')) {
        return formatSecondsToTime(value);
      }
    }
    if (value === "Not Set") return "Not Set";
    if (value === "false") return "No";
    if (value === "true") return "Yes";
    return String(value);
  };

  const renderNestedDetails = (obj: any, level = 0) => {
    if (!obj || typeof obj !== 'object') {
      return (
        <Text fontSize="xs" color={detailColor} pl={`${level * 12}px`}>
          {String(obj)}
        </Text>
      );
    }

    const sortedEntries = Object.entries(obj).sort(([keyA], [keyB]) => {
      if (keyA === "machineID") return -1;
      if (keyB === "machineID") return 1;
      if (keyA === "data") return -1;
      if (keyB === "data") return 1;
      return 0;
    });

    let localMachineId: string | null = null;

    return sortedEntries.map(([key, value]) => {
      const displayKey = (key === "machineID")
        ? "MACHINE-NAME"
        : (key === "data")
          ? "DATA"
          : (humanizeMappings[key as keyof typeof humanizeMappings] as string) || key;

      const isBold = key === "machineID" || key === "data";

      if (key === "machineID") {
        localMachineId = String(value);
        const modelFromMap =
          (localMachineId && machineNameById?.[localMachineId]) ??
          humanizeValue(key, value);

        return (
          <Box key={key} pl={`${level * 12}px`}>
            <Text fontSize="xs" color={detailColor}>
              <Text as="span" fontWeight={isBold ? "bold" : "medium"}>
                {displayKey}:
              </Text>{" "}
              {modelFromMap}
            </Text>
          </Box>
        );
      }

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (key === "data") {
          return (
            <Box key={key} pl={`${level * 12}px`}>
              <Text fontSize="xs" color={detailColor} fontWeight={isBold ? "bold" : "medium"}>
                {displayKey}:
              </Text>

              {localMachineId !== null && (
                <Box pl={`${(level + 1) * 12}px`} key={`${key}__machine-id`}>
                  <Text fontSize="xs" color={detailColor}>
                    <Text as="span" fontWeight="medium">machine-id:</Text>{" "}
                    {localMachineId}
                  </Text>
                </Box>
              )}

              {renderNestedDetails(value, level + 1)}
            </Box>
          );
        }

        return (
          <Box key={key} pl={`${level * 12}px`}>
            <Text fontSize="xs" color={detailColor} fontWeight={isBold ? "bold" : "medium"}>
              {displayKey}:
            </Text>
            {renderNestedDetails(value, level + 1)}
          </Box>
        );
      } else if (Array.isArray(value)) {
        return (
          <Box key={key} pl={`${level * 12}px`}>
            <Text fontSize="xs" color={detailColor} fontWeight={isBold ? "bold" : "medium"}>
              {displayKey}:
            </Text>
            {value.map((item, i) => (
              <Box key={i} pl={`${(level + 1) * 12}px`}>
                {renderNestedDetails(item, level + 2)}
              </Box>
            ))}
          </Box>
        );
      } else {
        const humanizedValue = humanizeValue(key, value);
        return (
          <Box key={key} pl={`${level * 12}px`}>
            <Text fontSize="xs" color={detailColor}>
              <Text as="span" fontWeight={isBold ? "bold" : "medium"}>{displayKey}:</Text>{" "}
              {humanizedValue}
            </Text>
          </Box>
        );
      }
    });
  };

  return (
    <Flex alignItems='flex-start' justifyContent='start' mb='5px' position="relative">
      <Box
        position="absolute"
        left="15px"
        top="30px"
        bottom={index === arrLength - 1 ? "15px" : "0"}
        w="2px"
        bg="gray.300"
        zIndex="0"
      />
      <Box position="relative" zIndex="1" mr={4}>
        <Icon
          as={logo}
          color={color}
          h={'30px'}
          w={'30px'}
        />
      </Box>
      <Box position="relative" zIndex="1" flex="1">
        <Text fontSize="md" color={textColor} fontWeight={500} mb={1}>
          {title}
        </Text>
        <Text fontSize="sm" color='gray.400' fontWeight='normal' mb={details ? 2 : 0}>
          {date}
        </Text>
        {details && (
          <Accordion allowToggle width="100%" onChange={() => setIsExpanded(!isExpanded)}>
            <AccordionItem border="none">
              <AccordionButton p={0} _hover={{ bg: 'transparent' }} width="fit-content">
                <Flex align="center">
                  <Icon as={FiInfo} mr={1} color={detailColor} boxSize={3} />
                  <Text fontSize="xs" color={detailColor} fontWeight="medium">
                    Extra Details
                  </Text>
                  <AccordionIcon ml={1} color={detailColor} />
                </Flex>
              </AccordionButton>
              <AccordionPanel p={0} mt={2} pl={4}>
                {renderNestedDetails(details)}
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        )}
      </Box>
    </Flex>
  );
}

const activityMap: Record<activityType, {
  color: ColorProps["color"];
  logo: IconType;
  title: (userName: string) => string;
}> = {
  "add-department": { color: "green", logo: FiPlusSquare, title: user => `${user} added department` },
  "add-user": { color: "green", logo: FiUserPlus, title: user => `${user} added user` },
  "update-user": { color: "orange", logo: FiEdit3, title: user => `${user} updated user` },
  "delete-user": { color: "red", logo: FiUserMinus, title: user => `${user} deleted user` },
  "delete-department": { color: "red", logo: FiUserMinus, title: user => `${user} deleted department` },
  "update-department": { color: "orange", logo: FiEdit3, title: user => `${user} updated department` },
  "add-material": { color: "green", logo: FiPlusSquare, title: user => `${user} added material` },
  "update-material": { color: "orange", logo: FiEdit3, title: user => `${user} updated material` },
  "delete-material": { color: "red", logo: FiUserMinus, title: user => `${user} deleted material` },
  "add-mold": { color: "green", logo: FiPlusSquare, title: user => `${user} added mold` },
  "delete-mold": { color: "red", logo: FiUserMinus, title: user => `${user} deleted mold` },
  "install-mold": { color: "green", logo: FiPlusSquare, title: user => `${user} installed mold` },
  "update-equipment": { color: "orange", logo: FiEdit3, title: user => `${user} updated equipment` },
  "update-info": { color: "orange", logo: FiEdit3, title: user => `${user} updated info` },
  "update-machine": { color: "orange", logo: FiEdit3, title: user => `${user} updated machine` },
};

const activitySwitch = (
  activity: activityType,
  timestamp: number,
  userName: string,
  data: any
): DataToSet["logs"][0] => {
  const date = timestamp
    ? dayjs.unix(timestamp / 1000).format("DD MMM YYYY, HH:mm")
    : "No Timestamp";
  const defaultEntry = {
    color: "primary",
    logo: FiActivity,
    title: `${userName} ${activity}`,
  };
  const mapped = activityMap[activity] || defaultEntry;
  return {
    color: mapped.color,
    logo: mapped.logo,
    title: mapped.title(userName),
    date,
    details: data,
  };
};

export default ActivityModal;
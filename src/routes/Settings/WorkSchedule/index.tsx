import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Center,
  Flex,
  FormControl,
  FormLabel,
  GridItem,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  useColorMode,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { FiChevronLeft, FiChevronRight, FiClock, FiCopy, FiSave } from "react-icons/fi";
import { PrimaryBtn } from "../../../Components/Buttons";
import dayjs from "../../../Components/Functions/dayjs";
import { PrimaryInput } from "../../../Components/Inputs";
import PrimaryNumberInput from "../../../Components/Inputs/PrimaryNumberInput";
import PrimarySelect from "../../../Components/Inputs/PrimarySelect";
import SearchableSelector from "../../../Components/Inputs/SearchableSelector";
import { SmallFill } from "../../../Components/Loaders";
import BackdropLoader from "../../../Components/Loaders/BackdropLoader";
import MyCard from "../../../Components/micro/Card";
import ConfirmDialog from "../../../Components/micro/ConfirmDialog";
import NotFound from "../../../Components/micro/NotFound";
import {
  dateAtom,
  departmentAtom,
  departmentsAtom,
  factoriesAtom,
  isMasterAdminAtom,
  machinesAtom,
  roleAtom,
  selectedFactoryAtom,
  uidAtom,
} from "../../../Components/Store/atoms";
import Listen from "../../../Components/Store/hooks/Listen";
import { filterDepartmentsForView, getScopedAssetMap, isMasterOwner, toIdArray } from "../../../Services/rbac";
import {
  canEditWorkSchedule,
  clampHours,
  DAY_KEYS,
  DAY_LABELS,
  DayKey,
  DEFAULT_WEEKLY_TEMPLATE,
  getMondayOfWeek,
  resolveDaySchedule,
  saveWorkScheduleVersion,
  useWorkSchedules,
  WeeklyTemplate,
} from "../../../Services/workSchedule";

type UnitMode = "shifts" | "hours";
type ApplyScope = "single" | "department" | "all";

const formatVal = (hours: number, mode: UnitMode): string => {
  if (hours === 0) return "Off";
  return mode === "shifts" ? `${+(hours / 8).toFixed(2)} sh` : `${hours}h`;
};

const formatCompactTemplate = (tpl: WeeklyTemplate, mode: UnitMode): string => {
  const groups: { start: DayKey; end: DayKey; val: string }[] = [];
  for (const dayKey of DAY_KEYS) {
    const val = formatVal(tpl[dayKey] ?? 24, mode);
    const last = groups[groups.length - 1];
    if (last && last.val === val) {
      last.end = dayKey;
    } else {
      groups.push({ start: dayKey, end: dayKey, val });
    }
  }
  if (groups.length === 1) {
    return `All days: ${groups[0].val}`;
  }
  return groups
    .map((g) => (g.start === g.end ? `${g.start}: ${g.val}` : `${g.start}–${g.end}: ${g.val}`))
    .join(" · ");
};

const WorkSchedule: React.FC = () => {
  const toast = useToast();
  const { colorMode } = useColorMode();
  const { text, subText, border } = useMemo(
    () => ({
      text: `${colorMode}.text`,
      subText: `${colorMode}.subText`,
      border: `${colorMode}.border`,
    }),
    [colorMode],
  );

  const machinesMapRaw = Listen(machinesAtom);
  const machinesMap = useMemo(() => machinesMapRaw || {}, [machinesMapRaw]);
  const departmentsRaw = Listen(departmentsAtom);
  const userDepts = Listen(departmentAtom) as string[] | null;
  const factories = Listen(factoriesAtom) as any[] | null;
  const selectedFactory = Listen(selectedFactoryAtom);
  const factoryDate = Listen(dateAtom);
  const uid = Listen(uidAtom);
  Listen(roleAtom);
  Listen(isMasterAdminAtom);
  const canEdit = canEditWorkSchedule();

  const todayStr = factoryDate || dayjs().format("YYYY-MM-DD");
  const todayMonday = getMondayOfWeek(todayStr);

  const mySelectedFactory =
    factories && selectedFactory ? factories[selectedFactory.value] : undefined;
  const hasAllDepts = isMasterOwner(uid) || (userDepts || []).includes("all");
  const departments = useMemo(
    () =>
      filterDepartmentsForView(
        departmentsRaw,
        userDepts,
        hasAllDepts,
        mySelectedFactory,
        "machines",
      ),
    [departmentsRaw, userDepts, hasAllDepts, mySelectedFactory],
  );

  const allowedMachineEntries = useMemo(
    () => Object.entries(getScopedAssetMap(machinesMapRaw, mySelectedFactory, "machines")),
    [machinesMapRaw, mySelectedFactory],
  );

  const [selectedMachineId, setSelectedMachineId] = useState<string>(
    () => allowedMachineEntries[0]?.[0] || "",
  );
  const [applyScope, setApplyScope] = useState<ApplyScope>("single");
  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    () => Object.keys(departments)[0] || "ALL",
  );
  const [weekMonday, setWeekMonday] = useState<string>(() => getMondayOfWeek(todayStr));
  const userPickedWeekRef = useRef(false);
  const [unitMode, setUnitMode] = useState<UnitMode>("shifts");
  const [draftTemplate, setDraftTemplate] = useState<WeeklyTemplate>({
    ...DEFAULT_WEEKLY_TEMPLATE,
  });
  const [editingText, setEditingText] = useState<Partial<Record<DayKey, string>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const selectWeekMonday = (monday: string) => {
    userPickedWeekRef.current = true;
    setWeekMonday(monday);
  };

  useEffect(() => {
    if (factoryDate && !userPickedWeekRef.current) {
      setWeekMonday(getMondayOfWeek(factoryDate));
    }
  }, [factoryDate]);

  const { schedules, loading } = useWorkSchedules();

  useEffect(() => {
    if (
      allowedMachineEntries.length > 0 &&
      (!selectedMachineId || !allowedMachineEntries.some(([id]) => id === selectedMachineId))
    ) {
      setSelectedMachineId(allowedMachineEntries[0][0]);
    }
  }, [allowedMachineEntries, selectedMachineId]);

  useEffect(() => {
    const deptKeys = Object.keys(departments);
    if (deptKeys.length > 0 && !departments[selectedDepartment]) {
      setSelectedDepartment(deptKeys[0]);
    }
  }, [departments, selectedDepartment]);

  const activeMachineSchedule = selectedMachineId ? schedules[selectedMachineId] : undefined;

  const activeVersionInfo = useMemo(() => {
    const versions = activeMachineSchedule?.versions || {};
    const matchingKeys = Object.keys(versions)
      .filter((k) => k <= weekMonday && versions[k]?.template)
      .sort();
    if (matchingKeys.length === 0) return null;
    const latestKey = matchingKeys[matchingKeys.length - 1];
    return versions[latestKey];
  }, [activeMachineSchedule, weekMonday]);

  const { currentEffectiveVersion, upcomingVersion } = useMemo(() => {
    const versions = activeMachineSchedule?.versions || {};
    const validKeys = Object.keys(versions).filter((k) => versions[k]?.template).sort();
    const currentKeys = validKeys.filter((k) => k <= todayStr);
    const upcomingKeys = validKeys.filter((k) => k > todayStr);
    return {
      currentEffectiveVersion:
        currentKeys.length > 0 ? versions[currentKeys[currentKeys.length - 1]] : null,
      upcomingVersion: upcomingKeys.length > 0 ? versions[upcomingKeys[0]] : null,
    };
  }, [activeMachineSchedule, todayStr]);

  useEffect(() => {
    if (!selectedMachineId) return;
    const next: WeeklyTemplate = { ...DEFAULT_WEEKLY_TEMPLATE };
    DAY_KEYS.forEach((dayKey, idx) => {
      const dateStr = dayjs(weekMonday).add(idx, "day").format("YYYY-MM-DD");
      const resolved = resolveDaySchedule(activeMachineSchedule, dateStr);
      next[dayKey] = resolved.plannedWorkingHours;
    });
    setDraftTemplate(next);
    setEditingText({});
  }, [selectedMachineId, weekMonday, activeMachineSchedule]);

  useEffect(() => {
    setEditingText({});
  }, [unitMode]);

  const setDayValue = (dayKey: DayKey, rawVal: string) => {
    setEditingText((prev) => ({ ...prev, [dayKey]: rawVal }));
    const num = parseFloat(rawVal);
    if (isNaN(num)) {
      setDraftTemplate((prev) => ({ ...prev, [dayKey]: 0 }));
      return;
    }
    const hours = unitMode === "shifts" ? num * 8 : num;
    setDraftTemplate((prev) => ({
      ...prev,
      [dayKey]: clampHours(hours, 24),
    }));
  };

  const applyPreset = (weekdayHours: number, satHours = weekdayHours, sunHours = weekdayHours) => {
    setEditingText({});
    setDraftTemplate({
      Mon: weekdayHours,
      Tue: weekdayHours,
      Wed: weekdayHours,
      Thu: weekdayHours,
      Fri: weekdayHours,
      Sat: satHours,
      Sun: sunHours,
    });
  };

  const handleSave = async () => {
    let targetIds: string[] = [];
    if (applyScope === "single") {
      if (!selectedMachineId) return;
      targetIds = [selectedMachineId];
    } else if (applyScope === "department") {
      const deptMachines = toIdArray((departments as any)?.[selectedDepartment]?.machines);
      targetIds = allowedMachineEntries
        .map(([id]) => id)
        .filter((id) => deptMachines.includes(id));
    } else {
      targetIds = allowedMachineEntries.map(([id]) => id);
    }

    if (targetIds.length === 0) {
      toast({
        title: "No machines found",
        description: "No machines match the selected scope.",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    setSaving("Updating");
    try {
      await saveWorkScheduleVersion(targetIds, weekMonday, draftTemplate);
      toast({
        title: "Success",
        description: `Work schedule saved (effective from ${dayjs(weekMonday).format("DD MMM YYYY")})`,
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Could not update work schedule",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    } finally {
      setSaving(null);
    }
  };

  const weeklyTotals = useMemo(() => {
    const workHours = DAY_KEYS.reduce((acc, k) => acc + (draftTemplate[k] || 0), 0);
    const plannedDownHours = Math.max(0, 168 - workHours);
    return {
      workHours: +workHours.toFixed(2),
      workShifts: +(workHours / 8).toFixed(2),
      plannedDownHours: +plannedDownHours.toFixed(2),
      plannedDownShifts: +(plannedDownHours / 8).toFixed(2),
    };
  }, [draftTemplate]);

  return (
    <>
      {saving && <BackdropLoader text={saving} />}
      <Flex
        py={5}
        flexDir={{
          base: "column",
          xl: "row",
        }}
        gap={5}
        px={{
          base: 4,
          sm: 8,
        }}
      >
        <Box
          w={{
            base: "100%",
            sm: "30%",
          }}
        >
          <Text fontSize="lg" fontWeight={500} color={text}>
            Work Schedule
          </Text>
          <Text fontSize="sm" color={subText} mt={3}>
            Configure weekly planned working shifts or hours for your machines (3 shifts = 24h).
            Any remaining time in the day is automatically credited as Planned Downtime Allowance
            (e.g. 2.5 shifts = 20h working + 0.5 shift / 4h planned downtime).
          </Text>
        </Box>

        <VStack w="100%" gap={5} alignItems="flex-end">
          <MyCard w="100%" px={4} py={4}>
            {loading ? (
              <Center h="150px">
                <SmallFill />
              </Center>
            ) : allowedMachineEntries.length === 0 || !selectedMachineId ? (
              <Center h="150px">
                <NotFound text="No Machines Found" />
              </Center>
            ) : (
              <VStack w="100%" gap={5}>
                {/* Machine & Week Selection Row */}
                <SimpleGrid
                  gap={5}
                  w="100%"
                  pb={5}
                  borderBottom="1px solid"
                  borderColor={border}
                  columns={{
                    base: 1,
                    md: 3,
                  }}
                >
                  <FormControl>
                    <FormLabel fontSize="sm" color={text}>
                      Select Machine
                    </FormLabel>
                    <SearchableSelector
                      size="sm"
                      className="border-radius-5"
                      isDisabled={allowedMachineEntries.length === 0}
                      options={allowedMachineEntries.map(([id, name]) => ({
                        label: name,
                        value: id,
                      }))}
                      onChange={(opt: { label: string; value: string }) => {
                        if (opt?.value) setSelectedMachineId(opt.value);
                      }}
                      value={{
                        label: machinesMap[selectedMachineId] || selectedMachineId,
                        value: selectedMachineId,
                      }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm" color={text}>
                      Effective Week (Monday)
                    </FormLabel>
                    <HStack spacing={2}>
                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="orange"
                        onClick={() =>
                          selectWeekMonday(
                            dayjs(weekMonday).subtract(7, "day").format("YYYY-MM-DD"),
                          )
                        }
                      >
                        <Icon as={FiChevronLeft} />
                      </Button>
                      <PrimaryInput
                        size="sm"
                        type="date"
                        placeholder="Effective Week"
                        value={weekMonday}
                        onChange={(e) => {
                          if (e.target.value) selectWeekMonday(getMondayOfWeek(e.target.value));
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="orange"
                        onClick={() =>
                          selectWeekMonday(dayjs(weekMonday).add(7, "day").format("YYYY-MM-DD"))
                        }
                      >
                        <Icon as={FiChevronRight} />
                      </Button>
                    </HStack>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm" color={text}>
                      Input Unit
                    </FormLabel>
                    <PrimarySelect
                      size="sm"
                      value={unitMode}
                      onChange={(e) => setUnitMode(e.target.value as UnitMode)}
                    >
                      <option value="shifts">Shifts (0 – 3 shifts, 8h each)</option>
                      <option value="hours">Working Hours (0 – 24 hours)</option>
                    </PrimarySelect>
                  </FormControl>
                </SimpleGrid>

                {/* Current Effective Schedule Banner */}
                {currentEffectiveVersion ? (
                  <Flex
                    w="100%"
                    px={3}
                    py={2}
                    rounded="md"
                    border="1px solid"
                    borderColor={border}
                    borderLeftWidth="3px"
                    borderLeftColor="primary"
                    justify="space-between"
                    align={{ base: "flex-start", md: "center" }}
                    direction={{ base: "column", md: "row" }}
                    gap={2}
                  >
                    <Text fontSize="xs" color={subText}>
                      <Text as="span" fontWeight={600} color={text}>
                        Current Effective Schedule
                      </Text>{" "}
                      (since {dayjs(currentEffectiveVersion.effectiveFrom).format("DD MMM YYYY")}):{" "}
                      <Text as="span" fontWeight={600} color={text}>
                        {formatCompactTemplate(currentEffectiveVersion.template, unitMode)}
                      </Text>
                      {upcomingVersion && (
                        <>
                          {" · "}Next change:{" "}
                          <Button
                            size="xs"
                            variant="link"
                            colorScheme="orange"
                            fontWeight={600}
                            onClick={() =>
                              selectWeekMonday(getMondayOfWeek(upcomingVersion.effectiveFrom))
                            }
                          >
                            {dayjs(upcomingVersion.effectiveFrom).format("DD MMM YYYY")}
                          </Button>
                        </>
                      )}
                    </Text>
                    {weekMonday !== todayMonday && (
                      <Button
                        size="xs"
                        variant="link"
                        colorScheme="orange"
                        flexShrink={0}
                        onClick={() => selectWeekMonday(todayMonday)}
                      >
                        Jump to current week
                      </Button>
                    )}
                  </Flex>
                ) : upcomingVersion ? (
                  <Flex
                    w="100%"
                    px={3}
                    py={2}
                    rounded="md"
                    border="1px solid"
                    borderColor={border}
                    borderLeftWidth="3px"
                    borderLeftColor="primary"
                    justify="space-between"
                    align={{ base: "flex-start", md: "center" }}
                    direction={{ base: "column", md: "row" }}
                    gap={2}
                  >
                    <Text fontSize="xs" color={subText}>
                      No schedule active today (Default 3 sh / 24h) · Upcoming schedule effective{" "}
                      <Text as="span" fontWeight={600} color={text}>
                        {dayjs(upcomingVersion.effectiveFrom).format("DD MMM YYYY")}
                      </Text>
                    </Text>
                    <Button
                      size="xs"
                      variant="link"
                      colorScheme="orange"
                      flexShrink={0}
                      onClick={() =>
                        selectWeekMonday(getMondayOfWeek(upcomingVersion.effectiveFrom))
                      }
                    >
                      View upcoming
                    </Button>
                  </Flex>
                ) : null}

                {/* Status & Quick Presets Row */}
                <Flex
                  w="100%"
                  justify="space-between"
                  align={{ base: "flex-start", lg: "center" }}
                  direction={{ base: "column", lg: "row" }}
                  gap={3}
                >
                  <HStack spacing={2} flexWrap="wrap">
                    <PrimarySelect
                      size="sm"
                      w="auto"
                      maxW="270px"
                      borderRadius="md"
                      isDisabled={!canEdit}
                      value=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "2.5_daily") applyPreset(20, 20, 20);
                        else if (v === "2.5_monsat") applyPreset(20, 20, 0);
                        else if (v === "3_full") applyPreset(24, 24, 24);
                        else if (v === "2_monsat") applyPreset(16, 16, 0);
                      }}
                    >
                      <option value="" disabled>Apply Preset…</option>
                      <option value="2.5_daily">2.5 Shifts Daily (4h Planned Down)</option>
                      <option value="2.5_monsat">2.5 Shifts Mon–Sat, Sun Off</option>
                      <option value="3_full">3 Shifts Full (24h)</option>
                      <option value="2_monsat">2 Shifts Mon–Sat (8h Planned Down)</option>
                    </PrimarySelect>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="orange"
                      leftIcon={<FiCopy />}
                      isDisabled={!canEdit}
                      onClick={() =>
                        applyPreset(draftTemplate.Mon, draftTemplate.Mon, draftTemplate.Sun)
                      }
                    >
                      Copy Mon to Mon–Sat
                    </Button>
                  </HStack>

                  <HStack spacing={2} fontSize="xs" color={subText} flexWrap="wrap">
                    <Text>
                      {activeVersionInfo
                        ? `Effective ${dayjs(activeVersionInfo.effectiveFrom).format("DD MMM YYYY")}`
                        : "Default (3 sh / 24h)"}
                    </Text>
                    <Text>•</Text>
                    <Text>
                      Working:{" "}
                      <Text as="span" fontWeight={600} color={text}>
                        {weeklyTotals.workShifts} sh ({weeklyTotals.workHours}h)
                      </Text>
                    </Text>
                    <Text>•</Text>
                    <Text>
                      Planned Down:{" "}
                      <Text
                        as="span"
                        fontWeight={600}
                        color={weeklyTotals.plannedDownHours > 0 ? "primary" : text}
                      >
                        {weeklyTotals.plannedDownShifts} sh ({weeklyTotals.plannedDownHours}h)
                      </Text>
                    </Text>
                  </HStack>
                </Flex>

                {/* 7-Day Schedule Inputs */}
                <SimpleGrid
                  gap={4}
                  w="100%"
                  columns={{
                    base: 1,
                    sm: 2,
                    md: 4,
                    lg: 7,
                  }}
                >
                  {DAY_KEYS.map((dayKey, idx) => {
                    const dateObj = dayjs(weekMonday).add(idx, "day");
                    const dateLabel = dateObj.format("DD MMM");
                    const workHours = draftTemplate[dayKey] ?? 24;
                    const workShifts = +(workHours / 8).toFixed(2);
                    const plannedDownHours = Math.max(0, +(24 - workHours).toFixed(2));
                    const plannedDownShifts = +(plannedDownHours / 8).toFixed(2);
                    const displayValue = unitMode === "shifts" ? workShifts : workHours;

                    return (
                      <GridItem
                        key={dayKey}
                        p={3}
                        rounded="md"
                        border="1px solid"
                        borderColor={border}
                      >
                        <FormControl>
                          <Flex justify="space-between" align="baseline" mb={1}>
                            <FormLabel fontSize="sm" color={text} mb={0}>
                              {DAY_LABELS[dayKey]}
                            </FormLabel>
                            <Text fontSize="2xs" color={subText}>
                              {dateLabel}
                            </Text>
                          </Flex>
                          <PrimaryNumberInput
                            size="sm"
                            placeholder={unitMode === "shifts" ? "Shifts" : "Hours"}
                            value={editingText[dayKey] ?? String(displayValue)}
                            min={0}
                            max={unitMode === "shifts" ? 3 : 24}
                            step={unitMode === "shifts" ? 0.25 : 0.5}
                            isDisabled={!canEdit}
                            onChange={(val) => setDayValue(dayKey, val)}
                            onBlur={() =>
                              setEditingText((prev) => {
                                if (!(dayKey in prev)) return prev;
                                const next = { ...prev };
                                delete next[dayKey];
                                return next;
                              })
                            }
                          />
                        </FormControl>

                        <VStack
                          align="stretch"
                          spacing={1}
                          mt={3}
                          pt={2}
                          borderTop="1px dashed"
                          borderColor={border}
                        >
                          <Flex justify="space-between">
                            <Text fontSize="2xs" color={subText}>
                              Working:
                            </Text>
                            <Text fontSize="2xs" fontWeight={600} color={text}>
                              {workShifts} sh ({workHours}h)
                            </Text>
                          </Flex>
                          <Flex justify="space-between">
                            <Text fontSize="2xs" color={subText}>
                              Planned Down:
                            </Text>
                            <Text
                              fontSize="2xs"
                              fontWeight={600}
                              color={plannedDownHours > 0 ? "primary" : subText}
                            >
                              {plannedDownShifts} sh ({plannedDownHours}h)
                            </Text>
                          </Flex>
                        </VStack>
                      </GridItem>
                    );
                  })}
                </SimpleGrid>

                {/* Scope & Effective-Date Explanation */}
                <SimpleGrid
                  w="100%"
                  pt={4}
                  borderTop="1px dashed"
                  borderColor={border}
                  gap={4}
                  columns={{
                    base: 1,
                    md: 2,
                  }}
                  alignItems="center"
                >
                  <HStack spacing={2}>
                    <Icon fontSize="xl" as={FiClock} color={subText} />
                    <Text fontSize="xs" fontWeight={500} color={subText}>
                      Saves an effective-date schedule from{" "}
                      <strong>{dayjs(weekMonday).format("DD MMM YYYY")}</strong>. Historical
                      reports before this date keep their own previous schedule.
                    </Text>
                  </HStack>

                  <HStack justify={{ base: "flex-start", md: "flex-end" }} spacing={3}>
                    <FormControl maxW="240px">
                      <PrimarySelect
                        size="sm"
                        isDisabled={!canEdit}
                        value={applyScope}
                        onChange={(e) => setApplyScope(e.target.value as ApplyScope)}
                      >
                        {[
                          {
                            value: "single",
                            label: `Apply to ${machinesMap[selectedMachineId] || "Selected Machine"}`,
                          },
                          ...(Object.keys(departments).length > 0
                            ? [{ value: "department", label: "Apply to Department" }]
                            : []),
                          {
                            value: "all",
                            label: `Apply to All Machines (${allowedMachineEntries.length})`,
                          },
                        ].map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </PrimarySelect>
                    </FormControl>

                    {applyScope === "department" && Object.keys(departments).length > 0 && (
                      <FormControl maxW="180px">
                        <PrimarySelect
                          size="sm"
                          isDisabled={!canEdit}
                          value={selectedDepartment}
                          onChange={(e) => setSelectedDepartment(e.target.value)}
                        >
                          {Object.keys(departments).map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </PrimarySelect>
                      </FormControl>
                    )}
                  </HStack>
                </SimpleGrid>
              </VStack>
            )}
          </MyCard>

          {canEdit && (
            <ConfirmDialog onConfirm={handleSave}>
              <PrimaryBtn rightIcon={<FiSave />}>Save Changes</PrimaryBtn>
            </ConfirmDialog>
          )}
        </VStack>
      </Flex>
    </>
  );
};

export default WorkSchedule;

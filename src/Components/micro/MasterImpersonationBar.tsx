import { FC, useState, useMemo, useEffect } from "react";
import {
  Box,
  Flex,
  HStack,
  Text,
  Badge,
  Button,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Input,
  InputGroup,
  InputLeftElement,
  VStack,
  useDisclosure,
  useColorMode,
  useToast,
  Divider,
} from "@chakra-ui/react";
import MyTooltip from "./MyTooltip";
import { SearchIcon, LockIcon, UnlockIcon, DeleteIcon } from "@chakra-ui/icons";
import { FiUsers, FiLogOut, FiCheck, FiArrowRight, FiClock } from "react-icons/fi";
import Get from "../Store/hooks/Get";
import store from "../Store";
import {
  isMasterAdminAtom,
  impersonatedUidAtom,
  isImpersonationReadOnlyAtom,
  companyNameAtom,
  MasterClientItem,
} from "../Store/atoms";

interface MasterImpersonationBarProps {
  onSwitchClient: (targetUid: string, companyName?: string) => Promise<void> | void;
  onExitImpersonation: () => Promise<void> | void;
  isMasterAdmin?: boolean;
}

const RECENT_CLIENTS_KEY = "ipmr_master_recent_clients";

export const MasterImpersonationBar: FC<MasterImpersonationBarProps> = ({
  onSwitchClient,
  onExitImpersonation,
  isMasterAdmin: propIsMaster,
}) => {
  const atomIsMaster = Get(isMasterAdminAtom);
  const isMasterAdmin = propIsMaster !== undefined ? propIsMaster : atomIsMaster;
  const impersonatedUid = Get(impersonatedUidAtom);
  const isReadOnly = Get(isImpersonationReadOnlyAtom);
  const currentCompanyName = Get(companyNameAtom);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [manualUid, setManualUid] = useState("");
  const [manualName, setManualName] = useState("");
  const [searchHistory, setSearchHistory] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);
  const [historyList, setHistoryList] = useState<MasterClientItem[]>([]);
  const { colorMode } = useColorMode();
  const toast = useToast();

  const isDark = colorMode === "dark";
  const barBg = isDark ? "#1e2226" : "white";
  const borderColor = isDark ? "#32383e" : "#E2E8F0";
  const textColor = isDark ? "RGBA(255, 255, 255, 0.85)" : "#4A5568";

  // Load history from localStorage whenever modal opens
  const refreshHistory = () => {
    try {
      const stored = localStorage.getItem(RECENT_CLIENTS_KEY);
      const list: MasterClientItem[] = stored ? JSON.parse(stored) : [];
      setHistoryList(list);
    } catch {
      setHistoryList([]);
    }
  };

  useEffect(() => {
    refreshHistory();
  }, [isOpen]);

  // Filter history by search query
  const filteredHistory = useMemo(() => {
    if (!searchHistory.trim()) return historyList;
    const q = searchHistory.toLowerCase().trim();
    return historyList.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        c.uid.toLowerCase().includes(q)
    );
  }, [historyList, searchHistory]);

  if (!isMasterAdmin) return null;

  const handleSelectClient = async (uid: string, name?: string) => {
    const cleanUid = uid.trim();
    if (!cleanUid) return;

    setIsSwitching(true);
    try {
      // Save/update this UID in history
      const currentList: MasterClientItem[] = (() => {
        try {
          const s = localStorage.getItem(RECENT_CLIENTS_KEY);
          return s ? JSON.parse(s) : [];
        } catch {
          return [];
        }
      })();

      const existing = currentList.find((c) => c.uid === cleanUid);
      const finalName = name?.trim() || existing?.companyName || cleanUid;

      const updatedHistory = [
        { uid: cleanUid, companyName: finalName },
        ...currentList.filter((c) => c.uid !== cleanUid),
      ].slice(0, 25);

      localStorage.setItem(RECENT_CLIENTS_KEY, JSON.stringify(updatedHistory));
      setHistoryList(updatedHistory);

      await onSwitchClient(cleanUid, finalName);
      onClose();
    } catch (err: any) {
      toast({
        title: "Error switching client",
        description: err?.message || "Failed to switch client",
        status: "error",
        duration: 4000,
      });
    } finally {
      setIsSwitching(false);
    }
  };

  const handleDeleteHistoryItem = (e: React.MouseEvent, uidToDelete: string) => {
    e.stopPropagation();
    try {
      const updated = historyList.filter((c) => c.uid !== uidToDelete);
      localStorage.setItem(RECENT_CLIENTS_KEY, JSON.stringify(updated));
      setHistoryList(updated);
      toast({
        title: "Removed from history",
        status: "info",
        duration: 2000,
        position: "bottom-right",
      });
    } catch {
      // Ignore
    }
  };

  const toggleReadOnly = () => {
    const next = !isReadOnly;
    store.set(isImpersonationReadOnlyAtom, next);
    toast({
      title: next ? "Safe Mode: ON" : "Safe Mode: OFF",
      description: next
        ? "Client database is protected from edits."
        : "Safe Mode disabled. Modifications will write to live client data.",
      status: next ? "success" : "warning",
      duration: 3000,
      position: "bottom-right",
    });
  };

  return (
    <>
      {/* Minimalist, Theme-Matching Master Bar */}
      <Box
        position="sticky"
        top="0"
        zIndex="1400"
        bg={barBg}
        color={textColor}
        px={{ base: 3, md: 8 }}
        py={1.5}
        borderBottom="1px solid"
        borderColor={borderColor}
        boxShadow={isDark ? "0 1px 3px rgba(0,0,0,0.4)" : "0 1px 3px rgba(0,0,0,0.06)"}
        transition="all 0.2s ease"
      >
        <Flex
          justify="space-between"
          align="center"
          maxW="1440px"
          mx="auto"
          gap={2}
          wrap="wrap"
        >
          {/* Left: Superadmin Pill & Active Client */}
          <HStack spacing={{ base: 2, md: 3 }} align="center" flexWrap="wrap" rowGap={1} minW={0} maxW="100%">
            <HStack
              spacing={1.5}
              px={2}
              py={0.5}
              borderRadius="full"
              bg={isDark ? "whiteAlpha.100" : "blackAlpha.50"}
              border="1px solid"
              borderColor={isDark ? "whiteAlpha.200" : "blackAlpha.100"}
            >
              <Box w="6px" h="6px" borderRadius="full" bg="#ED8936" />
              <Text
                fontSize="2xs"
                fontWeight="700"
                letterSpacing="0.08em"
                color={isDark ? "orange.300" : "orange.600"}
              >
                SUPERADMIN
              </Text>
            </HStack>

            <Divider orientation="vertical" h="14px" borderColor={borderColor} display={{ base: "none", sm: "block" }} />

            <HStack spacing={1.5} minW={0} maxW="100%">
              <Text fontSize="xs" opacity={0.6} flexShrink={0}>
                Viewing:
              </Text>
              <Text
                fontSize="xs"
                fontWeight="600"
                color={isDark ? "white" : "gray.800"}
                maxW={{ base: "100%", md: "260px" }}
                minW={0}
                isTruncated
              >
                {currentCompanyName || (impersonatedUid ? impersonatedUid : "No Client Selected")}
              </Text>
              {impersonatedUid && (
                <Text
                  fontSize="2xs"
                  opacity={0.4}
                  fontFamily="monospace"
                  display={{ base: "none", md: "inline" }}
                >
                  ({impersonatedUid.slice(0, 10)}...)
                </Text>
              )}
            </HStack>
          </HStack>

          {/* Right: Actions */}
          <HStack spacing={2} align="center" flexWrap="wrap" rowGap={1} maxW="100%">
            {/* Safe Mode Toggle */}
            <MyTooltip
              label={
                isReadOnly
                  ? "Safe Mode is ON: Client database is protected against accidental modifications."
                  : "Safe Mode is OFF: Changes will write directly to client database."
              }
            >
              <Button
                size="xs"
                variant="ghost"
                colorScheme={isReadOnly ? "teal" : "orange"}
                leftIcon={isReadOnly ? <LockIcon fontSize="2xs" /> : <UnlockIcon fontSize="2xs" />}
                onClick={toggleReadOnly}
                fontSize="2xs"
                fontWeight="600"
                h="24px"
                px={2}
              >
                {isReadOnly ? "Safe Mode" : "Read-Write"}
              </Button>
            </MyTooltip>

            {/* Switch Client Button */}
            <Button
              size="xs"
              colorScheme="orange"
              variant="outline"
              borderColor={isDark ? "orange.400" : "orange.500"}
              color={isDark ? "orange.300" : "orange.600"}
              _hover={{
                bg: isDark ? "whiteAlpha.100" : "orange.50",
              }}
              leftIcon={<FiUsers />}
              onClick={onOpen}
              fontSize="2xs"
              fontWeight="600"
              h="24px"
              px={3}
            >
              Switch Client
            </Button>

            {/* Exit Impersonation Button */}
            {impersonatedUid && (
              <MyTooltip label="Exit View-As mode">
                <IconButton
                  size="xs"
                  variant="ghost"
                  colorScheme="gray"
                  aria-label="Exit Impersonation"
                  icon={<FiLogOut />}
                  onClick={onExitImpersonation}
                  h="24px"
                  w="24px"
                  opacity={0.7}
                  _hover={{ opacity: 1, color: "red.400" }}
                />
              </MyTooltip>
            )}
          </HStack>
        </Flex>
      </Box>

      {/* Minimalist Client Switcher Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay backdropFilter="blur(3px)" />
        <ModalContent
          bg={isDark ? "#212529" : "white"}
          color={textColor}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="lg"
          boxShadow="2xl"
        >
          <ModalHeader pb={2} borderBottom="1px solid" borderColor={borderColor}>
            <HStack spacing={2} align="center">
              <Box
                p={1.5}
                borderRadius="md"
                bg={isDark ? "whiteAlpha.100" : "orange.50"}
                color="#ED8936"
              >
                <FiUsers />
              </Box>
              <VStack align="start" spacing={0}>
                <Text fontSize="sm" fontWeight="700">
                  Switch Client Perspective
                </Text>
                <Text fontSize="2xs" opacity={0.6}>
                  Enter a Client Firebase UID or select from your recent history
                </Text>
              </VStack>
            </HStack>
          </ModalHeader>
          <ModalCloseButton top={3} right={3} />

          <ModalBody py={4}>
            <VStack spacing={4} align="stretch">
              {/* Direct UID Input Form */}
              <Box
                p={3}
                borderRadius="md"
                bg={isDark ? "whiteAlpha.50" : "gray.50"}
                border="1px solid"
                borderColor={borderColor}
              >
                <Text fontSize="2xs" fontWeight="700" letterSpacing="0.05em" opacity={0.8} mb={2}>
                  ENTER CLIENT FIREBASE UID
                </Text>
                <VStack spacing={2} align="stretch">
                  <Input
                    size="sm"
                    placeholder="Paste Client UID (e.g. 28-character Firebase UID)"
                    value={manualUid}
                    onChange={(e) => setManualUid(e.target.value.trim())}
                    fontFamily="monospace"
                    fontSize="xs"
                    borderColor={borderColor}
                    _focus={{ borderColor: "#ED8936" }}
                    bg={isDark ? "#1a1d21" : "white"}
                  />
                  <Flex gap={2}>
                    <Input
                      size="sm"
                      placeholder="Optional Factory Nickname (auto-fetches if blank)"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      fontSize="xs"
                      borderColor={borderColor}
                      _focus={{ borderColor: "#ED8936" }}
                      bg={isDark ? "#1a1d21" : "white"}
                    />
                    <Button
                      size="sm"
                      colorScheme="orange"
                      isDisabled={!manualUid.trim()}
                      isLoading={isSwitching}
                      onClick={() => handleSelectClient(manualUid, manualName)}
                      fontSize="xs"
                      px={4}
                      rightIcon={<FiArrowRight />}
                    >
                      View Client
                    </Button>
                  </Flex>
                </VStack>
              </Box>

              {/* History Section */}
              <VStack spacing={2} align="stretch">
                <Flex justify="space-between" align="center">
                  <HStack spacing={1.5}>
                    <FiClock fontSize="12px" color="#ED8936" />
                    <Text fontSize="2xs" fontWeight="700" letterSpacing="0.05em" opacity={0.8}>
                      SAVED CLIENT HISTORY ({historyList.length})
                    </Text>
                  </HStack>
                  {historyList.length > 3 && (
                    <InputGroup size="xs" maxW="180px">
                      <InputLeftElement pointerEvents="none">
                        <SearchIcon color="gray.400" />
                      </InputLeftElement>
                      <Input
                        placeholder="Search history..."
                        value={searchHistory}
                        onChange={(e) => setSearchHistory(e.target.value)}
                        borderRadius="md"
                        fontSize="2xs"
                      />
                    </InputGroup>
                  )}
                </Flex>

                <Box
                  maxH="220px"
                  overflowY="auto"
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="md"
                  p={1.5}
                >
                  {filteredHistory.length === 0 ? (
                    <Text fontSize="xs" textAlign="center" py={4} opacity={0.5}>
                      {historyList.length === 0
                        ? "No client history saved yet. Enter a Client UID above to get started."
                        : "No history matched your search."}
                    </Text>
                  ) : (
                    <VStack spacing={1} align="stretch">
                      {filteredHistory.map((item) => {
                        const isCurrent = item.uid === impersonatedUid;
                        return (
                          <Flex
                            key={item.uid}
                            p={2}
                            borderRadius="md"
                            align="center"
                            justify="space-between"
                            cursor="pointer"
                            bg={
                              isCurrent
                                ? isDark
                                  ? "whiteAlpha.100"
                                  : "orange.50"
                                : "transparent"
                            }
                            _hover={{
                              bg: isDark ? "whiteAlpha.100" : "gray.50",
                            }}
                            onClick={() => handleSelectClient(item.uid, item.companyName)}
                          >
                            <VStack align="start" spacing={0} maxW="70%">
                              <Text fontSize="xs" fontWeight={600} isTruncated>
                                {item.companyName || "Client"}
                              </Text>
                              <Text
                                fontSize="2xs"
                                opacity={0.5}
                                fontFamily="monospace"
                                isTruncated
                              >
                                {item.uid}
                              </Text>
                            </VStack>

                            <HStack spacing={1.5}>
                              {isCurrent ? (
                                <Badge
                                  colorScheme="green"
                                  variant="subtle"
                                  fontSize="3xs"
                                  px={1.5}
                                  py={0.5}
                                  display="flex"
                                  alignItems="center"
                                  gap={1}
                                >
                                  <FiCheck /> ACTIVE
                                </Badge>
                              ) : (
                                <Button
                                  size="2xs"
                                  variant="ghost"
                                  colorScheme="orange"
                                  isLoading={isSwitching}
                                  fontSize="2xs"
                                >
                                  Select
                                </Button>
                              )}
                              <IconButton
                                size="2xs"
                                variant="ghost"
                                colorScheme="red"
                                aria-label="Remove from history"
                                icon={<DeleteIcon fontSize="10px" />}
                                onClick={(e) => handleDeleteHistoryItem(e, item.uid)}
                                opacity={0.6}
                                _hover={{ opacity: 1 }}
                              />
                            </HStack>
                          </Flex>
                        );
                      })}
                    </VStack>
                  )}
                </Box>
              </VStack>
            </VStack>
          </ModalBody>

          <ModalFooter borderTop="1px solid" borderColor={borderColor} py={2}>
            <Button size="xs" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

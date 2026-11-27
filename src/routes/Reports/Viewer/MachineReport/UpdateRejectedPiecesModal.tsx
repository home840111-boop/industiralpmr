import { useState, useEffect } from "react";
import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea,
  Box,
  Text,
  VStack,
  Button,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Select,
} from "@chakra-ui/react";
import { useToast } from "@chakra-ui/react";
import { update, get } from "../../../../Components/firebase/api/db";
import Primary from "../../../../Components/Buttons/Primary";
import PrimaryInput from "../../../../Components/Inputs/Primary";
import MyModal from "../../../../Components/micro/MyModal";
import { shiftsAtom } from "../../../../Components/Store/atoms";
import Get from "../../../../Components/Store/hooks/Get";

interface MoldData {
  stats: {
    production: number;
  };
}

interface UpdateRejectedPiecesModalProps {
  isOpen: boolean;
  rejected?: {
    pieces: number;
    reason: string;
  } | null;
  onClose: () => void;
  machineId: string;
  date: string;
  onUpdate: () => void;
  totalProduction: number;
  molds?: Record<string, MoldData>;
  moldsByShift?: Record<string, Record<string, number>>;
  shifts?: {
    A: { production: number } | null;
    B: { production: number } | null;
    C: { production: number } | null;
  };
}

interface ShiftRejectedData {
  pieces: number;
  reason: string;
  molds?: Record<string, { pieces: number; reason: string }>;
}

const UpdateRejectedPiecesModal = ({
  isOpen,
  rejected,
  onClose,
  machineId,
  date,
  onUpdate,
  totalProduction,
  molds = {},
  moldsByShift = { A: {}, B: {}, C: {} },
  shifts: shiftsData = { A: null, B: null, C: null },
}: UpdateRejectedPiecesModalProps) => {
  const toast = useToast();
  const [rejectedPieces, setRejectedPieces] = useState(0);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentRejectedCount, setCurrentRejectedCount] = useState(0);
  const [error, setError] = useState("");
  const [shift, setShift] = useState("A");
  const [selectedMold, setSelectedMold] = useState("");

  const [shiftData, setShiftData] = useState<Record<string, ShiftRejectedData>>({
    A: { pieces: 0, reason: "" },
    B: { pieces: 0, reason: "" },
    C: { pieces: 0, reason: "" },
  });

  const shifts = Get(shiftsAtom);

  useEffect(() => {
    const fetchAllShiftData = async () => {
      if (!isOpen) return;

      try {
        const newShiftData: Record<string, ShiftRejectedData> = {
          A: { pieces: 0, reason: "" },
          B: { pieces: 0, reason: "" },
          C: { pieces: 0, reason: "" },
        };

        const shiftsToFetch = ["A", "B", "C"].slice(0, shifts?.shifts ?? 1);

        await Promise.all(
          shiftsToFetch.map(async (shiftKey) => {
            try {
              const snapshot = await get(
                `reports/machines/${machineId}/daily/${date}/total/operators/${shiftKey}/rejected`
              );

              if (snapshot && snapshot.exists()) {
                const data = snapshot.val();
                newShiftData[shiftKey] = {
                  pieces: data?.pieces ?? 0,
                  reason: data?.reason ?? "",
                  molds: data?.molds || {},
                };
              }
            } catch (error) {
              console.error(`Error fetching shift ${shiftKey} data:`, error);
            }
          })
        );

        setShiftData(newShiftData);

        // Set initial state based on current shift and selected mold
        // If no mold is selected, select the first one available for the current shift
        let moldToSelect = selectedMold;
        const availableMolds = Object.keys(moldsByShift[shift] || {});
        const hasGeneral = (newShiftData[shift]?.molds?.["General"]?.pieces || 0) > 0;
        if (hasGeneral && !availableMolds.includes("General")) {
          availableMolds.push("General");
        }

        if (!moldToSelect || !availableMolds.includes(moldToSelect)) {
          moldToSelect = availableMolds.length > 0 ? availableMolds[0] : "";
          setSelectedMold(moldToSelect);
        }

        updateLocalState(newShiftData, shift, moldToSelect);

      } catch (error) {
        console.error("Error fetching rejected pieces:", error);
        const defaultData = { pieces: 0, reason: "" };
        setShiftData({ A: defaultData, B: defaultData, C: defaultData });
        setRejectedPieces(0);
        setReason("");
        setCurrentRejectedCount(0);
      }
      setError("");
    };

    fetchAllShiftData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, machineId, date, shifts?.shifts, shift, moldsByShift]);

  const updateLocalState = (data: Record<string, ShiftRejectedData>, currentShift: string, currentMold: string) => {
    if (!currentMold) {
      setRejectedPieces(0);
      setReason("");
      setCurrentRejectedCount(0);
      return;
    }
    const currentShiftData = data[currentShift];
    const moldData = currentShiftData.molds?.[currentMold] || { pieces: 0, reason: "" };

    setRejectedPieces(moldData.pieces);
    setReason(moldData.reason);
    setCurrentRejectedCount(moldData.pieces);
  };

  useEffect(() => {
    if (isOpen) {
      updateLocalState(shiftData, shift, selectedMold);
      setError("");
    }
  }, [shift, selectedMold, isOpen, shiftData]);

  const getProductionLimit = () => {
    if (!selectedMold) return 0;
    if (selectedMold === "General") {
      // Return total production for the selected shift
      return (shiftsData as any)?.[shift]?.production || 0;
    }
    // Return production for the specific mold in the selected shift
    return moldsByShift[shift]?.[selectedMold] || 0;
  };

  const validateInput = (value: number) => {
    if (value < 0) {
      return "Rejected pieces cannot be negative";
    }
    const limit = getProductionLimit();
    if (value > limit) {
      return `Rejected pieces (${value}) cannot exceed production (${limit})`;
    }
    return "";
  };

  const handleInputChange = (value: number) => {
    const validatedValue = Math.max(0, value);
    setRejectedPieces(validatedValue);
    const errorMsg = validateInput(validatedValue);
    setError(errorMsg);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMold) {
      setError("Please select a mold");
      return;
    }
    const errorMsg = validateInput(rejectedPieces);
    if (errorMsg) {
      setError(errorMsg);
      return;
    }
    setIsLoading(true);
    try {
      // Calculate new total for the shift
      const currentShiftData = shiftData[shift];
      const currentMolds = { ...(currentShiftData.molds || {}) };

      // Update the specific mold data
      if (rejectedPieces > 0 || reason) {
        currentMolds[selectedMold] = {
          pieces: rejectedPieces,
          reason: reason || "No reason provided"
        };
      } else {
        delete currentMolds[selectedMold];
      }

      // Calculate total pieces
      const totalPieces = Object.values(currentMolds).reduce((sum, m) => sum + m.pieces, 0);

      // Construct reasons string
      const allReasons = Object.entries(currentMolds)
        .map(([mold, data]) => `${mold}: ${data.reason}`)
        .join("; ");

      const updateData = {
        pieces: totalPieces,
        reason: allReasons,
        updatedAt: new Date().toISOString(),
        molds: currentMolds
      };

      await update(
        `reports/machines/${machineId}/daily/${date}/total/operators/${shift}/rejected`,
        updateData
      );

      setShiftData(prev => ({
        ...prev,
        [shift]: {
          pieces: totalPieces,
          reason: allReasons,
          molds: currentMolds
        }
      }));

      toast({
        title: "Success",
        description: `Updated rejected pieces for ${selectedMold} in shift ${shift}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      onUpdate();
      // Don't close, allow adding more for other molds
      // onClose(); 
    } catch (error) {
      console.error("Error updating rejected pieces:", error);
      toast({
        title: "Error",
        description: "Failed to update rejected pieces",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
    setIsLoading(false);
  };

  const handleClose = () => {
    setRejectedPieces(0);
    setReason("");
    setError("");
    setShift("A");
    setSelectedMold("");
    onClose();
  };

  const getAvailableMolds = (shiftKey: string) => {
    const options = Object.keys(moldsByShift[shiftKey] || {});
    const hasGeneral = (shiftData[shiftKey]?.molds?.["General"]?.pieces || 0) > 0;
    if (hasGeneral && !options.includes("General")) {
      options.push("General");
    }
    return options;
  };

  const handleShiftChange = (newShift: string) => {
    setShift(newShift);
    // Reset selected mold if it's not available in the new shift
    const availableMolds = getAvailableMolds(newShift);
    if (selectedMold && !availableMolds.includes(selectedMold)) {
      // Select first available mold or empty
      setSelectedMold(availableMolds.length > 0 ? availableMolds[0] : "");
    } else if (!selectedMold && availableMolds.length > 0) {
      setSelectedMold(availableMolds[0]);
    }
  };

  const moldOptions = getAvailableMolds(shift);

  return (
    <MyModal
      size="md"
      isOpen={isOpen}
      onClose={handleClose}
      closeOnOverlayClick={false}
    >
      <form onSubmit={handleSubmit} autoComplete="false">
        <ModalHeader>Update Rejected Pieces</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack gap={4}>
            <FormControl isRequired>
              <FormLabel>Select Shift</FormLabel>
              <Select
                value={shift}
                onChange={(e) => handleShiftChange(e.target.value)}
                focusBorderColor="primary"
              >
                <option value="A" disabled={(shifts?.shifts ?? 0) < 1}>Shift A</option>
                <option value="B" disabled={(shifts?.shifts ?? 0) < 2}>Shift B</option>
                <option value="C" disabled={(shifts?.shifts ?? 0) < 3}>Shift C</option>
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Select Mold</FormLabel>
              <Select
                value={selectedMold}
                onChange={(e) => setSelectedMold(e.target.value)}
                focusBorderColor="primary"
                placeholder={moldOptions.length === 0 ? "No molds found for this shift" : "Select a mold"}
              >
                {moldOptions.map(mold => (
                  <option key={mold} value={mold}>{mold}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl isRequired isInvalid={!!error}>
              <FormLabel>Rejected Pieces {selectedMold ? `(${selectedMold})` : ""}</FormLabel>
              <NumberInput
                min={0}
                value={rejectedPieces}
                onChange={(valueString) => {
                  const value = parseInt(valueString) || 0;
                  handleInputChange(value);
                }}
                focusBorderColor="primary"
                isDisabled={!selectedMold}
              >
                <NumberInputField
                  as={PrimaryInput}
                  placeholder="Enter number of rejected pieces"
                />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              {error && <FormErrorMessage>{error}</FormErrorMessage>}
              <Box mt={2} fontSize="sm" color="gray.600">
                <Text>Current rejected {selectedMold ? `(${selectedMold})` : ""}: {currentRejectedCount}</Text>
                <Text>Production {selectedMold ? `(${selectedMold})` : ""}: {getProductionLimit()}</Text>
                <Text fontWeight="medium">
                  New rejected {selectedMold ? `(${selectedMold})` : ""}: {rejectedPieces}
                </Text>
              </Box>
            </FormControl>

            <FormControl>
              <FormLabel>Reason / Remarks (Optional)</FormLabel>
              <Textarea
                placeholder="Enter reason for rejected pieces"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minH="100px"
                focusBorderColor="primary"
                isDisabled={!selectedMold}
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Primary
            type="submit"
            mr={3}
            isLoading={isLoading}
            isDisabled={!!error || rejectedPieces < 0 || !selectedMold}
          >
            Save
          </Primary>
          <Button onClick={handleClose}>Close</Button>
        </ModalFooter>
      </form>
    </MyModal>
  );
};

export default UpdateRejectedPiecesModal;
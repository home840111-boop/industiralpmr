import { FormControl, FormErrorMessage, FormLabel, ModalBody, ModalCloseButton, ModalHeader, useDisclosure, VStack, ModalFooter, Button, useToast, Flex, Box, Text, useColorMode, SimpleGrid, GridItem } from "@chakra-ui/react";
import { Children, cloneElement, useMemo, useState } from "react";
import { BiTrashAlt } from "react-icons/bi";
import { InventoryItem } from "../..";
import Primary from "../../../../../Components/Buttons/Primary";
import PrimaryNumberInput from "../../../../../Components/Inputs/PrimaryNumberInput";
import PrimarySelect from "../../../../../Components/Inputs/PrimarySelect";
import BackdropLoader from "../../../../../Components/Loaders/BackdropLoader"
import ConfirmDialog from "../../../../../Components/micro/ConfirmDialog";
import MyModal from "../../../../../Components/micro/MyModal";
import weightFormatter from "../../../../../Components/Functions/formatters/weightFormatter";
import formatter from "../../../../../Components/Functions/formatters/numberFormatter";

const EditMaterialModal = ({
  item,
  children,
  refetch
}: {
  item: InventoryItem,
  children: JSX.Element,
  refetch: (e?: any) => void
}) => {
  const { colorMode } = useColorMode();
  const { border } = useMemo(() => {
    return {
      border: `${colorMode}.border`
    }
  }, [colorMode]);
  const toast = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [error, setError] = useState<null | string>(null);
  const [data, setData] = useState<{
    quantity: number,
    action: "set" | "add"
  }>({
    quantity: 0,
    action: "add"
  });
  const result = useMemo(() => {
    if (!item.pc_weight) {
      if (data.action === "set") return weightFormatter(data.quantity * 1000);
      return weightFormatter((data.quantity * 1000) + item.remaining);
    }
    const qty = data.action === "set" ? data.quantity : data.quantity + +(item.remaining / item.pc_weight).toFixed(0);
    return `${formatter(qty, "pc(s)")} x ${weightFormatter(item.pc_weight)} = ${weightFormatter(qty * item.pc_weight)}`
  }, [data, item]);

  const childWithOnClick = () => {
    return Children.map(children, child => {
      return cloneElement(child, { onClick: onOpen });
    });
  };


  const update = () => {
    import("./handlers").then(async resp => {
      const raw_qty = item.pc_weight ? data.quantity * item.pc_weight : data.quantity * 1000;
      const quantity = (data.action === "set" ? raw_qty : raw_qty + item.remaining) / 1000;
      const success = await resp.update(item.id, item.name, data.action, quantity, setError, setLoading, toast);
      if (success) {
        refetch();
        onClose();
        setData({
          quantity: 0,
          action: "add"
        });
      }
    });
  }

  const deleteMaterial = () => {
    import("./handlers").then(async resp => {
      const success = await resp.deleteMaterial(item.id, item.name, setLoading, toast);
      if (success) {
        refetch();
        onClose();
      }
    });
  }

  return <>
    {loading && <BackdropLoader text={loading} />}
    {childWithOnClick()}
    <MyModal
      size={"xl"}
      isOpen={isOpen}
      onClose={onClose}>
      <form
        onSubmit={e => {
          e.preventDefault();
        }} autoComplete="false">
        <ModalHeader borderBottom="1px solid" borderBottomColor={border}>Edit Raw-Material</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack gap={4} w="100%">
            <Text fontWeight={700} fontSize="3xl" textTransform={"uppercase"} textDecor="underline" py={3}>{item.name}{item.department ? ` (${item.department})` : ""}</Text>
            <SimpleGrid w="100%" columns={3} gap={4}>
              <FormControl>
                <FormLabel>Action</FormLabel>
                <PrimarySelect value={data.action} onChange={e => setData(prev => {
                  return {
                    ...prev,
                    action: e.target.value as ("set" | "add")
                  }
                })} name="action">
                  <option value="add">Add</option>
                  <option value="set">Set</option>
                </PrimarySelect>
              </FormControl>
              <GridItem colSpan={2}>
                <FormControl isInvalid={error !== null}>
                  <FormLabel>Quantity ({item.pc_weight ? "PCs" : "KGs"})</FormLabel>
                  <PrimaryNumberInput value={data.quantity} onChange={e => setData(prev => {
                    return {
                      ...prev,
                      quantity: +e
                    }
                  })} name="quantity" placeholder='Quantity' />
                  <FormErrorMessage>{error}</FormErrorMessage>
                </FormControl>
              </GridItem>
            </SimpleGrid>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <VStack w="100%" justifyContent={"center"}>
            <VStack opacity={0.8} fontSize="sm" w="100%" alignItems={"flex-start"}>
              <Text>Resulting Quantity: <strong style={{
                opacity: 1
              }}>{result}</strong></Text>
            </VStack>
            <Flex alignItems={"center"} justifyContent="space-between" w="100%">
              <ConfirmDialog onConfirm={deleteMaterial} scope="danger">
                <Button colorScheme={"red"} size="sm" variant={"outline"} rightIcon={<BiTrashAlt />}>Remove</Button>
              </ConfirmDialog>
              <Box>
                <ConfirmDialog onConfirm={update}>
                  <Primary mr={3}>Update</Primary>
                </ConfirmDialog>
                <Button onClick={onClose}>Cancel</Button>
              </Box>
            </Flex>
          </VStack>
        </ModalFooter>
      </form>
    </MyModal>
  </>
}

export default EditMaterialModal;
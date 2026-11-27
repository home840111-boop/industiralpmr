import { AlertDialogBody, AlertDialogCloseButton, AlertDialogFooter, AlertDialogHeader, AlertDialogProps, Button, useDisclosure } from "@chakra-ui/react"
import { cloneElement, isValidElement, useRef } from "react"
import { PrimaryBtn } from "../Buttons"
import MyAlert from "./MyAlert"

interface Props extends Omit<AlertDialogProps, "children" | "leastDestructiveRef" | "onClose" | "isOpen"> {
    heading?: string,
    text?: string,
    cancelButtonText?: string,
    confirmButtonText?: string,
    onConfirm?: () => any,
    scope?: "normal" | "danger",
    startOnMount?: boolean,
    children?: JSX.Element
}

const ConfirmDialog = ({
    heading = "Are you sure?",
    text = "Are you sure you want to continue with this action?",
    onConfirm,
    scope = "normal",
    children
}: Props) => {
    const { isOpen, onClose, onOpen } = useDisclosure();
    const cancelRef = useRef(null);
    const btn = isValidElement(children) ? cloneElement(children as JSX.Element, { onClick: onOpen }) : <Button onClick={onOpen}>Confirm</Button>;

    const confirm = () => {
        onConfirm?.();
        onClose();
    }

    return <>
        {btn}
        <MyAlert
            motionPreset='slideInBottom'
            leastDestructiveRef={cancelRef}
            onClose={onClose}
            isOpen={isOpen}
            isCentered>
            <AlertDialogHeader>{heading}</AlertDialogHeader>
            <AlertDialogCloseButton />
            <AlertDialogBody>{text}</AlertDialogBody>
            <AlertDialogFooter>
                <Button ref={cancelRef} onClick={onClose}>
                    No
                </Button>
                {
                    scope === "normal" ? <PrimaryBtn ml={3} onClick={confirm}>
                        Yes
                    </PrimaryBtn>
                        : <Button ml={3} colorScheme="red" onClick={confirm}>
                            Yes
                        </Button>
                }
            </AlertDialogFooter>
        </MyAlert>
    </>
}

export default ConfirmDialog
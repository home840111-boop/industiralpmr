import {
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    Box,
    Button,
    useDisclosure,
    useToast
} from "@chakra-ui/react"
import { FC, useRef } from "react";
import MyAlert from "../micro/MyAlert";

type IndexProps = {
    Trigger: JSX.Element;
};

const Logout: FC<IndexProps> = ({
    Trigger,
}) => {
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const cancelRef = useRef(null);

    const perform = () => {
        import("../firebase/api/auth").then(async auth => {
            await auth.logout();
            onClose();
            toast({
                title: "Logged out",
                description: "You have been logged out successfully.",
                status: "success",
                duration: 5000,
                isClosable: true
            });
        })
    };

    return <>
        <Box onClick={onOpen}>
            {Trigger}
        </Box>
        <MyAlert
            isOpen={isOpen}
            leastDestructiveRef={cancelRef}
            onClose={onClose}>
            <AlertDialogHeader fontSize='lg' fontWeight='bold'>
                Logout
            </AlertDialogHeader>
            <AlertDialogBody>
                Are you sure? You can't undo this action afterwards.
            </AlertDialogBody>
            <AlertDialogFooter>
                <Button ref={cancelRef} onClick={onClose}>
                    Cancel
                </Button>
                <Button colorScheme='red' onClick={perform} ml={3}>
                    Logout!
                </Button>
            </AlertDialogFooter>
        </MyAlert>
    </>

}
export default Logout;
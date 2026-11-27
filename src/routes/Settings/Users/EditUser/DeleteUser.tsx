import { AlertDialogBody, AlertDialogFooter, AlertDialogHeader, Button, useDisclosure, useToast } from '@chakra-ui/react'
import { useRef, useState } from 'react'
import { FiUserMinus } from 'react-icons/fi'
import PasswordReauthModal from '../../../../Components/Auth/PasswordReauthModal'
import BackdropLoader from '../../../../Components/Loaders/BackdropLoader'
import MyAlert from '../../../../Components/micro/MyAlert'
import { userType } from '../types'

const DeleteUser = ({
    user,
    refetch,
    close
}: {
    user: userType,
    refetch: Function,
    close: Function
}) => {
    const toast = useToast();
    const { isOpen, onClose, onOpen } = useDisclosure();
    const reauth = useDisclosure();
    const [loading, setLoading] = useState<string | null>(null);
    const cancelRef = useRef(null);

    const deleteUser = async () => {
        import("./handlers").then(async resp => {
            try {
                onClose();
                await resp.deleteUser(user.uid, setLoading);
                toast({
                    title: "Success",
                    description: "User has been deleted.",
                    status: "success",
                    duration: 5000,
                });
                refetch((prev: boolean) => !prev);
                close();
            } catch (err: any) {
                console.error(err);
                toast({
                    title: "Error",
                    description: err?.message || 'Something went wrong.',
                    status: "error",
                    duration: 5000,
                });
            }
        })
    }

    return <>
        {loading && <BackdropLoader text={loading} />}
        <Button onClick={onOpen} colorScheme={"red"} size="sm" variant={"outline"} rightIcon={<FiUserMinus />}>Delete User</Button>
        <MyAlert
            leastDestructiveRef={cancelRef}
            isOpen={isOpen}
            onClose={onClose}>
            <AlertDialogHeader fontSize='lg' fontWeight='bold'>
                Delete User
            </AlertDialogHeader>
            <AlertDialogBody>
                Are you sure? You can't undo this action afterwards.
            </AlertDialogBody>
            <AlertDialogFooter>
                <Button ref={cancelRef} onClick={onClose}>
                    Cancel
                </Button>
                <Button colorScheme='red' onClick={() => { onClose(); reauth.onOpen(); }} ml={3}>
                    Delete
                </Button>
            </AlertDialogFooter>
        </MyAlert>
        <PasswordReauthModal
            isOpen={reauth.isOpen}
            onClose={reauth.onClose}
            callback={deleteUser}
            description={`For security, enter your account password to permanently delete ${user.name}.`}
        />
    </>
}

export default DeleteUser
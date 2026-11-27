import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    Box,
    Input,
    FormLabel,
    FormControl,
    FormErrorMessage,
    useToast,
    useColorMode,
} from '@chakra-ui/react';
import { FC, useState } from 'react';
import { SecondaryBtn, PrimaryBtn } from '../../../Components/Buttons';
import { IoMdSend } from 'react-icons/io';

interface ForgotPassProps {
    Trigger: JSX.Element,
    disabled?: boolean
}
const ForgotPass: FC<ForgotPassProps> = ({
    Trigger,
    disabled = false
}) => {
    const toast = useToast();
    const {colorMode} = useColorMode();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [email, setEmail] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState<boolean>(false);

    const handle = () => {
        import("./handler").then(resp => {
            resp.default(email, setError, setSending, toast, onClose)
        }).catch(errors => {
            console.error(errors)
        })
    }

    return <>
        <Box onClick={disabled ? undefined : onOpen}>
            {Trigger}
        </Box>
        <Modal closeOnOverlayClick={!sending} closeOnEsc={!sending} isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent bgColor={`${colorMode}.popoverContentBgColor`}>
                <ModalHeader
                    borderBottom="1px solid"
                    borderColor={`${colorMode}.border`}
                    mb={5}>
                    Forgot Password
                </ModalHeader>
                <ModalCloseButton isDisabled={sending} />
                <ModalBody>
                    <FormControl mb={4} isInvalid={error !== null} isDisabled={sending}>
                        <FormLabel>
                            r email</FormLabel>
                        <Input
                            _focusVisible={{
                                borderColor: "primary"
                            }}
                            _focus={{
                                borderColor: "primary"
                            }}
                            onKeyPress={e => {
                                if (e.key === "Enter") {
                                    handle()
                                }
                            }}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            name="email"
                            placeholder="Email"
                            variant="filled"
                        />
                        <FormErrorMessage>{error}</FormErrorMessage>
                    </FormControl>
                </ModalBody>
                <ModalFooter>
                    <SecondaryBtn
                        isDisabled={sending}
                        mr={3}
                        onClick={onClose}>
                        Cancel
                    </SecondaryBtn>
                    <PrimaryBtn
                        onClick={handle}
                        isLoading={sending}
                        type="submit"
                        rightIcon={<IoMdSend />}>
                        Send Reset Link
                    </PrimaryBtn>
                </ModalFooter>
            </ModalContent>
        </Modal>
    </>
}

export default ForgotPass
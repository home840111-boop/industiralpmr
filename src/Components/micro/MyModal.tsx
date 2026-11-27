import { Modal, ModalContent, ModalOverlay, ModalProps, useColorMode } from '@chakra-ui/react'

interface props extends ModalProps {
    children: JSX.Element | JSX.Element[]
}

const MyModal = ({
    children,
    ...props
}: props) => {
    const { colorMode } = useColorMode();
    return <Modal
        {...props}>
        <ModalOverlay />
        <ModalContent bgColor={`${colorMode}.popoverContentBgColor`}>
            {children}
        </ModalContent>
    </Modal>
}

export default MyModal
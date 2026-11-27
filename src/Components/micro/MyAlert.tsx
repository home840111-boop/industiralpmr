import { AlertDialog, AlertDialogContent, AlertDialogOverlay, AlertDialogProps, useColorMode } from '@chakra-ui/react';

interface Props extends AlertDialogProps {
    children: JSX.Element | JSX.Element[]
};

const MyAlert = ({
    children,
    ...props
}: Props) => {
    const {colorMode} = useColorMode();

    return <AlertDialog
        {...props}>
        <AlertDialogOverlay>
            <AlertDialogContent bgColor={`${colorMode}.popoverContentBgColor`}>
                {children}
            </AlertDialogContent>
        </AlertDialogOverlay>
    </AlertDialog>
}

export default MyAlert
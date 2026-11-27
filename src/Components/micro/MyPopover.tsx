import { Popover, PopoverBody, PopoverContent, PopoverProps, PopoverTrigger, useColorMode, useDisclosure } from "@chakra-ui/react";
import { useMemo } from "react";

interface Props extends PopoverProps {
    children: [JSX.Element, JSX.Element],
}

const MyPopover = ({
    children,
    ...props
}: Props) => {
    const [trigger, body] = children;
    const { onClose, onOpen, isOpen } = useDisclosure();
    const { colorMode } = useColorMode();
    const { popoverContentBgColor } = useMemo(() => {
        return {
            popoverContentBgColor: `${colorMode}.popoverContentBgColor`,
        }
    }, [colorMode]);

    return <>
        <Popover
            isOpen={isOpen}
            onOpen={onOpen}
            onClose={onClose}
            {...props}>
            <PopoverTrigger>
                {trigger}
            </PopoverTrigger>
            <PopoverContent
                border={0}
                boxShadow={'xl'}
                bg={popoverContentBgColor}
                rounded={'md'}
                minW={'min-content'}
                maxW={'max-content'}>
                <PopoverBody>
                    {body}
                </PopoverBody>
            </PopoverContent>
        </Popover>
    </>
}

export default MyPopover
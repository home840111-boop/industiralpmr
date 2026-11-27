import { Flex, Popover, PopoverBody, PopoverContent, PopoverTrigger, Stack, Text, useColorMode, useDisclosure } from '@chakra-ui/react';
import { useMemo } from 'react'
import { IoIosArrowDown } from 'react-icons/io';

type views = "ontime" | "electricity";
const Selector = ({
    view,
    setView
}: {
    view: views;
    setView: (view: views) => void;
}) => {
    const { onClose, onOpen, isOpen } = useDisclosure();
    const { colorMode } = useColorMode();
    const { popoverContentBgColor, hoverColor } = useMemo(() => {
        return {
            popoverContentBgColor: `${colorMode}.popoverContentBgColor`,
            hoverColor: `${colorMode}.popOverHoverColor`
        }
    }, [colorMode]);

    return <Flex
        gap={1}
        alignItems={"center"}>
        <Text
            opacity={0.9}
            fontWeight="bold"
            letterSpacing={"wider"}
            fontSize="xs">SHOW:</Text>
        <Popover
            isOpen={isOpen}
            onOpen={onOpen}
            onClose={onClose}>
            <PopoverTrigger>
                <Text
                    gap={1}
                    alignItems={"center"}
                    display={"flex"}
                    textTransform={"capitalize"}
                    opacity={0.8}
                    fontSize="xs"
                    fontWeight="medium"
                    letterSpacing={"wider"}
                    cursor="pointer">{view} <IoIosArrowDown /></Text>
            </PopoverTrigger>
            <PopoverContent
                border={0}
                boxShadow={'xl'}
                bg={popoverContentBgColor}
                p={1.5}
                rounded={'md'}
                maxW={'max-content'}>
                <PopoverBody>
                    {(["ontime", "electricity"]).map((item) => <Stack key={item}>
                        <Text
                            onClick={() => {
                                onClose();
                                setView(item as views)
                            }}
                            cursor="pointer"
                            _hover={{
                                bg: hoverColor,
                                color: "orange.400"
                            }}
                            p={1}
                            textTransform={"capitalize"}
                            rounded={'md'}
                            fontSize="xs"
                            fontWeight="medium"
                            letterSpacing={"wider"}>{item}</Text>
                    </Stack>
                    )}
                </PopoverBody>
            </PopoverContent>
        </Popover>
    </Flex>
}

export default Selector
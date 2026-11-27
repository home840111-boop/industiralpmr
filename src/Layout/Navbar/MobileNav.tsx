import {
    Box,
    Drawer,
    DrawerContent,
    Flex,
    FlexProps,
    BoxProps,
    Image,
    Icon,
    Text,
    IconButton,
    Link,
    Accordion,
    AccordionItem,
    AccordionButton,
    AccordionIcon,
    AccordionPanel,
    useColorMode,
    Center
} from '@chakra-ui/react'
import { FC, useMemo } from 'react';
import NAV_ITEMS from './navItems';
import FullLogo from '../../Assets/Logo/ipmr-full.svg';
import { Link as LinkDOM, useLocation } from 'react-router-dom';
import { IconType } from 'react-icons/lib';
import {
    ColorModeSwitcher
} from "./IconButtons";
import {
    FaArrowLeft
} from "react-icons/fa";
import FactorySelector from './FactorySelector';
import useNavAvailability from './useNavAvailability';

interface MobileProps {
    isOpen: boolean;
    onClose: () => void;
}
const MobileNav: FC<MobileProps> = ({ isOpen, onClose, ...rest }: MobileProps) => {
    return <Drawer
        autoFocus={false}
        placement="left"
        isOpen={isOpen}
        onClose={onClose}
        returnFocusOnClose={false}
        onOverlayClick={onClose}
        size="full">
        <DrawerContent>
            <SidebarContent onClose={onClose} />
        </DrawerContent>
    </Drawer>
}

interface SidebarProps extends BoxProps {
    onClose: () => void;
}
const SidebarContent = ({ onClose, ...rest }: SidebarProps) => {
    const { colorMode } = useColorMode();
    const { pathname } = useLocation();
    const isAvailable = useNavAvailability();
    const { bgColor, borderColor, iconColor } = useMemo(() => {
        return {
            bgColor: `${colorMode}.navBG`,
            borderColor: `${colorMode}.border`,
            iconColor: `${colorMode}.navText`
        }
    }, [colorMode]);

    return <Box
        bg={bgColor}
        w={{ base: 'full', md: 60 }}
        pos="fixed"
        h="full"
        {...rest}>
        <Box
            borderBottom={"1px solid"}
            borderBottomColor={borderColor}
            mb="20px"
            mt="10px"
            h="20"
            mx="4">
            <Flex
                my="4"
                alignItems="center"
                justifyContent="space-between">
                <IconButton
                    aria-label="Close Menu"
                    icon={<FaArrowLeft />}
                    onClick={onClose}
                    variant="ghost"
                    color={iconColor}
                />
                <Image
                    position="absolute"
                    left="50%"
                    transform="translateX(-50%)"
                    w="50%"
                    h="auto"
                    src={FullLogo}
                    alt="Logo" />
                <ColorModeSwitcher />
            </Flex>
            <Center>
                <FactorySelector />
            </Center>
        </Box>
        <Accordion allowMultiple>
            {NAV_ITEMS.map((link) => (
                <NavItem key={link.label} icon={link.icon} to={link.to} label={link.label} subElements={link.subElements?.map(e => ({ ...e, disabled: !isAvailable(e) }))} pathname={pathname} />
            ))}
        </Accordion>
    </Box>
};

interface NavItemProps extends FlexProps {
    icon: IconType;
    to: string;
    label: string;
    subElements?: Array<NavItemProps>;
    pathname?: string;
    disabled?: boolean;
}
const NavItem = ({ icon, children, label, to, subElements, pathname, disabled, ...rest }: NavItemProps) => {
    const { colorMode } = useColorMode();
    const isActive = pathname === to;
    const activeColor = "primary";
    const { color } = useMemo(() => {
        return {
            color: `${colorMode}.navText`
        }
    }, [colorMode]);

    return <AccordionItem
        borderRadius={"md"}
        mx={4}
        border={0}>
        <Flex
            p="4"
            alignContent={"center"}
            justifyContent={"space-between"}
            {...rest}>
            <Link
                as={disabled ? 'span' : LinkDOM}
                w={"100%"}
                h="100%"
                style={{ textDecoration: 'none', ...(disabled ? { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' } : {}) }}
                _focus={{ boxShadow: 'none' }}
                aria-disabled={disabled || undefined}
                {...(disabled ? {} : { to })}>
                <Flex
                    align="center"
                    borderRadius="lg"
                    role="group"
                    cursor="pointer">
                    {icon && <Icon
                        color={isActive ? activeColor : color}
                        mr="4"
                        fontSize="20"
                        as={icon}
                    />}
                    <Text
                        color={isActive ? activeColor : color}
                        fontWeight={500}>{label}</Text>
                </Flex>
            </Link>
            {subElements && <AccordionButton
                w="min-content"
                h='min-content'
                mx={0}
                p={0}
                borderRadius={"md"}
                _hover={{
                    bgColor: "transparent"
                }}
                alignContent={"center"}
                justifyContent={"flex-end"}
                display="flex">
                <AccordionIcon w={5} h={5} />
            </AccordionButton>}
        </Flex>
        <AccordionPanel pb={4}>
            {subElements && subElements.map(element => <NavItem key={element.label} icon={element.icon} label={element.label} to={element.to} pathname={pathname} disabled={element.disabled} />)}
        </AccordionPanel>
    </AccordionItem>
};

export default MobileNav;
import {
  Box,
  Flex,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Stack,
  Text,
  Icon,
  Link as ChakraLink,
  useColorMode,
  HStack,
} from '@chakra-ui/react'
import { BiChevronDown, BiChevronRight } from 'react-icons/bi';
import NAV_ITEMS from './navItems';
import { Link, useLocation } from "react-router-dom";
import { IconType } from 'react-icons';
import { useMemo } from 'react';
import FactorySelector from './FactorySelector';
import useNavAvailability from './useNavAvailability';


const DesktopNav = () => {
  const { pathname } = useLocation();
  const { colorMode } = useColorMode();
  const { linkColor, linkHoverColor, popoverContentBgColor } = useMemo(() => {
    return {
      linkColor: `${colorMode}.navText`,
      linkHoverColor: `primary`,
      popoverContentBgColor: `${colorMode}.popoverContentBgColor`
    }
  }, [colorMode]);
  const activeColor = "primary";
  const isAvailable = useNavAvailability();

  return <HStack justify={"space-between"} w="100%" minW={0} spacing={2}>
    <Stack direction={'row'} spacing={{ md: 1, lg: 2, xl: 4 }} alignItems={"center"} flexWrap="nowrap" minW={0}>
      {NAV_ITEMS.map((navItem) => (
        <Box key={navItem.label} flexShrink={0}>
          <Popover trigger={'hover'} placement={'bottom-start'}>
            <PopoverTrigger>
              <ChakraLink
                as={Link}
                display={'block'}
                p={{ md: 1.5, lg: 2 }}
                to={navItem.to}
                whiteSpace="nowrap"
                fontSize={{ md: 'xs', lg: 'sm' }}
                fontWeight={500}
                color={pathname === navItem.to ? activeColor : linkColor}
                _hover={{
                  textDecoration: 'none',
                  color: linkHoverColor
                }}>
                <Flex
                  transition={'all .3s ease'}
                  justify={'space-between'}
                  gap={1}
                  align={'center'}>
                  <Icon w={4} h={4} as={navItem.icon} display={{ base: 'none', lg: 'block' }} />
                  {navItem.label}
                  {navItem.subElements && <Icon w={{ md: 4, lg: 5 }} h={{ md: 4, lg: 5 }} as={BiChevronDown} />}
                </Flex>
              </ChakraLink>
            </PopoverTrigger>
            {navItem.subElements && (
              <PopoverContent
                border={0}
                boxShadow={'xl'}
                bg={popoverContentBgColor}
                p={2}
                rounded={'md'}
                maxW={'max-content'}>
                <Stack>
                  {navItem.subElements.map(element => (
                    <DesktopSubNav key={element.label} pathname={pathname} disabled={!isAvailable(element)} {...element} />
                  ))}
                </Stack>
              </PopoverContent>
            )}
          </Popover>
        </Box>
      ))}
    </Stack>
    <Box flexShrink={0}>
      <FactorySelector />
    </Box>
  </HStack>
}

interface DesktopSubNavProps {
  label: string;
  subLabel?: string;
  to: string;
  icon: IconType;
  pathname: string;
  disabled?: boolean;
}
const DesktopSubNav = ({ label, to, subLabel, icon, pathname, disabled }: DesktopSubNavProps) => {
  const { colorMode } = useColorMode();
  const isActive = pathname === to;
  const activeColor = "primary";
  const { hoverColor } = useMemo(() => {
    return {
      hoverColor: `${colorMode}.popOverHoverColor`
    }
  }, [colorMode]);
  if (disabled) {
    return (
        <Flex
          p={2}
          gap={2}
          alignItems={'center'}
          rounded={'md'}
          opacity={0.4}
          cursor={'not-allowed'}
          aria-disabled={true}>
          <Icon w={4} h={4} as={icon} />
          <Text fontSize={'sm'} fontWeight={500}>{label}</Text>
        </Flex>
    );
  }
  return (
    <ChakraLink
      as={Link}
      to={to}
      role={'group'}
      display={'block'}
      p={2}
      rounded={'md'}
      color={isActive ? activeColor : "inherit"}
      _hover={{ bg: hoverColor }}>
      <Stack direction={'row'} align={'center'}>
        <Flex
          gap={2}
          alignItems={'center'}
          flexDir={"row"}>
          <Icon _groupHover={{ color: "orange.400" }} w={4} h={4} as={icon} />
          <Box>
            <Text
              fontSize={'sm'}
              transition={'all .3s ease'}
              _groupHover={{ color: 'orange.400' }}
              fontWeight={500}>
              {label}
            </Text>
            <Text fontSize={'sm'}>{subLabel}</Text>
          </Box>
        </Flex>
        <Flex
          transition={'all .3s ease'}
          transform={'translateX(-10px)'}
          opacity={0}
          _groupHover={{ opacity: '100%', transform: 'translateX(0)' }}
          justify={'flex-end'}
          align={'center'}
          flex={1}>
          <Icon color={'orange.400'} w={5} h={5} as={BiChevronRight} />
        </Flex>
      </Stack>
    </ChakraLink>
  );
};

export default DesktopNav;
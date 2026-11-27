import { FC, useState, Suspense, useMemo, useEffect } from "react";
import {
  useColorMode,
  useColorModeValue,
  IconButton,
  IconButtonProps,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  HStack,
  Avatar,
  VStack,
  Text,
  Box,
  Skeleton,
  useDisclosure,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Button,
  Link
} from "@chakra-ui/react";
import {
  BiExitFullscreen,
  BiFullscreen,
  BiMoon,
  BiSun,
  BiChevronDown
} from "react-icons/bi";
import { companyNameAtom, departmentAtom, roleAtom, UserRole } from "../../../Components/Store/atoms";
import Get from "../../../Components/Store/hooks/Get";
import Logout from "../../../Components/Logout";
import { BsQrCodeScan } from "react-icons/bs";
import MyModal from "../../../Components/micro/MyModal";
import { FaGooglePlay } from "react-icons/fa";
import { SiAppstore } from "react-icons/si";
import QRCodeSvg from "./onelinkto_k3rytb.svg";

type ColorModeSwitcherProps = Omit<IconButtonProps, "aria-label">
export const ColorModeSwitcher: FC<ColorModeSwitcherProps> = props => {
  const { toggleColorMode, colorMode } = useColorMode();
  const SwitchIcon = useColorModeValue(BiMoon, BiSun);
  const { color, hoverBG, hoverColor } = useMemo(() => {
    return {
      color: `${colorMode}.navText`,
      hoverBG: `${colorMode}.hoverBG`,
      hoverColor: `${colorMode}.hoverColor`
    }
  }, [colorMode]);

  return <IconButton
    size="md"
    fontSize="lg"
    variant="ghost"
    color={color}
    _hover={{
      bg: hoverBG,
      color: hoverColor
    }}
    marginLeft="2"
    onClick={toggleColorMode}
    icon={<SwitchIcon />}
    aria-label={`Switch to ${colorMode} mode`}
    {...props}
  />
}

const PLAYSTORE_URL = "https://play.google.com/store/apps/details?id=com.industrialpmr";
const APPSTORE_URL = "https://apps.apple.com/pk/app/industrialpmr/id6744401857";

export const GetAppQR: FC = props => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { colorMode } = useColorMode();
  
  const { color, hoverBG, hoverColor } = useMemo(() => {
    return {
      color: `${colorMode}.navText`,
      hoverBG: `${colorMode}.hoverBG`,
      hoverColor: `${colorMode}.hoverColor`
    }
  }, [colorMode]);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    const agentData = (navigator as any || {}).userAgentData || {};
    const platform = agentData.platform;
    let timeout: NodeJS.Timeout;
    
    if (String(platform).toLowerCase() === "android" || isIOSDevice) {
      timeout = setTimeout(onOpen, 2000);
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }, [onOpen]);

  return <>
    <MyModal
      isCentered
      size="lg"
      isOpen={isOpen}
      onClose={onClose}>
      <ModalHeader>Get the industrialpmr app</ModalHeader>
      <ModalCloseButton />
      <ModalBody pb={6}>
        <VStack gap={4}>
          <Text textAlign="center">
            Scan this QR code to<br />download the app from Google Play/App Store
          </Text>
          <Box bgColor="white" p={2} borderRadius="md">
            <img 
              src={QRCodeSvg} 
              alt="Download industrialpmr app"
              width="256"
              height="256"
            />
          </Box>
          <Text textAlign="center">
            Or check it out in the app stores
          </Text>
          <HStack gap={4} justify="center">
            <Link href={PLAYSTORE_URL} isExternal>
              <Button colorScheme={"orange"} leftIcon={<FaGooglePlay />} height="50px" minW="140px">
                <Box textAlign="left">
                  <Text fontSize="x-small" textTransform={"uppercase"} fontWeight={400}>get it on</Text>
                  <Text fontSize="md" textTransform={"capitalize"} fontWeight={500}>google play</Text>
                </Box>
              </Button>
            </Link>
            <Link href={APPSTORE_URL} isExternal>
              <Button colorScheme={"blue"} leftIcon={<SiAppstore />} height="50px" minW="140px">
                <Box textAlign="left">
                  <Text fontSize="x-small" textTransform={"uppercase"} fontWeight={400}>get it on</Text>
                  <Text fontSize="md" textTransform={"capitalize"} fontWeight={500}>app store</Text>
                </Box>
              </Button>
            </Link>
          </HStack>
        </VStack>
      </ModalBody>
    </MyModal>
    <IconButton
      size="md"
      fontSize="lg"
      variant="ghost"
      color={color}
      _hover={{
        bg: hoverBG,
        color: hoverColor
      }}
      marginLeft="2"
      onClick={onOpen}
      icon={<BsQrCodeScan />}
      aria-label={`Get industrialpmr App Modal`}
      {...props}
    />
  </>
}

export const AccountButton: FC = () => {
  const { colorMode } = useColorMode();
  const { textColor, bgColor, hoverBgColor, border } = useMemo(() => {
    return {
      textColor: `${colorMode}.accountText`,
      bgColor: `${colorMode}.accountBG`,
      hoverBgColor: `${colorMode}.accountHoverBG`,
      border: `${colorMode}.border`
    }
  }, [colorMode]);
  const companyName = Get(companyNameAtom);
  const role = Get(roleAtom);
  const department = Get(departmentAtom);

  const userState: {
    company_name: string,
    role: UserRole,
    department: string[]
  } = useMemo(() => {
    return {
      company_name: companyName || "",
      role: role || "viewer",
      department: department || [""]
    }
  }, [companyName, role, department]);

  return <Menu>
    <MenuButton
      py={2}
      transition="all 0.3s"
      _focus={{ boxShadow: 'none' }}
    >
      <HStack ml={2}>
        <Avatar
          bgColor={'gray.500'}
          size={'sm'}
        />
        <VStack
          display={{ base: 'none', lg: 'flex' }}
          alignItems="flex-start"
          spacing="1px"
          ml="3">
          {userState.company_name !== "" ? <Text
            color={textColor}
            fontWeight={500}
            maxW="100px"
            textTransform={"capitalize"}
            title={userState.company_name || undefined}
            isTruncated
            fontSize="sm">
            {userState.company_name}
          </Text> : <Skeleton mb={0} h={"20px"} w={"100px"} />}
          {<Text fontSize="xs" color={textColor} textTransform="capitalize">
            {`${userState.role} - ${userState.department.join(", ")}`}
          </Text>}
        </VStack>
        <Box display={{ base: 'none', lg: 'flex' }}>
          <BiChevronDown />
        </Box>
      </HStack>
    </MenuButton>
    <MenuList
      borderColor={border}
      bgColor={bgColor}>
      <MenuItem bgColor={bgColor}>
        <HStack
          w="100%"
          justifyContent={"space-between"}
          alignItems="center"
          spacing="1px">
          {userState.company_name !== "" ? <Text
            color={textColor}
            fontWeight={500}
            maxW="200px"
            textTransform={"capitalize"}
            title={userState.company_name || undefined}
            isTruncated
            fontSize="sm">
            {userState.company_name}
          </Text> : <Skeleton mb={0} h={"20px"} w={"100px"} />}
          {<Text fontSize="xs" color={textColor} textTransform="capitalize">
            {`${userState.role} - ${userState.department.join(", ")}`}
          </Text>}
        </HStack>
      </MenuItem>
      <MenuDivider />
      <Suspense fallback={<div>loading...</div>}>
        <Logout Trigger={<MenuItem
          bgColor={bgColor}
          _hover={{
            bgColor: hoverBgColor
          }}>Signout</MenuItem>} />
      </Suspense>
    </MenuList>
  </Menu>
}

export const FullScreenButton: FC = () => {
  const { colorMode } = useColorMode();
  const { color, hoverBG, hoverColor } = useMemo(() => {
    return {
      color: `${colorMode}.navText`,
      hoverBG: `${colorMode}.hoverBG`,
      hoverColor: `${colorMode}.hoverColor`
    }
  }, [colorMode]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  useEffect(() => {
    const callback = () => {
      setIsFullScreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", callback);
    return () => {
      document.removeEventListener("fullscreenchange", callback);
    }
  }, []);
  const toggleFullScreen = () => {
    if (!isFullScreen) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  }

  return <IconButton
    size="md"
    fontSize="lg"
    variant="ghost"
    color={color}
    _hover={{
      bg: hoverBG,
      color: hoverColor
    }}
    onClick={toggleFullScreen}
    marginLeft="2"
    icon={isFullScreen ? <BiExitFullscreen /> : <BiFullscreen />}
    aria-label={`Toggle Fullscreen`}
  />
}
import { FC, Suspense, useEffect, useMemo } from "react";
import {
  Box,
  Flex,
  IconButton,
  useDisclosure,
  useBreakpointValue,
  Image,
  HStack,
  useMediaQuery,
  useColorMode
} from "@chakra-ui/react";
import FullLogo from "../../Assets/Logo/ipmr-full.svg";
import IconLogo from "../../Assets/Logo/ipmr-icon.svg";
import {
  ColorModeSwitcher,
  AccountButton,
  FullScreenButton,
  GetAppQR
} from "./IconButtons";
import { FiMenu } from "react-icons/fi";
import Notifications from "./Notifications";
import { useLocation } from "react-router-dom";
import SearchBar from "./SearchBar";
import MobileNav from "./MobileNav";
import DesktopNav from "./DesktopNav";
import Get from "../../Components/Store/hooks/Get";
import { isWebViewAppAtom } from "../../Components/Store/atoms";

type breakPointProps = {
  logoImage?: string,
  btnDisplay?: string
};

const Navbar: FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { colorMode } = useColorMode();
  const [isLargerThan768] = useMediaQuery("(min-width: 768px)");
  const { logoImage, btnDisplay }: breakPointProps = useBreakpointValue({
    base: { logoImage: IconLogo, btnDisplay: "none" },
    md: { logoImage: FullLogo, btnDisplay: "flex" }
  }) || {};
  const isWebViewinApp = Get(isWebViewAppAtom);
  const { bgColor, color, borderColor } = useMemo(() => {
    return {
      bgColor: `${colorMode}.navBG`,
      color: `${colorMode}.navText`,
      borderColor: `${colorMode}.border`,
    };
  }, [colorMode]);
  const { pathname } = useLocation();
  useEffect(() => {
    setTimeout(onClose, 250);
  }, [pathname, onClose]);

  return <Box boxShadow={"0 2px 4px rgb(15 34 58 / 12%)"}>
    <Flex
      bg={bgColor}
      color={color}
      minH={'50px'}
      py={{ base: 2 }}
      px={{ base: 5, md: 6, lg: 10, xl: 20 }}
      borderBottom={1}
      borderStyle={'solid'}
      borderColor={borderColor}
      align={'center'}>
      <Flex
        flex={{ base: 0.5, md: 'auto' }}
        ml={{ base: -2 }}
        display={{ base: 'flex', md: 'none' }}>
        <IconButton
          variant="outline"
          onClick={onOpen}
          icon={<FiMenu />}
          aria-label={'Toggle Navigation'}
        />
        {
          isLargerThan768 || <Suspense fallback={<div>Loading...</div>}>
            <MobileNav isOpen={isOpen} onClose={onClose} />
          </Suspense>
        }
      </Flex>
      <Flex flex={{ base: 1 }} minW={0} justify={{ base: 'center', md: 'start' }} align="center">
        <Image
          src={logoImage}
          alt="IPMR Logo"
          height="50px"
          width="auto"
          flexShrink={0}
          loading="lazy"
          padding={"5px"}
        />
        <SearchBar />
      </Flex>
      <HStack spacing={2} flexShrink={0}>
        <Box display={btnDisplay}>
          <FullScreenButton />
          <ColorModeSwitcher />
        </Box>
        {isWebViewinApp === false ? <GetAppQR /> : null}
        <Notifications />
        <AccountButton />
      </HStack>
    </Flex>
    <Flex
      py={{ base: 2 }}
      px={{ md: 6, lg: 10, xl: 20 }}
      h="50px"
      bgColor={bgColor}
      display={{ base: 'none', md: 'flex' }}>
      {
        isLargerThan768 && <Suspense fallback={<div>Loading...</div>}>
          <DesktopNav />
        </Suspense>
      }
    </Flex>
  </Box>
}

export default Navbar

import {
  Flex,
  Box,
  FormControl,
  FormLabel,
  Input,
  Checkbox,
  Stack,
  Link,
  Heading,
  Image,
  FormErrorMessage,
  useToast,
  InputGroup,
  InputRightElement,
  Button,
  useColorMode
} from '@chakra-ui/react';
import { PrimaryBtn } from '../../Components/Buttons';
import FulLogo from "../../Assets/Logo/ipmr-full.svg";
import { FormEvent, useMemo, useState } from 'react';
import { FiLogIn } from 'react-icons/fi';
import ForgotPass from './ForgotPassword';

interface stateSchema {
  email: null | string,
  password: null | string,
  remember_me: null | string
}
interface colorModeProps {
  boxBG?: string,
  bgColor?: string,
  color?: string
}

const Login = () => {
  const toast = useToast();
  const { colorMode } = useColorMode();
  const { boxBG, bgColor, color } = useMemo<colorModeProps>(() => {
    return {
      boxBG: `${colorMode}.popoverContentBgColor`,
      bgColor: `${colorMode}.bg`,
      color: `${colorMode}.navText`
    }
  }, [colorMode])
  const [errors, setErrors] = useState<stateSchema>({
    email: null,
    password: null,
    remember_me: null
  });
  const [loggingIn, setLoggingIn] = useState<boolean>(false);
  const [show, setShow] = useState<boolean>(false)
  const handleClick = () => setShow(!show);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    import("./handler").then(resp => {
      resp.default(e, setErrors, setLoggingIn, toast)
    }).catch(errors => {
      console.error(errors)
    })
  }

  return <Flex
    minH={'100vh'}
    align={'center'}
    justify={'center'}
    bg={bgColor}>
    <Stack spacing={8} mx={'auto'} maxW={'xl'} py={12} px={6}>
      <Stack align={'center'} mx={2}>
        <Image mb="20px" w="300px" alt='ipmr logo' src={FulLogo} />
        <Heading fontSize={'4xl'} color={color}>Sign in to your Dashboard</Heading>
      </Stack>
      <Box
        color={color}
        rounded={'lg'}
        bg={boxBG}
        boxShadow={'lg'}
        p={8}>
        <form onSubmit={submit}>
          <Stack spacing={4}>
            <FormControl isDisabled={loggingIn} isInvalid={errors.email !== null}>
              <FormLabel>Email address</FormLabel>
              <Input
                _focusVisible={{
                  borderColor: "primary"
                }}
                _focus={{
                  borderColor: "primary"
                }}
                name="email" />
              <FormErrorMessage>{errors.email}</FormErrorMessage>
            </FormControl>
            <FormControl isDisabled={loggingIn} isInvalid={errors.password !== null}>
              <FormLabel>Password</FormLabel>
              <InputGroup size='md'>
                <Input
                  _focusVisible={{
                    borderColor: "primary"
                  }}
                  _focus={{
                    borderColor: "primary"
                  }}
                  name='password'
                  type={show ? 'text' : 'password'} />
                <InputRightElement width='4.5rem'>
                  <Button h='1.75rem' size='sm' onClick={handleClick}>
                    {show ? 'Hide' : 'Show'}
                  </Button>
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.password}</FormErrorMessage>
            </FormControl>
            <Stack spacing={10}>
              <Stack
                direction={{ base: 'column', sm: 'row' }}
                align={'start'}
                justify={'space-between'}>
                <FormControl isDisabled={loggingIn} isInvalid={errors.remember_me !== null} w="max-content">
                  <Checkbox name='remember_me' defaultChecked colorScheme={"orange"}>Remember me</Checkbox>
                  <FormErrorMessage>{errors.remember_me}</FormErrorMessage>
                </FormControl>
                <ForgotPass disabled={loggingIn} Trigger={<Link
                  color={loggingIn ? "gray.400" : 'blue.400'}
                  _hover={{
                    color: loggingIn ? "gray.400" : 'blue.600',
                    cursor: loggingIn ? "not-allowed" : "pointer"
                  }}>Forgot password?</Link>} />
              </Stack>
              <PrimaryBtn
                isLoading={loggingIn}
                w='fit-content'
                rightIcon={<FiLogIn />}
                type="submit">
                Sign in
              </PrimaryBtn>
            </Stack>
          </Stack>
        </form>
      </Box>
    </Stack>
  </Flex>
}

export default Login;
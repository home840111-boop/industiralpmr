import { Center, Flex, Heading, Icon } from "@chakra-ui/react"
import { Helmet } from "react-helmet";
import { VscDebugDisconnect } from "react-icons/vsc"

const NotFound = ({
  text = "404 - Not Found"
}: {
  text?: string;
}) => {
  return <Center minH="60vh">
    <Helmet>
      <title>Not Found | industrialpmr</title>
    </Helmet>
    <Flex
      fontSize={{
        base: "1.5rem",
        md: "2rem"
      }}
      justifyContent={"center"}
      alignItems="center"
      textAlign={"center"}
      gap="3">
      <Icon as={VscDebugDisconnect} fontSize={{
        base: "3rem",
        md: "4rem"
      }} />
      <Heading>{text}</Heading>
    </Flex>
  </Center>
}

export default NotFound
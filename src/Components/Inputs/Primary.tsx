import {
  Input,
  InputProps,
} from "@chakra-ui/react"

interface props extends InputProps {
  placeholder: string
}
const Primary = ({
  ...props
}: props) => {

  return <Input
    focusBorderColor={"primary"}
    {...props}
  />
}

export default Primary
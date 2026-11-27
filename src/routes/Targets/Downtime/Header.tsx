import { Flex } from "@chakra-ui/react"
import { DateRange } from "react-day-picker"
import CustomDatePicker from "../../../Components/micro/CustomDatePicker"

const Header = ({
    setDate
}: {
    setDate: (date: DateRange | undefined) => void
}) => {
    return <Flex
        mb={5}
        flexDir={{
            base: 'column-reverse',
            md: 'row'
        }}
        gap={{
            base: 3,
            md: 0
        }}
        justifyContent="flex-end"
        alignItems={'center'}>
        <Flex
            flexDir={{
                base: 'column',
                md: 'row'
            }}
            gap={5}>
            <CustomDatePicker set={setDate} />
        </Flex>
    </Flex>
}

export default Header
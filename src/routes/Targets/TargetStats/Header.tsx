import { Flex } from "@chakra-ui/react"
import CustomMonthPicker from "../../../Components/micro/CustomDatePicker/CustomMonthPicker"

const Header = ({
    setMonth
}: {
    setMonth: (val: {
        from: string | undefined,
        to: string | undefined
    }) => void
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
            <CustomMonthPicker set={e => setMonth({
                from: e?.from,
                to: e?.to
            })} />
        </Flex>
    </Flex>
}

export default Header
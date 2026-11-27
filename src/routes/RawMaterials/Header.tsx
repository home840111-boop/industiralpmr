import { Flex } from "@chakra-ui/react";
import { SelectedTime } from ".";
import CustomSelector from "../../Components/micro/CustomSelector";

const Header = ({
    departments,
    selectedDepart,
    changeSelectedDepart,
    selectedTime,
    changeSelectedTime
}: {
    departments: string[],
    selectedDepart: SelectedTime,
    changeSelectedDepart: (time: string) => void,
    selectedTime: SelectedTime,
    changeSelectedTime: (time: string) => void
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
        justifyContent="space-between"
        alignItems={'center'}>
        <CustomSelector
            text={selectedDepart.text}
            options={["ALL", ...departments]}
            selected={selectedDepart.value}
            setOption={changeSelectedDepart}
        />
        <CustomSelector
            text={selectedTime.text}
            options={[
                "Last 7 days",
                "Last 30 days",
                "Last 90 days",
            ]}
            selected={selectedTime.value}
            setOption={changeSelectedTime}
        />
    </Flex>
}

export default Header
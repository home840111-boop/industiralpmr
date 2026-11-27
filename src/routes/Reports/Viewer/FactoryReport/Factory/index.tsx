import { DataToSet } from ".."
import FactoryHourly from "./Hourly"
import { FactoryTotal } from "./Total"

const Factory = ({
    data,
    isSingleDay
}: {
    data: DataToSet,
    isSingleDay: boolean
}) => {
    return <>
        <FactoryTotal data={data} />
        <FactoryHourly isSingleDay={isSingleDay} hours={data.hours} />
    </>
}

export default Factory
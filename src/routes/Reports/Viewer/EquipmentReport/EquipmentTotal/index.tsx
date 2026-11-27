import { DataToSet } from ".."
import EquipmentHourlyChart from "./Hourly"
import Total from "./Total"

const EquipmentTotal = ({
    isSingleDay,
    data
}: {
    isSingleDay: boolean,
    data: DataToSet
}) => {
    return <>
        <Total data={data} />
        <EquipmentHourlyChart hours={data.hours} isSingleDay={isSingleDay} />
    </>
}

export default EquipmentTotal
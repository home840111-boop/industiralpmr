import { DataToSet } from "..";
import EquipmentHours from "./EquipmentHours";
import EquipmentTotal from "./Total";

const Equipment = ({
    data,
    isSingleDay
}: {
    data: DataToSet,
    isSingleDay: boolean
}) => {

    return <>
        <EquipmentTotal data={data} />
        <EquipmentHours isSingleDay={isSingleDay} hours={data.equipmentHours} />
    </>
};

export default Equipment;
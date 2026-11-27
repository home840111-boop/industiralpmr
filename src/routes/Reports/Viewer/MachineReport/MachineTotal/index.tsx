import { DataToSet } from ".."
import { PlannedDowntime } from "../Downtime/types"
import MoldsWorked from "../MoldsWorked"
import MachineHourlyChart from "./Hourly"
import Total from "./Total"

const MachineTotal = ({
    isSingleDay,
    data,
    rejectedPieces,
    plannedDowntime,
    shiftPlannedDowntime
}: {
    isSingleDay: boolean,
    data: DataToSet,
    rejectedPieces?: {
        pieces: number;
        reason: string;
    } | null;
    plannedDowntime?: PlannedDowntime;
    shiftPlannedDowntime?: Record<"A" | "B" | "C", PlannedDowntime>;
}) => {
    return <>
        <Total 
            data={data} 
            rejectedPieces={rejectedPieces?.pieces} 
            rejectedReason={rejectedPieces?.reason} 
            plannedDowntime={plannedDowntime}
            shiftPlannedDowntime={shiftPlannedDowntime}
        />
        <MoldsWorked isSingleDay={isSingleDay} molds={data.molds} rejectedPieces={rejectedPieces?.pieces} />
        <MachineHourlyChart hours={data.hours} isSingleDay={isSingleDay} />
    </>
}

export default MachineTotal
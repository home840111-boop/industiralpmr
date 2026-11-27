import { MachinesData } from ".";
import { get } from "../../../Components/firebase/api/db";
import store from "../../../Components/Store";
import { machinesAtom } from "../../../Components/Store/atoms";
import { isMasterOwner } from "../../../Services/rbac";

const fetch = async (factory: any) => {
  const promises = [get("machines"), get("info/shifts")];
  const [machinesSnap, shiftsSnap] = await Promise.all(promises);
  const shifts = +(shiftsSnap.val() || 1);
  const machinesData = machinesSnap.val() || {};
  const machines = Object.entries(machinesData).sort(
    (a: any, b: any) => a[1].sort - b[1].sort,
  );
  const restrictScope = !isMasterOwner();
  const allowedMachines = store.get(machinesAtom) || {};
  const machinesToSend: MachinesData = {};
  let index = 0;
  for await (const [machineID, _machine] of machines) {
    if (restrictScope && !allowedMachines[machineID]) continue;
    if (factory && !factory.machines.includes(machineID)) continue;
    const machine = _machine as any;
    machinesToSend[machineID] = {
      id: machineID,
      name: machine.machine_model,
      machineType: (machine.machine_type || "standard") as
        | "standard"
        | "servo"
        | "inverter",
      order: machinesData[machineID].sort || index,
      idleTime: machine.idle_time_set,
      operatorA: machine.operator_a,
      operatorB: +shifts > 1 ? machine.operator_b : null,
      operatorC: +shifts > 2 ? machine.operator_c : null,
      unit: machine.unit || 1,
      monitorDowntime: !!machine?.["monitor-downtime"],
    };
    index++;
  }
  return machinesToSend;
};

export default fetch;

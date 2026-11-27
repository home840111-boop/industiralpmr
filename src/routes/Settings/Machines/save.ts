import { MachineData } from ".";
import logger from "../../../Components/micro/logger";
import sendDataRest from "../../../Components/micro/sendDataRest";
import store from "../../../Components/Store";
import { uidAtom } from "../../../Components/Store/atoms";
import { z } from "zod";

const machineInfoSchema = z.object({
  machine_model: z.string(),
  idle_time_set: z.number().min(1).max(10),
  operator_a: z.string().refine((mold) => {
    // eslint-disable-next-line
    const specials = /[!@#$%^&*()+\=\[\]{};':"\\|,.<>\/?]+/;
    return !specials.test(mold);
  }, "Special characters are not allowed."),
  operator_b: z.string().refine((mold) => {
    // eslint-disable-next-line
    const specials = /[!@#$%^&*()+\=\[\]{};':"\\|,.<>\/?]+/;
    return !specials.test(mold);
  }, "Special characters are not allowed."),
  operator_c: z.string().refine((mold) => {
    // eslint-disable-next-line
    const specials = /[!@#$%^&*()+\=\[\]{};':"\\|,.<>\/?]+/;
    return !specials.test(mold);
  }, "Special characters are not allowed."),
  "monitor-downtime": z.boolean()
});

const save = async (machine: MachineData): Promise<number> => {
  const payload = {
    machine_model: machine.name,
    idle_time_set: machine.idleTime,
    operator_a: machine.operatorA,
    operator_b: machine.operatorB || "null",
    operator_c: machine.operatorC || "null",
    machine_type: machine.machineType,
    "monitor-downtime": machine.monitorDowntime,
  };
  machineInfoSchema.parse(payload);
  const uid = store.get(uidAtom);
  if (!uid) throw new Error("No user logged in");
  const response = await sendDataRest(machine.unit, [
    "machine",
    machine.id,
    payload,
    undefined,
  ]);
  logger("update-info", {
    data: payload,
    machine: machine.id,
  });
  if (response === 401) throw new Error("Permission Denied");
  return response;
};

export default save;

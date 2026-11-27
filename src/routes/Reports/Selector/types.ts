import dayjs from "../../../Components/Functions/dayjs";
import { DateRange } from "react-day-picker";

interface Option {
  label: string;
  value: string;
}
interface ReportParamOnly {
  date: DateRange;
  option?: Option | Option[] | null;
  secondaryOption?: Option | Option[] | null;
  generated: number;
}
const reportParamOnly: ReportParamOnly = {
  date: {
    from: dayjs().toDate(),
    to: dayjs().toDate(),
  },
  generated: 0,
};
interface ReportParamSingle extends ReportParamOnly {
  option: Option | Option[] | null;
}
const reportParamSingle: ReportParamSingle = {
  ...reportParamOnly,
  option: null,
};
interface ReportParamDouble extends ReportParamSingle {
  secondaryOption: Option | Option[] | null;
}

interface ReportParamTriple extends ReportParamDouble {
  thirdOption: Option | Option[] | null;
}
interface ReportParamDoubleShift extends ReportParamSingle {
  secondaryOption: Option[];
}
const reportParamDouble: ReportParamDouble = {
  ...reportParamSingle,
  secondaryOption: null,
};
const reportParamTriple: ReportParamTriple = {
  ...reportParamDouble,
  thirdOption: null,
};
const reportParamDoubleShift: ReportParamDoubleShift = {
  ...reportParamSingle,
  secondaryOption: [],
};
type ReportParametrsType = {
  factory: ReportParamDoubleShift;
  "main-electricity": {
    type: "day" | "month" | "year";
    date: string;
  };
  shift: ReportParamSingle;
  machine: ReportParamDoubleShift;
  equipment: ReportParamDoubleShift;
  "unit-power": ReportParamSingle;
  environment: ReportParamSingle;
  mold: ReportParamDouble;
  material: ReportParamDouble;
  "production-targets": ReportParamTriple;
  "power-analyzer": ReportParamSingle;
};
const reportParametersSet: ReportParametrsType = {
  factory: reportParamDoubleShift,
  "main-electricity": {
    type: "day",
    date: `${dayjs().format("YYYY-MM-DD")}|${dayjs().format("YYYY-MM-DD")}`,
  },
  shift: reportParamSingle,
  machine: reportParamDoubleShift,
  equipment: reportParamDoubleShift,
  "unit-power": reportParamSingle,
  environment: reportParamSingle,
  mold: reportParamDouble,
  material: reportParamDouble,
  "production-targets": reportParamTriple,
  "power-analyzer": reportParamSingle,
};
type ReportTypes = keyof ReportParametrsType;

interface ReportSubmitType extends ReportParametrsType {
  type: ReportTypes;
}

export type {
  ReportParametrsType,
  ReportTypes,
  ReportParamOnly,
  ReportParamSingle,
  ReportParamDouble,
  Option,
  ReportSubmitType,
};
export { reportParametersSet };

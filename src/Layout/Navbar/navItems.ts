import { BiCube, BiNetworkChart } from "react-icons/bi";
import {
  HiOutlineLightningBolt,
  HiOutlineChartBar,
  HiOutlineChartPie,
} from "react-icons/hi";
import { IconType } from "react-icons/lib";
import { FiBarChart2, FiSettings } from "react-icons/fi";
import { VscDashboard } from "react-icons/vsc";
import { FaBoxes, FaThermometerHalf } from "react-icons/fa";
import { LuFilePieChart } from "react-icons/lu";

interface NavItem {
  label: string;
  to: string;
  icon: IconType;
  /** Hide-able feature: item is disabled when the factory has none of it. */
  requires?: "equipments" | "envs" | "mainElectricity";
  subElements?: Array<NavItem>;
}
const NAV_ITEMS: Array<NavItem> = [
  {
    label: "Dashboard",
    to: "/",
    icon: VscDashboard,
    subElements: [
      {
        label: "Machines",
        to: "/machines",
        icon: HiOutlineChartPie,
      },
      {
        label: "Equipments",
        to: "/equipments",
        requires: "equipments",
        icon: HiOutlineChartBar,
      },
      {
        label: "Environments",
        to: "/environments",
        requires: "envs",
        icon: FaThermometerHalf,
      },
      {
        label: "Main Electricity",
        to: "/main-electricity",
        requires: "mainElectricity",
        icon: HiOutlineLightningBolt,
      },
    ],
  },
  {
    label: "Production Targets",
    to: "/targets",
    icon: LuFilePieChart,
  },
  {
    label: "Departments",
    to: "/departments",
    icon: BiNetworkChart,
  },
  {
    label: "Reports",
    to: "/reports",
    icon: FiBarChart2,
  },
  {
    label: "Raw Materials",
    to: "/raw-materials",
    icon: BiCube,
    subElements: [
      {
        label: "Manage Inventory",
        to: "/raw-materials/manage",
        icon: FaBoxes,
      },
    ],
  },
  {
    label: "Settings",
    to: "/settings",
    icon: FiSettings,
  },
];

export type { NavItem };
export default NAV_ITEMS;
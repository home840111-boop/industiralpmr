import type { Routes } from "./types";

const routes: Routes = {
  "/": {
    title: "Dashboard",
    breadcumbs: [{ title: "Dashboard", link: "/" }],
  },
  "/settings": {
    title: "Settings",
    breadcumbs: [
      { title: "Dashboard", link: "/" },
      { title: "Settings", link: "/settings" },
    ],
  },
  "/departments": {
    title: "Departments",
    breadcumbs: [
      { title: "Dashboard", link: "/" },
      { title: "Departments", link: "/departments" },
    ],
  },
  "/targets": {
    title: "Production Targets",
    breadcumbs: [
      { title: "Dashboard", link: "/" },
      { title: "Production Targets", link: "/targets" },
    ],
  },
  "/targets/stats": {
    title: "Target Statistics",
    breadcumbs: [
      { title: "Dashboard", link: "/" },
      { title: "Production Targets", link: "/targets" },
      { title: "Target Statistics", link: "/production/stats" },
    ],
  },
  "/targets/down-time": {
    title: "Down Times",
    breadcumbs: [
      { title: "Dashboard", link: "/" },
      { title: "Production Targets", link: "/targets" },
      { title: "Down Times", link: "/targets/down-time" },
    ],
  },
  "/reports": {
    title: "Reports",
    breadcumbs: [
      { title: "Dashboard", link: "/" },
      { title: "Reports", link: "/reports" },
    ],
  },
  "/reports/cost-intelligence": {
    title: "Cost Intelligence",
    breadcumbs: [
      { title: "Dashboard", link: "/" },
      { title: "Reports", link: "/reports" },
      { title: "Cost Intelligence", link: "/reports/cost-intelligence" },
    ],
  },
  "/environments": {
    title: "Environment",
    breadcumbs: [
      { title: "Dashboard", link: "/" },
      { title: "Environment", link: "/environments" },
    ],
  },
  "/raw-materials": {
    title: "Raw Materials",
    breadcumbs: [
      { title: "Dashboard", link: "/" },
      { title: "Raw Materials", link: "/raw-materials" },
    ],
  },
  "/raw-materials/manage": {
    title: "Manage Materials",
    breadcumbs: [
      { title: "Dashboard", link: "/" },
      { title: "Raw Materials", link: "/raw-materials" },
      { title: "Manage Materials", link: "/raw-materials/manage" },
    ],
  },
  "/machines": {
    title: "Machines",
    breadcumbs: [
      { title: "Dashboard", link: "/" },
      {
        title: "Machines",
        link: "/machines",
        children: [
          { title: "Equipments", link: "/equipments" },
          { title: "Main Electricity", link: "/main-electricity" },
        ],
      },
    ],
  },
  "/equipments": {
    title: "Equipments",
    breadcumbs: [
      { title: "Dashboard", link: "/" },
      {
        title: "Equipments",
        link: "/equipments",
        children: [
          { title: "Machines", link: "/machines" },
          { title: "Main Electricity", link: "/main-electricity" },
        ],
      },
    ],
  },
  "/main-electricity": {
    title: "Main Electricity",
    breadcumbs: [
      { title: "Dashboard", link: "/" },
      {
        title: "Main Electricity",
        link: "/main-electricity",
        children: [
          { title: "Machines", link: "/machines" },
          { title: "Equipments", link: "/equipments" },
        ],
      },
    ],
  },
};

export default routes;

import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  fonts: {
    heading: `'Poppins', sans-serif`,
    body: `'Poppins', sans-serif`,
  },
  shadows: {
    outline: "0 0 0 2px #ED893687",
  },
  colors: {
    // focus color
    primary: "#ED8936",
    // light theme
    light: {
      bg: "#EDF2F7",
      navBG: "white",
      navText: "#4A5568",
      navIcon: "#A0AEC0",
      border: "#E2E8F0",
      popoverContentBgColor: "white",
      popOverHoverColor: "#FFFAF0",
      accountText: "#4A5568",
      accountBG: "white",
      accountHoverBG: "RGBA(0, 0, 0, 0.06)",
      hoverBG: "#EDF2F7",
      hoverColor: "#171923",
      tableHeaderBG: "#f3f6f9",
      tableHeaderColor: "#878a99",
      text: "#4A5568",
      subText: "#878a99",
      scrollBG: "white",
      scrollCursor: "#ED893687"
    },
    // dark theme
    dark: {
      bg: "#1a1d21",
      navBG: "#212529",
      navText: "RGBA(255, 255, 255, 0.80)",
      navIcon: "RGBA(255, 255, 255, 0.36)",
      border: "#32383e",
      popoverContentBgColor: "#292E32",
      popOverHoverColor: "#171923",
      accountText: "RGBA(255, 255, 255, 0.80)",
      accountBG: "#292e32",
      accountHoverBG: "RGBA(0, 0, 0, 0.24)",
      hoverBG: "#171923",
      hoverColor: "#E2E8F0",
      tableHeaderBG: "#2c3034",
      tableHeaderColor: "#878a99",
      text: "RGBA(255, 255, 255, 0.80)",
      subText: "#878a99",
      scrollBG: "#1a1d21",
      scrollCursor: "#ED893687"
    },
  },
  breakpoints: {
    midLgXl: "67em",
  },
});

export default theme;

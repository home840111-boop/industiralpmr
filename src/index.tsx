import "./Components/Functions/dayjs";
import {
  ChakraProvider,
  ColorModeScript
} from "@chakra-ui/react";
import { StrictMode } from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import theme from "./theme";
import "./index.css";

const container = document.getElementById("root");
if (!container) throw new Error('Failed to find the root element');
const root = ReactDOM.createRoot(container);

root.render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      <ColorModeScript />
      <App />
    </ChakraProvider>
  </StrictMode>,
)
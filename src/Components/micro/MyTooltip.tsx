import { Tooltip, TooltipProps } from "@chakra-ui/react";
import React from "react";

export interface MyTooltipProps extends Omit<TooltipProps, "children"> {
  children?: React.ReactNode;
}

const MyTooltip = ({
  children,
  ...props
}: MyTooltipProps) => {
  const safeChild = React.isValidElement(children) ? children : <span>{children ?? ""}</span>;
  return <Tooltip
    hasArrow={true}
    placement={"top"}
    bg={"gray.700"}
    color={"white"}
    fontSize={"xs"}
    fontWeight={400}
    borderRadius={"md"}
    boxShadow={"md"}
    p={2}
    m={0}
    {...props}>
    {safeChild}
  </Tooltip>
}

export default MyTooltip
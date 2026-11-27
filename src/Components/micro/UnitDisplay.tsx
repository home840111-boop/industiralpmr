import React from "react";
import { Text, TextProps } from "@chakra-ui/react";
import MyTooltip from "./MyTooltip";
import { useUnitMac } from "../../Services/telemetry/useUnitMac";

export interface UnitDisplayProps extends TextProps {
  unit?: string | number | null;
  mac?: string | null;
  children?: React.ReactNode;
  showTooltip?: boolean;
}

/**
 * Renders a unit number with a hover tooltip displaying its hardware MAC address if available.
 *
 * Example usage:
 *   <UnitDisplay unit={details.unit} mac={details.mac} opacity={0.9} fontSize="xs" />
 *   <UnitDisplay unit={details.unit} fontSize="xs">{`UNIT#${details.unit}`}</UnitDisplay>
 */
const UnitDisplay: React.FC<UnitDisplayProps> = ({
  unit,
  mac: propMac,
  children,
  showTooltip = true,
  cursor,
  ...textProps
}) => {
  const { mac } = useUnitMac(unit, propMac);
  const content = children ?? (unit !== null && unit !== undefined ? String(unit) : "");

  if (!content) return null;

  if (mac && showTooltip) {
    return (
      <MyTooltip label={`MAC: ${mac}`}>
        <Text
          as="span"
          cursor={cursor || "help"}
          {...textProps}
        >
          {content}
        </Text>
      </MyTooltip>
    );
  }

  return (
    <Text as="span" cursor={cursor} {...textProps}>
      {content}
    </Text>
  );
};

/**
 * Helper to build a table cell object compatible with micro/Table.tsx
 * that renders the unit label wrapped in a MAC tooltip if available.
 */
export const buildUnitTableCell = (
  unitLabel: string,
  mac?: string | null,
) => {
  if (!mac) return unitLabel;

  return {
    element: MyTooltip,
    props: {
      label: `MAC: ${mac}`,
      cursor: "help",
    },
    children: unitLabel,
  };
};

export default React.memo(UnitDisplay);

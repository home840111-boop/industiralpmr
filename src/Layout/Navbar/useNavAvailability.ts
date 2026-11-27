import { useMemo } from "react";
import Listen from "../../Components/Store/hooks/Listen";
import {
  EnvListAtom,
  equipmentsAtom,
  factoriesAtom,
  hasMainElectricityAtom,
  selectedFactoryAtom,
} from "../../Components/Store/atoms";
import { getScopedAssetMap } from "../../Services/rbac";
import type { NavItem } from "./navItems";

type Feature = NonNullable<NavItem["requires"]>;

/**
 * Tells the navbar which optional features exist for the selected factory.
 * A feature is only reported unavailable once data has loaded, so the menu
 * never flashes disabled during startup.
 */
const useNavAvailability = () => {
  const equipments = Listen(equipmentsAtom) as Record<string, string> | null;
  const envs = Listen(EnvListAtom) as Record<string, string> | null;
  const factories = Listen(factoriesAtom) as any;
  const selectedFactory = Listen(selectedFactoryAtom) as { value: number } | null;
  const hasMeter = Listen(hasMainElectricityAtom) as boolean | null;

  return useMemo(() => {
    const factoryObj =
      selectedFactory && selectedFactory.value !== -1 && factories
        ? factories[selectedFactory.value]
        : undefined;
    const count = (assets: Record<string, string> | null, key: "equipments" | "envs") =>
      assets === null ? null : Object.keys(factoryObj ? getScopedAssetMap(assets, factoryObj, key) : assets).length;

    const eCount = count(equipments, "equipments");
    const envCount = count(envs, "envs");

    const available: Record<Feature, boolean> = {
      equipments: eCount === null || eCount > 0,
      envs: envCount === null || envCount > 0,
      mainElectricity: hasMeter !== false,
    };
    return (item: { requires?: Feature }) => !item.requires || available[item.requires];
  }, [equipments, envs, factories, selectedFactory, hasMeter]);
};

export default useNavAvailability;
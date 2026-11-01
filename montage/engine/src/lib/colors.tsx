import React, { createContext, useContext } from "react";
import { palette } from "./theme";
import type { Palette } from "../types";

const PaletteContext = createContext<Palette>(palette());

export const PaletteProvider: React.FC<{
  overrides?: Partial<Palette>;
  children: React.ReactNode;
}> = ({ overrides, children }) => (
  <PaletteContext.Provider value={palette(overrides)}>{children}</PaletteContext.Provider>
);

export const useC = () => useContext(PaletteContext);

/** Per-scene accent override, falling back to the project palette. */
export const useAccent = (accent?: string) => {
  const c = useC();
  return accent ?? c.accent;
};

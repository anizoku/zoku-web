import { createContext, useContext } from "react";
import { useCardOverrides } from "@/hooks/useCardOverrides";

const CardOverridesContext = createContext(new Map());

export function CardOverridesProvider({ children }) {
  const overrideMap = useCardOverrides();
  return (
    <CardOverridesContext.Provider value={overrideMap}>
      {children}
    </CardOverridesContext.Provider>
  );
}

export function useOverrideMap() {
  return useContext(CardOverridesContext);
}
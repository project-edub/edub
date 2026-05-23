import { createContext, useContext } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ColorMode } from './md3Theme';

type ColorModeContextValue = {
  mode: ColorMode;
  setMode: Dispatch<SetStateAction<ColorMode>>;
  toggleMode: () => void;
};

export const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function useColorMode() {
  const context = useContext(ColorModeContext);

  if (!context) {
    throw new Error('useColorMode must be used within ColorModeContext');
  }

  return context;
}
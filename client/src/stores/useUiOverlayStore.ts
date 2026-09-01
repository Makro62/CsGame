import { create } from "zustand";

/** Tracks which full-screen overlay is open so pause + settings never stack. */
interface UiOverlayState {
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}

export const useUiOverlayStore = create<UiOverlayState>()((set) => ({
  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),
}));

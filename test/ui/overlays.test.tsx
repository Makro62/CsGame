import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PauseMenu } from "@src/ui/components/overlays/PauseMenu";
import { InGameChrome } from "@src/ui/components/overlays/InGameChrome";
import { useUiOverlayStore } from "@src/stores/useUiOverlayStore";
import { modalCard, overlayButton } from "@src/ui/hudTheme";

beforeEach(() => {
  useUiOverlayStore.getState().setSettingsOpen(false);
});

describe("useUiOverlayStore", () => {
  it("toggles settingsOpen so pause can hide", () => {
    useUiOverlayStore.getState().setSettingsOpen(true);
    expect(useUiOverlayStore.getState().settingsOpen).toBe(true);
    useUiOverlayStore.getState().setSettingsOpen(false);
    expect(useUiOverlayStore.getState().settingsOpen).toBe(false);
  });
});

describe("PauseMenu", () => {
  it("renders one set of actions without duplicate leave/resume", () => {
    const onResume = vi.fn();
    const onQuit = vi.fn();
    render(<PauseMenu title="5V5 OFFLINE" onResume={onResume} onQuit={onQuit} />);
    expect(screen.getAllByText("LANJUTKAN")).toHaveLength(1);
    expect(screen.getAllByText("PENGATURAN")).toHaveLength(1);
    expect(screen.getAllByText("MENU UTAMA")).toHaveLength(1);
    expect(screen.queryByText("KELUAR KE MENU UTAMA")).toBeNull();
    fireEvent.click(screen.getByText("LANJUTKAN"));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("hides while settings overlay is open", () => {
    useUiOverlayStore.getState().setSettingsOpen(true);
    const { container } = render(
      <PauseMenu title="TRAINING RANGE" onResume={() => {}} onQuit={() => {}} />,
    );
    expect(container.innerHTML).toBe("");
    useUiOverlayStore.getState().setSettingsOpen(false);
  });
});

describe("InGameChrome", () => {
  it("exposes a single MENU button", () => {
    const onMenu = vi.fn();
    render(<InGameChrome onMenu={onMenu} />);
    expect(screen.getAllByText("MENU [ESC]")).toHaveLength(1);
    expect(screen.queryByText("PENGATURAN")).toBeNull();
    fireEvent.click(screen.getByText("MENU [ESC]"));
    expect(onMenu).toHaveBeenCalledTimes(1);
  });
});

describe("shared modal tokens", () => {
  it("modal cards share one size recipe", () => {
    const card = modalCard("blue");
    expect(String(card.width)).toMatch(/min\(92vw, 560px\)/);
    expect(String(card.minWidth)).toMatch(/min\(520px, 92vw\)/);
    expect(String(card.maxHeight)).toMatch(/80dvh/);
  });

  it("overlay buttons share height and radius", () => {
    const btn = overlayButton("primary");
    expect(btn.minHeight).toBe(44);
    expect(btn.borderRadius).toBe(8);
    expect(btn.width).toBe("100%");
  });
});

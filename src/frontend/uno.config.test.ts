import { describe, it, expect } from "vitest";
import config from "./uno.config";

describe("UnoCSS Configuration", () => {
  it("should have theme configuration", () => {
    expect(config.theme).toBeDefined();
  });

  it("should define color palette", () => {
    expect(config.theme?.colors).toBeDefined();
    const colors = config.theme?.colors as any;

    // Primary colors
    expect(colors.primary).toBeDefined();
    expect(colors.secondary).toBeDefined();

    // Status badge colors
    expect(colors.status).toBeDefined();
    expect(colors.status.red).toBeDefined();
    expect(colors.status.green).toBeDefined();
    expect(colors.status.yellow).toBeDefined();
    expect(colors.status.gray).toBeDefined();
    expect(colors.status.paused).toBeDefined();
    expect(colors.status.pending).toBeDefined();

    // Semantic colors
    expect(colors.success).toBeDefined();
    expect(colors.warning).toBeDefined();
    expect(colors.error).toBeDefined();
    expect(colors.info).toBeDefined();
  });

  it("should define spacing scale", () => {
    expect(config.theme?.spacing).toBeDefined();
    const spacing = config.theme?.spacing as any;

    expect(spacing[0]).toBe("0");
    expect(spacing[1]).toBe("0.25rem");
    expect(spacing[4]).toBe("1rem");
    expect(spacing[8]).toBe("2rem");
  });

  it("should define typography settings", () => {
    expect(config.theme?.fontSize).toBeDefined();
    expect(config.theme?.fontFamily).toBeDefined();
    expect(config.theme?.fontWeight).toBeDefined();

    const fontSize = config.theme?.fontSize as any;
    expect(fontSize.xs).toBeDefined();
    expect(fontSize.base).toBeDefined();
    expect(fontSize["2xl"]).toBeDefined();
  });

  it("should define responsive breakpoints", () => {
    expect(config.theme?.breakpoints).toBeDefined();
    const breakpoints = config.theme?.breakpoints as any;

    expect(breakpoints.sm).toBe("640px");
    expect(breakpoints.md).toBe("768px");
    expect(breakpoints.lg).toBe("1024px");
    expect(breakpoints.xl).toBe("1280px");
  });

  it("should define border radius values", () => {
    expect(config.theme?.borderRadius).toBeDefined();
    const borderRadius = config.theme?.borderRadius as any;

    expect(borderRadius.none).toBe("0");
    expect(borderRadius.DEFAULT).toBe("0.25rem");
    expect(borderRadius.full).toBe("9999px");
  });

  it("should define box shadow values", () => {
    expect(config.theme?.boxShadow).toBeDefined();
    const boxShadow = config.theme?.boxShadow as any;

    expect(boxShadow.sm).toBeDefined();
    expect(boxShadow.DEFAULT).toBeDefined();
    expect(boxShadow.none).toBe("none");
  });

  it("should define shortcuts for common patterns", () => {
    expect(config.shortcuts).toBeDefined();
    const shortcuts = config.shortcuts as any;

    // Button shortcuts
    expect(shortcuts["btn-base"]).toBeDefined();
    expect(shortcuts["btn-primary"]).toBeDefined();

    // Card shortcuts
    expect(shortcuts["card"]).toBeDefined();

    // Form shortcuts
    expect(shortcuts["input-base"]).toBeDefined();
    expect(shortcuts["label-base"]).toBeDefined();

    // Status badge shortcuts
    expect(shortcuts["badge-red"]).toBeDefined();
    expect(shortcuts["badge-green"]).toBeDefined();
    expect(shortcuts["badge-yellow"]).toBeDefined();
    expect(shortcuts["badge-gray"]).toBeDefined();
    expect(shortcuts["badge-paused"]).toBeDefined();
    expect(shortcuts["badge-pending"]).toBeDefined();
  });

  it("should have status badge colors matching design document", () => {
    const colors = config.theme?.colors as any;

    // Verify exact color values from design document
    expect(colors.status.red.bg).toBe("#fee");
    expect(colors.status.red.text).toBe("#c00");

    expect(colors.status.green.bg).toBe("#efe");
    expect(colors.status.green.text).toBe("#0a0");

    expect(colors.status.yellow.bg).toBe("#ffe");
    expect(colors.status.yellow.text).toBe("#aa0");

    expect(colors.status.gray.bg).toBe("#eee");
    expect(colors.status.gray.text).toBe("#666");

    expect(colors.status.paused.bg).toBe("#fef");
    expect(colors.status.paused.text).toBe("#90a");

    expect(colors.status.pending.bg).toBe("#eff");
    expect(colors.status.pending.text).toBe("#099");
  });

  it("should use rem-based spacing for accessibility", () => {
    const spacing = config.theme?.spacing as any;

    // All spacing values should use rem units (except 0)
    Object.entries(spacing).forEach(([key, value]) => {
      if (key !== "0") {
        expect(value).toMatch(/rem$/);
      }
    });
  });

  it("should have system font stack for cross-platform compatibility", () => {
    const fontFamily = config.theme?.fontFamily as any;

    expect(fontFamily.sans).toContain("system-ui");
    expect(fontFamily.sans).toContain("-apple-system");
    expect(fontFamily.sans).toContain("BlinkMacSystemFont");
  });
});

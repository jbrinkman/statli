import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import KeyboardShortcutsHelp from "./KeyboardShortcutsHelp.vue";

describe("KeyboardShortcutsHelp", () => {
  it("should render when modelValue is true", () => {
    const wrapper = mount(KeyboardShortcutsHelp, {
      props: {
        modelValue: true,
      },
    });

    expect(wrapper.find(".shortcuts-overlay").exists()).toBe(true);
    expect(wrapper.find("#shortcuts-title").text()).toBe("Keyboard Shortcuts");
  });

  it("should not render when modelValue is false", () => {
    const wrapper = mount(KeyboardShortcutsHelp, {
      props: {
        modelValue: false,
      },
    });

    expect(wrapper.find(".shortcuts-overlay").exists()).toBe(false);
  });

  it("should emit update:modelValue when close button is clicked", async () => {
    const wrapper = mount(KeyboardShortcutsHelp, {
      props: {
        modelValue: true,
      },
    });

    await wrapper.find(".btn-close").trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([false]);
  });

  it("should emit update:modelValue when overlay is clicked", async () => {
    const wrapper = mount(KeyboardShortcutsHelp, {
      props: {
        modelValue: true,
      },
    });

    await wrapper.find(".shortcuts-overlay").trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([false]);
  });

  it("should not close when dialog content is clicked", async () => {
    const wrapper = mount(KeyboardShortcutsHelp, {
      props: {
        modelValue: true,
      },
    });

    await wrapper.find(".shortcuts-dialog").trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeFalsy();
  });

  it("should display all shortcut sections", () => {
    const wrapper = mount(KeyboardShortcutsHelp, {
      props: {
        modelValue: true,
      },
    });

    const sections = wrapper.findAll(".shortcuts-section");
    expect(sections.length).toBeGreaterThan(0);

    // Check for specific sections
    const sectionTitles = sections.map((s) => s.find("h3").text());
    expect(sectionTitles).toContain("Global");
    expect(sectionTitles).toContain("Projects View");
    expect(sectionTitles).toContain("Tasks View");
    expect(sectionTitles).toContain("Report View");
  });

  it("should have proper ARIA attributes", () => {
    const wrapper = mount(KeyboardShortcutsHelp, {
      props: {
        modelValue: true,
      },
    });

    const overlay = wrapper.find(".shortcuts-overlay");
    expect(overlay.attributes("role")).toBe("dialog");
    expect(overlay.attributes("aria-modal")).toBe("true");
    expect(overlay.attributes("aria-labelledby")).toBe("shortcuts-title");

    const closeButton = wrapper.find(".btn-close");
    expect(closeButton.attributes("aria-label")).toBe(
      "Close keyboard shortcuts dialog",
    );
  });
});

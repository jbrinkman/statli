import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import fc from "fast-check";
import StylesheetEditor from "./StylesheetEditor.vue";

// Mock the MonacoEditor component
vi.mock("./MonacoEditor.vue", () => ({
  default: {
    name: "MonacoEditor",
    template: '<div class="mock-monaco-editor"></div>',
    props: ["modelValue", "language", "theme"],
    emits: ["update:modelValue"],
    setup(props: any, { emit }: any) {
      return {
        updateValue: (newValue: string) => {
          emit("update:modelValue", newValue);
        },
      };
    },
  },
}));

// Mock the Wails runtime
const mockGetProjectStylesheet = vi.fn();
const mockUpdateProjectStylesheet = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockGetProjectStylesheet.mockResolvedValue("");
  mockUpdateProjectStylesheet.mockResolvedValue(undefined);

  (window as any).go = {
    main: {
      App: {
        GetProjectStylesheet: mockGetProjectStylesheet,
        UpdateProjectStylesheet: mockUpdateProjectStylesheet,
      },
    },
  };
});

describe("StylesheetEditor", () => {
  describe("Component Rendering", () => {
    it("renders modal when isOpen is true", () => {
      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      expect(wrapper.find(".stylesheet-editor-modal").exists()).toBe(true);
      expect(wrapper.find(".modal-content").exists()).toBe(true);
    });

    it("does not render modal when isOpen is false", () => {
      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: false,
        },
      });

      expect(wrapper.find(".stylesheet-editor-modal").exists()).toBe(false);
    });

    it("displays correct title", () => {
      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      expect(wrapper.find(".editor-title").text()).toBe(
        "Master Stylesheet Editor",
      );
    });

    it("renders all action buttons", () => {
      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      expect(wrapper.find(".btn-template").exists()).toBe(true);
      expect(wrapper.find(".btn-save").exists()).toBe(true);
      expect(wrapper.find(".btn-cancel").exists()).toBe(true);
    });
  });

  describe("Stylesheet Loading", () => {
    it("loads current stylesheet on open", async () => {
      const testCSS = ".prose-content { color: blue; }";
      mockGetProjectStylesheet.mockResolvedValue(testCSS);

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick(); // Wait for async load

      expect(mockGetProjectStylesheet).toHaveBeenCalledWith(1);

      const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      expect(monacoEditor.props("modelValue")).toBe(testCSS);
    });

    it("loads empty string when no stylesheet exists", async () => {
      mockGetProjectStylesheet.mockResolvedValue("");

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      expect(monacoEditor.props("modelValue")).toBe("");
    });

    it("handles loading error gracefully", async () => {
      mockGetProjectStylesheet.mockRejectedValue(new Error("Failed to load"));

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      expect(wrapper.find(".validation-errors").exists()).toBe(true);
      expect(wrapper.find(".error-message").text()).toContain(
        "Failed to load stylesheet",
      );
    });
  });

  describe("Save Functionality", () => {
    it("calls UpdateProjectStylesheet when save button is clicked", async () => {
      const testCSS = ".prose-content { font-size: 16px; }";
      mockGetProjectStylesheet.mockResolvedValue("");

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      // Update content
      const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      await monacoEditor.vm.$emit("update:modelValue", testCSS);
      await nextTick();

      // Click save
      await wrapper.find(".btn-save").trigger("click");
      await nextTick();

      expect(mockUpdateProjectStylesheet).toHaveBeenCalledWith(1, testCSS);
    });

    it("emits save event after successful save", async () => {
      const testCSS = ".prose-content { color: red; }";
      mockGetProjectStylesheet.mockResolvedValue("");

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      await monacoEditor.vm.$emit("update:modelValue", testCSS);
      await nextTick();

      await wrapper.find(".btn-save").trigger("click");
      await nextTick();

      expect(wrapper.emitted("save")).toBeTruthy();
      expect(wrapper.emitted("save")?.[0]).toEqual([testCSS]);
    });

    it("handles save error gracefully", async () => {
      mockGetProjectStylesheet.mockResolvedValue("");
      mockUpdateProjectStylesheet.mockRejectedValue(
        new Error("Failed to save"),
      );

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      await monacoEditor.vm.$emit("update:modelValue", ".test { color: red; }");
      await nextTick();

      await wrapper.find(".btn-save").trigger("click");
      await nextTick();

      expect(wrapper.find(".validation-errors").exists()).toBe(true);
      expect(wrapper.find(".error-message").text()).toContain(
        "Failed to save stylesheet",
      );
    });
  });

  describe("CSS Validation", () => {
    it("displays error for unbalanced braces", async () => {
      const invalidCSS = ".prose-content { color: red;";
      mockGetProjectStylesheet.mockResolvedValue("");

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      await monacoEditor.vm.$emit("update:modelValue", invalidCSS);
      await nextTick();

      expect(wrapper.find(".validation-errors").exists()).toBe(true);
      expect(wrapper.find(".error-message").text()).toContain(
        "Unbalanced braces",
      );
    });

    it("disables save button when validation errors exist", async () => {
      const invalidCSS = ".prose-content { color: red;";
      mockGetProjectStylesheet.mockResolvedValue("");

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      await monacoEditor.vm.$emit("update:modelValue", invalidCSS);
      await nextTick();

      const saveButton = wrapper.find(".btn-save");
      expect(saveButton.attributes("disabled")).toBeDefined();
    });

    it("accepts valid CSS without errors", async () => {
      const validCSS = ".prose-content { color: red; font-size: 16px; }";
      mockGetProjectStylesheet.mockResolvedValue("");

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      await monacoEditor.vm.$emit("update:modelValue", validCSS);
      await nextTick();

      expect(wrapper.find(".validation-errors").exists()).toBe(false);
      const saveButton = wrapper.find(".btn-save");
      expect(saveButton.attributes("disabled")).toBeUndefined();
    });

    it("accepts empty CSS as valid", async () => {
      mockGetProjectStylesheet.mockResolvedValue("");

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      await monacoEditor.vm.$emit("update:modelValue", "");
      await nextTick();

      expect(wrapper.find(".validation-errors").exists()).toBe(false);
    });
  });

  describe("Default Template", () => {
    it("loads default template when button is clicked", async () => {
      mockGetProjectStylesheet.mockResolvedValue("");

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      await wrapper.find(".btn-template").trigger("click");
      await nextTick();

      const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      const content = monacoEditor.props("modelValue");

      expect(content).toContain(".prose-content");
      expect(content).toContain("font-family");
      expect(content).toContain("line-height");
    });

    it("clears validation errors when loading default template", async () => {
      const invalidCSS = ".prose-content { color: red;";
      mockGetProjectStylesheet.mockResolvedValue("");

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      // Set invalid CSS
      const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      await monacoEditor.vm.$emit("update:modelValue", invalidCSS);
      await nextTick();

      expect(wrapper.find(".validation-errors").exists()).toBe(true);

      // Load default template
      await wrapper.find(".btn-template").trigger("click");
      await nextTick();

      expect(wrapper.find(".validation-errors").exists()).toBe(false);
    });
  });

  describe("Cancel Functionality", () => {
    it("emits cancel event when cancel button is clicked with no changes", async () => {
      mockGetProjectStylesheet.mockResolvedValue("");

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      await wrapper.find(".btn-cancel").trigger("click");
      await nextTick();

      expect(wrapper.emitted("cancel")).toBeTruthy();
    });

    it("shows confirmation dialog when canceling with unsaved changes", async () => {
      mockGetProjectStylesheet.mockResolvedValue("");

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      // Make changes
      const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      await monacoEditor.vm.$emit(
        "update:modelValue",
        ".test { color: blue; }",
      );
      await nextTick();

      // Try to cancel
      await wrapper.find(".btn-cancel").trigger("click");
      await nextTick();

      expect(wrapper.find(".confirm-dialog").exists()).toBe(true);
      expect(wrapper.emitted("cancel")).toBeFalsy();
    });

    it("emits cancel when discard is confirmed", async () => {
      mockGetProjectStylesheet.mockResolvedValue("");

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      // Make changes
      const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      await monacoEditor.vm.$emit(
        "update:modelValue",
        ".test { color: blue; }",
      );
      await nextTick();

      // Try to cancel
      await wrapper.find(".btn-cancel").trigger("click");
      await nextTick();

      // Confirm discard
      await wrapper.find(".btn-confirm-discard").trigger("click");
      await nextTick();

      expect(wrapper.emitted("cancel")).toBeTruthy();
    });

    it("keeps editing when cancel is clicked in confirmation dialog", async () => {
      mockGetProjectStylesheet.mockResolvedValue("");

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      // Make changes
      const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      await monacoEditor.vm.$emit(
        "update:modelValue",
        ".test { color: blue; }",
      );
      await nextTick();

      // Try to cancel
      await wrapper.find(".btn-cancel").trigger("click");
      await nextTick();

      // Click keep editing
      await wrapper.find(".btn-confirm-cancel").trigger("click");
      await nextTick();

      expect(wrapper.find(".confirm-dialog").exists()).toBe(false);
      expect(wrapper.emitted("cancel")).toBeFalsy();
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("saves on Ctrl+S", async () => {
      const testCSS = ".prose-content { color: green; }";
      mockGetProjectStylesheet.mockResolvedValue("");
      mockUpdateProjectStylesheet.mockClear();

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      await monacoEditor.vm.$emit("update:modelValue", testCSS);
      await nextTick();

      // Clear any calls from setup
      mockUpdateProjectStylesheet.mockClear();

      // Simulate Ctrl+S
      const event = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: true,
      });
      window.dispatchEvent(event);
      await nextTick();

      expect(mockUpdateProjectStylesheet).toHaveBeenCalledWith(1, testCSS);

      wrapper.unmount();
    });

    it("cancels on Escape", async () => {
      mockGetProjectStylesheet.mockResolvedValue("");

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 1,
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      // Simulate Escape
      const event = new KeyboardEvent("keydown", {
        key: "Escape",
      });
      window.dispatchEvent(event);
      await nextTick();

      expect(wrapper.emitted("cancel")).toBeTruthy();

      wrapper.unmount();
    });

    it("does not save on Ctrl+S when validation errors exist", async () => {
      const invalidCSS = ".prose-content { color: red;";
      mockGetProjectStylesheet.mockResolvedValue("");

      const wrapper = mount(StylesheetEditor, {
        props: {
          projectId: 999, // Use unique project ID
          isOpen: true,
        },
      });

      await nextTick();
      await nextTick();

      const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      await monacoEditor.vm.$emit("update:modelValue", invalidCSS);
      await nextTick();

      // Simulate Ctrl+S
      const event = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: true,
      });
      window.dispatchEvent(event);
      await nextTick();

      // Verify the mock was never called with project ID 999
      const callsWithProject999 = mockUpdateProjectStylesheet.mock.calls.filter(
        (call) => call[0] === 999,
      );
      expect(callsWithProject999.length).toBe(0);

      wrapper.unmount();
    });
  });

  describe("Property 10: CSS Input Acceptance", () => {
    it(
      "accepts and stores valid CSS without modification",
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            // Generate valid CSS strings
            fc
              .array(
                fc.record({
                  selector: fc.oneof(
                    fc.constant(".prose-content"),
                    fc.constant(".prose-content h1"),
                    fc.constant(".prose-content p"),
                    fc.constant(".prose-content a"),
                    fc.constant("body"),
                    fc.constant("div"),
                    fc.constant("#main"),
                  ),
                  properties: fc.array(
                    fc.record({
                      property: fc.oneof(
                        fc.constant("color"),
                        fc.constant("font-size"),
                        fc.constant("margin"),
                        fc.constant("padding"),
                        fc.constant("background-color"),
                        fc.constant("border"),
                        fc.constant("display"),
                        fc.constant("width"),
                        fc.constant("height"),
                      ),
                      value: fc.oneof(
                        fc.constant("red"),
                        fc.constant("blue"),
                        fc.constant("16px"),
                        fc.constant("1rem"),
                        fc.constant("0"),
                        fc.constant("auto"),
                        fc.constant("block"),
                        fc.constant("100%"),
                        fc.constant("#ffffff"),
                      ),
                    }),
                    { minLength: 1, maxLength: 5 },
                  ),
                }),
                { minLength: 1, maxLength: 10 },
              )
              .map((rules) => {
                return rules
                  .map((rule) => {
                    const props = rule.properties
                      .map((p) => `  ${p.property}: ${p.value};`)
                      .join("\n");
                    return `${rule.selector} {\n${props}\n}`;
                  })
                  .join("\n\n");
              }),
            async (cssString) => {
              mockGetProjectStylesheet.mockResolvedValue("");
              mockUpdateProjectStylesheet.mockResolvedValue(undefined);

              const wrapper = mount(StylesheetEditor, {
                props: {
                  projectId: 1,
                  isOpen: true,
                },
              });

              await nextTick();
              await nextTick();

              // Update content with generated CSS
              const monacoEditor = wrapper.findComponent({
                name: "MonacoEditor",
              });
              await monacoEditor.vm.$emit("update:modelValue", cssString);
              await nextTick();

              // Verify no validation errors
              expect(wrapper.find(".validation-errors").exists()).toBe(false);

              // Save the CSS
              await wrapper.find(".btn-save").trigger("click");
              await nextTick();

              // Verify the CSS was stored without modification
              expect(mockUpdateProjectStylesheet).toHaveBeenCalledWith(
                1,
                cssString,
              );

              wrapper.unmount();
            },
          ),
          { numRuns: 100 },
        );
      },
    );
  });
});

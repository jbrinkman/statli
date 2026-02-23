import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import MonacoEditor from "./MonacoEditor.vue";

// Mock the vue-monaco-editor component
vi.mock("@guolao/vue-monaco-editor", () => ({
  VueMonacoEditor: {
    name: "VueMonacoEditor",
    template: '<div class="mock-monaco-editor"></div>',
    props: ["value", "language", "theme", "options"],
    emits: ["update:value", "mount"],
    setup(props: any, { emit }: any) {
      return {
        updateValue: (newValue: string) => {
          emit("update:value", newValue);
        },
      };
    },
  },
}));

describe("MonacoEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with correct language mode for markdown", () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "",
        language: "markdown",
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });
    expect(monacoEditor.exists()).toBe(true);
    expect(monacoEditor.props("language")).toBe("markdown");
  });

  it("renders with correct language mode for html", () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "",
        language: "html",
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });
    expect(monacoEditor.props("language")).toBe("html");
  });

  it("renders with correct language mode for css", () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "",
        language: "css",
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });
    expect(monacoEditor.props("language")).toBe("css");
  });

  it("emits update:modelValue when content changes", async () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "",
        language: "markdown",
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });
    const newValue = "# New Content";

    // Simulate content change from Monaco Editor
    await monacoEditor.vm.$emit("update:value", newValue);
    await nextTick();

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([newValue]);
  });

  it("updates content when modelValue prop changes", async () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "Initial content",
        language: "markdown",
      },
    });

    const newValue = "Updated content";
    await wrapper.setProps({ modelValue: newValue });
    await nextTick();

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });
    expect(monacoEditor.props("value")).toBe(newValue);
  });

  it("readonly mode disables editing", () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "Some content",
        language: "markdown",
        readonly: true,
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });
    expect(monacoEditor.props("options").readOnly).toBe(true);
  });

  it("readonly mode is false by default", () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "Some content",
        language: "markdown",
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });
    expect(monacoEditor.props("options").readOnly).toBe(false);
  });

  it("applies editor-readonly class when readonly is true", () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "Some content",
        language: "markdown",
        readonly: true,
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });
    expect(monacoEditor.classes()).toContain("editor-readonly");
  });

  it("theme prop applies correct editor theme - vs", () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "",
        language: "markdown",
        theme: "vs",
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });
    expect(monacoEditor.props("theme")).toBe("vs");
  });

  it("theme prop applies correct editor theme - vs-dark", () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "",
        language: "markdown",
        theme: "vs-dark",
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });
    expect(monacoEditor.props("theme")).toBe("vs-dark");
  });

  it("theme prop applies correct editor theme - hc-black", () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "",
        language: "markdown",
        theme: "hc-black",
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });
    expect(monacoEditor.props("theme")).toBe("hc-black");
  });

  it("uses default theme 'vs' when theme prop is not provided", () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "",
        language: "markdown",
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });
    expect(monacoEditor.props("theme")).toBe("vs");
  });

  it("displays placeholder when empty", async () => {
    const mockEditor = {
      setValue: vi.fn(),
      setSelection: vi.fn(),
      getModel: vi.fn(() => ({
        getFullModelRange: vi.fn(() => ({})),
      })),
    };

    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "",
        language: "markdown",
        placeholder: "Enter your text here...",
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });

    // Simulate mount event
    await monacoEditor.vm.$emit("mount", mockEditor);
    await nextTick();

    expect(mockEditor.setValue).toHaveBeenCalledWith("Enter your text here...");
    expect(mockEditor.setSelection).toHaveBeenCalled();
  });

  it("does not display placeholder when content is not empty", async () => {
    const mockEditor = {
      setValue: vi.fn(),
      setSelection: vi.fn(),
      getModel: vi.fn(() => ({
        getFullModelRange: vi.fn(() => ({})),
      })),
    };

    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "Existing content",
        language: "markdown",
        placeholder: "Enter your text here...",
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });

    // Simulate mount event
    await monacoEditor.vm.$emit("mount", mockEditor);
    await nextTick();

    expect(mockEditor.setValue).not.toHaveBeenCalled();
  });

  it("does not display placeholder when placeholder prop is not provided", async () => {
    const mockEditor = {
      setValue: vi.fn(),
      setSelection: vi.fn(),
      getModel: vi.fn(() => ({
        getFullModelRange: vi.fn(() => ({})),
      })),
    };

    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "",
        language: "markdown",
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });

    // Simulate mount event
    await monacoEditor.vm.$emit("mount", mockEditor);
    await nextTick();

    expect(mockEditor.setValue).not.toHaveBeenCalled();
  });

  it("configures editor options correctly", () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "",
        language: "markdown",
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });
    const options = monacoEditor.props("options");

    expect(options.automaticLayout).toBe(true);
    expect(options.lineNumbers).toBe("on");
    expect(options.minimap.enabled).toBe(true);
    expect(options.autoIndent).toBe("full");
    expect(options.formatOnPaste).toBe(true);
    expect(options.formatOnType).toBe(true);
    expect(options.wordWrap).toBe("on");
    expect(options.scrollBeyondLastLine).toBe(false);
    expect(options.fontSize).toBe(14);
    expect(options.tabSize).toBe(2);
    expect(options.insertSpaces).toBe(true);
    expect(options.renderWhitespace).toBe("selection");
    expect(options.bracketPairColorization.enabled).toBe(true);
  });

  it("handles multiple content updates", async () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "Initial",
        language: "markdown",
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });

    // First update
    await monacoEditor.vm.$emit("update:value", "First update");
    await nextTick();

    // Second update
    await monacoEditor.vm.$emit("update:value", "Second update");
    await nextTick();

    // Third update
    await monacoEditor.vm.$emit("update:value", "Third update");
    await nextTick();

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    expect(emitted?.length).toBe(3);
    expect(emitted?.[0]).toEqual(["First update"]);
    expect(emitted?.[1]).toEqual(["Second update"]);
    expect(emitted?.[2]).toEqual(["Third update"]);
  });

  it("handles special characters in content", async () => {
    const specialContent = "Special chars: <>&\"'`\n\t\r";
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: specialContent,
        language: "markdown",
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });
    expect(monacoEditor.props("value")).toBe(specialContent);
  });

  it("handles unicode content", async () => {
    const unicodeContent = "Unicode: 你好 🌍 مرحبا";
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: unicodeContent,
        language: "markdown",
      },
    });

    const monacoEditor = wrapper.findComponent({ name: "VueMonacoEditor" });
    expect(monacoEditor.props("value")).toBe(unicodeContent);
  });

  it("renders wrapper with correct class", () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: "",
        language: "markdown",
      },
    });

    const wrapperDiv = wrapper.find(".monaco-editor-wrapper");
    expect(wrapperDiv.exists()).toBe(true);
  });
});

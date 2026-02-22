import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import MarkdownEditor from "./MarkdownEditor.vue";

describe("MarkdownEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with default placeholder", () => {
    const wrapper = mount(MarkdownEditor, {
      props: {
        modelValue: "",
      },
    });

    const textarea = wrapper.find("textarea");
    expect(textarea.exists()).toBe(true);
    expect(textarea.attributes("placeholder")).toBe(
      "Enter markdown content...",
    );
  });

  it("renders with custom placeholder", () => {
    const wrapper = mount(MarkdownEditor, {
      props: {
        modelValue: "",
        placeholder: "Custom placeholder",
      },
    });

    const textarea = wrapper.find("textarea");
    expect(textarea.attributes("placeholder")).toBe("Custom placeholder");
  });

  it("displays initial modelValue", () => {
    const initialValue = "# Hello World\n\nThis is markdown content.";
    const wrapper = mount(MarkdownEditor, {
      props: {
        modelValue: initialValue,
      },
    });

    const textarea = wrapper.find("textarea");
    expect(textarea.element.value).toBe(initialValue);
  });

  it("emits update:modelValue when content changes", async () => {
    const wrapper = mount(MarkdownEditor, {
      props: {
        modelValue: "",
      },
    });

    const textarea = wrapper.find("textarea");
    const newValue = "# New Content";

    await textarea.setValue(newValue);

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([newValue]);
  });

  it("updates content when modelValue prop changes", async () => {
    const wrapper = mount(MarkdownEditor, {
      props: {
        modelValue: "Initial content",
      },
    });

    const newValue = "Updated content";
    await wrapper.setProps({ modelValue: newValue });
    await nextTick();

    const textarea = wrapper.find("textarea");
    expect(textarea.element.value).toBe(newValue);
  });

  it("auto-resizes textarea on mount", async () => {
    const longContent = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
    const wrapper = mount(MarkdownEditor, {
      props: {
        modelValue: longContent,
      },
    });

    await nextTick();

    const textarea = wrapper.find("textarea").element as HTMLTextAreaElement;
    // After auto-resize, height should be set to scrollHeight
    expect(textarea.style.height).toBeTruthy();
  });

  it("auto-resizes textarea when content changes", async () => {
    const wrapper = mount(MarkdownEditor, {
      props: {
        modelValue: "Short",
      },
    });

    const textarea = wrapper.find("textarea");
    const longContent =
      "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7";

    await textarea.setValue(longContent);
    await nextTick();

    const textareaElement = textarea.element as HTMLTextAreaElement;
    expect(textareaElement.style.height).toBeTruthy();
  });

  it("handles empty content", () => {
    const wrapper = mount(MarkdownEditor, {
      props: {
        modelValue: "",
      },
    });

    const textarea = wrapper.find("textarea");
    expect(textarea.element.value).toBe("");
  });

  it("handles multiline markdown content", async () => {
    const markdownContent = `# Title

## Subtitle

- Item 1
- Item 2
- Item 3

**Bold text** and *italic text*.`;

    const wrapper = mount(MarkdownEditor, {
      props: {
        modelValue: markdownContent,
      },
    });

    const textarea = wrapper.find("textarea");
    expect(textarea.element.value).toBe(markdownContent);
  });

  it("preserves markdown formatting", async () => {
    const wrapper = mount(MarkdownEditor, {
      props: {
        modelValue: "",
      },
    });

    const markdownWithFormatting = "**Bold** _italic_ `code` [link](url)";
    const textarea = wrapper.find("textarea");

    await textarea.setValue(markdownWithFormatting);

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([
      markdownWithFormatting,
    ]);
  });

  it("applies correct CSS classes", () => {
    const wrapper = mount(MarkdownEditor, {
      props: {
        modelValue: "",
      },
    });

    const textarea = wrapper.find("textarea");
    expect(textarea.classes()).toContain("textarea");
  });

  it("has proper styling attributes", () => {
    const wrapper = mount(MarkdownEditor, {
      props: {
        modelValue: "",
      },
    });

    const textarea = wrapper.find("textarea");

    // Verify the textarea element exists and has the correct class
    expect(textarea.exists()).toBe(true);
    expect(textarea.classes()).toContain("textarea");
  });
});

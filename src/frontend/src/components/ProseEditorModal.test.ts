import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import ProseEditorModal from "./ProseEditorModal.vue";
import MonacoEditor from "./MonacoEditor.vue";

// Mock MonacoEditor component
vi.mock("./MonacoEditor.vue", () => ({
  default: {
    name: "MonacoEditor",
    template: '<div class="mock-monaco-editor"></div>',
    props: ["modelValue", "language", "theme"],
    emits: ["update:modelValue"],
  },
}));

describe("ProseEditorModal", () => {
  const mockSection = {
    id: 1,
    project_id: 1,
    name: "Test Section",
    type: "prose",
    content: "Initial content",
    order: 1,
    is_enabled: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders full-screen modal when opened", () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: true,
      },
    });

    const modal = wrapper.find(".prose-editor-modal");
    expect(modal.exists()).toBe(true);

    const modalContent = wrapper.find(".modal-content");
    expect(modalContent.exists()).toBe(true);
  });

  it("does not render when isOpen is false", () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: false,
      },
    });

    const modal = wrapper.find(".prose-editor-modal");
    expect(modal.exists()).toBe(false);
  });

  it("displays section name in header", () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: true,
      },
    });

    const sectionName = wrapper.find(".section-name");
    expect(sectionName.text()).toBe("Test Section");
  });

  it("renders save and cancel buttons", () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: true,
      },
    });

    const saveButton = wrapper.find(".btn-save");
    const cancelButton = wrapper.find(".btn-cancel");

    expect(saveButton.exists()).toBe(true);
    expect(cancelButton.exists()).toBe(true);
    expect(saveButton.text()).toBe("Save");
    expect(cancelButton.text()).toBe("Cancel");
  });

  it("integrates MonacoEditor with markdown language mode", () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: true,
      },
    });

    const monacoEditor = wrapper.findComponent(MonacoEditor);
    expect(monacoEditor.exists()).toBe(true);
    expect(monacoEditor.props("language")).toBe("markdown");
  });

  it("emits save event with content when save button is clicked", async () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: true,
      },
    });

    const saveButton = wrapper.find(".btn-save");
    await saveButton.trigger("click");
    await nextTick();

    expect(wrapper.emitted("save")).toBeTruthy();
    expect(wrapper.emitted("save")?.[0]).toEqual(["Initial content"]);
  });

  it("emits cancel event when cancel button is clicked without changes", async () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: true,
      },
    });

    const cancelButton = wrapper.find(".btn-cancel");
    await cancelButton.trigger("click");
    await nextTick();

    expect(wrapper.emitted("cancel")).toBeTruthy();
  });

  it("shows confirmation dialog when canceling with unsaved changes", async () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: true,
      },
    });

    // Simulate content change
    const monacoEditor = wrapper.findComponent(MonacoEditor);
    await monacoEditor.vm.$emit("update:modelValue", "Modified content");
    await nextTick();

    // Try to cancel
    const cancelButton = wrapper.find(".btn-cancel");
    await cancelButton.trigger("click");
    await nextTick();

    // Confirmation dialog should appear
    const confirmDialog = wrapper.find(".confirm-dialog");
    expect(confirmDialog.exists()).toBe(true);
    expect(confirmDialog.text()).toContain("Unsaved Changes");
  });

  it("emits cancel when discard is confirmed", async () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: true,
      },
    });

    // Simulate content change
    const monacoEditor = wrapper.findComponent(MonacoEditor);
    await monacoEditor.vm.$emit("update:modelValue", "Modified content");
    await nextTick();

    // Try to cancel
    const cancelButton = wrapper.find(".btn-cancel");
    await cancelButton.trigger("click");
    await nextTick();

    // Click discard button
    const discardButton = wrapper.find(".btn-confirm-discard");
    await discardButton.trigger("click");
    await nextTick();

    expect(wrapper.emitted("cancel")).toBeTruthy();
  });

  it("closes confirmation dialog when keep editing is clicked", async () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: true,
      },
    });

    // Simulate content change
    const monacoEditor = wrapper.findComponent(MonacoEditor);
    await monacoEditor.vm.$emit("update:modelValue", "Modified content");
    await nextTick();

    // Try to cancel
    const cancelButton = wrapper.find(".btn-cancel");
    await cancelButton.trigger("click");
    await nextTick();

    // Click keep editing button
    const keepEditingButton = wrapper.find(".btn-confirm-cancel");
    await keepEditingButton.trigger("click");
    await nextTick();

    // Confirmation dialog should be hidden
    const confirmDialog = wrapper.find(".confirm-dialog");
    expect(confirmDialog.exists()).toBe(false);

    // Cancel event should not be emitted
    expect(wrapper.emitted("cancel")).toBeFalsy();
  });

  it("loads section content when modal opens", async () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: false,
      },
    });

    // Open modal
    await wrapper.setProps({ isOpen: true });
    await nextTick();

    const monacoEditor = wrapper.findComponent(MonacoEditor);
    expect(monacoEditor.props("modelValue")).toBe("Initial content");
  });

  it("handles empty section content", async () => {
    const emptySection = { ...mockSection, content: "" };
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: emptySection,
        isOpen: true,
      },
    });

    const monacoEditor = wrapper.findComponent(MonacoEditor);
    expect(monacoEditor.props("modelValue")).toBe("");
  });

  it("handles keyboard shortcut Ctrl+S to save", async () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: true,
      },
    });

    // Simulate Ctrl+S
    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
    });
    window.dispatchEvent(event);
    await nextTick();

    expect(wrapper.emitted("save")).toBeTruthy();
  });

  it("handles keyboard shortcut Escape to cancel", async () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: true,
      },
    });

    // Simulate Escape
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
    });
    window.dispatchEvent(event);
    await nextTick();

    expect(wrapper.emitted("cancel")).toBeTruthy();
  });

  it("does not trigger Escape when confirmation dialog is open", async () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: true,
      },
    });

    // Simulate content change
    const monacoEditor = wrapper.findComponent(MonacoEditor);
    await monacoEditor.vm.$emit("update:modelValue", "Modified content");
    await nextTick();

    // Try to cancel to show confirmation dialog
    const cancelButton = wrapper.find(".btn-cancel");
    await cancelButton.trigger("click");
    await nextTick();

    // Clear previous emits
    wrapper.emitted("cancel")?.splice(0);

    // Simulate Escape while confirmation dialog is open
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
    });
    window.dispatchEvent(event);
    await nextTick();

    // Cancel should not be emitted because confirmation dialog is open
    expect(wrapper.emitted("cancel")).toBeFalsy();
  });

  it("removes keyboard event listener when modal closes", async () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: true,
      },
    });

    // Close modal
    await wrapper.setProps({ isOpen: false });
    await nextTick();

    // Simulate Ctrl+S after modal is closed
    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
    });
    window.dispatchEvent(event);
    await nextTick();

    // Save should not be emitted because modal is closed
    expect(wrapper.emitted("save")).toBeFalsy();
  });

  it("updates content when editor emits update:modelValue", async () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: true,
      },
    });

    const monacoEditor = wrapper.findComponent(MonacoEditor);
    const newContent = "Updated content from editor";

    await monacoEditor.vm.$emit("update:modelValue", newContent);
    await nextTick();

    // Click save to verify the updated content is emitted
    const saveButton = wrapper.find(".btn-save");
    await saveButton.trigger("click");
    await nextTick();

    expect(wrapper.emitted("save")?.[0]).toEqual([newContent]);
  });

  it("renders dark backdrop", () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: true,
      },
    });

    const backdrop = wrapper.find(".modal-backdrop");
    expect(backdrop.exists()).toBe(true);
  });

  it("triggers cancel when backdrop is clicked", async () => {
    const wrapper = mount(ProseEditorModal, {
      props: {
        section: mockSection,
        isOpen: true,
      },
    });

    const backdrop = wrapper.find(".modal-backdrop");
    await backdrop.trigger("click");
    await nextTick();

    expect(wrapper.emitted("cancel")).toBeTruthy();
  });
});

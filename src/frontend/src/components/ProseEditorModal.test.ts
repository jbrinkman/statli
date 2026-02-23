import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import ProseEditorModal from "./ProseEditorModal.vue";
import MonacoEditor from "./MonacoEditor.vue";

// Mock MonacoEditor component
vi.mock("./MonacoEditor.vue", () => ({
  default: {
    name: "MonacoEditor",
    template:
      '<div class="mock-monaco-editor"><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
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
    // Clear localStorage before each test
    localStorage.clear();
    // Use fake timers for auto-save tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Restore real timers after each test
    vi.restoreAllMocks();
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
    monacoEditor.vm.$emit("update:modelValue", "Modified content");
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
    monacoEditor.vm.$emit("update:modelValue", "Modified content");
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
    monacoEditor.vm.$emit("update:modelValue", "Modified content");
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
    monacoEditor.vm.$emit("update:modelValue", "Modified content");
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

    monacoEditor.vm.$emit("update:modelValue", newContent);
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

  describe("Auto-save functionality", () => {
    it("saves draft to localStorage every 30 seconds", async () => {
      const wrapper = mount(ProseEditorModal, {
        props: {
          section: mockSection,
          isOpen: true,
        },
      });

      await nextTick();

      const monacoEditor = wrapper.findComponent(MonacoEditor);
      monacoEditor.vm.$emit("update:modelValue", "Draft content");
      await nextTick();

      // Fast-forward time by 30 seconds
      vi.advanceTimersByTime(30000);
      await nextTick();

      // Check that draft was saved to localStorage
      const key = `prose-draft-${mockSection.id}`;
      expect(localStorage.getItem(key)).toBe("Draft content");
    });

    it("restores draft from localStorage when editor opens", async () => {
      // Save a draft to localStorage
      const key = `prose-draft-${mockSection.id}`;
      localStorage.setItem(key, "Restored draft content");

      const wrapper = mount(ProseEditorModal, {
        props: {
          section: mockSection,
          isOpen: true,
        },
      });

      await nextTick();

      const monacoEditor = wrapper.findComponent(MonacoEditor);
      expect(monacoEditor.props("modelValue")).toBe("Restored draft content");
    });

    it("clears draft from localStorage on successful save", async () => {
      // Save a draft to localStorage
      const key = `prose-draft-${mockSection.id}`;
      localStorage.setItem(key, "Draft to be cleared");

      const wrapper = mount(ProseEditorModal, {
        props: {
          section: mockSection,
          isOpen: true,
        },
      });

      await nextTick();

      // Click save button
      const saveButton = wrapper.find(".btn-save");
      await saveButton.trigger("click");
      await nextTick();

      // Check that draft was cleared from localStorage
      expect(localStorage.getItem(key)).toBeNull();
    });

    it("stops auto-save when modal closes", async () => {
      const wrapper = mount(ProseEditorModal, {
        props: {
          section: mockSection,
          isOpen: true,
        },
      });

      await nextTick();

      const monacoEditor = wrapper.findComponent(MonacoEditor);
      monacoEditor.vm.$emit("update:modelValue", "Content before close");
      await nextTick();

      // Close the modal
      await wrapper.setProps({ isOpen: false });
      await nextTick();

      // Update content after modal is closed
      const key = `prose-draft-${mockSection.id}`;
      localStorage.setItem(key, "Different content");

      // Fast-forward time by 30 seconds
      vi.advanceTimersByTime(30000);
      await nextTick();

      // The auto-save should not have overwritten the localStorage
      expect(localStorage.getItem(key)).toBe("Different content");
    });

    it("uses section content if no draft is available", async () => {
      const wrapper = mount(ProseEditorModal, {
        props: {
          section: mockSection,
          isOpen: true,
        },
      });

      await nextTick();

      const monacoEditor = wrapper.findComponent(MonacoEditor);
      expect(monacoEditor.props("modelValue")).toBe("Initial content");
    });
  });

  describe("Error handling", () => {
    it("handles localStorage full error gracefully", async () => {
      // Mock localStorage.setItem to throw QuotaExceededError
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new DOMException("QuotaExceededError");
      });

      const wrapper = mount(ProseEditorModal, {
        props: {
          section: mockSection,
          isOpen: true,
        },
      });

      await nextTick();

      const monacoEditor = wrapper.findComponent(MonacoEditor);
      monacoEditor.vm.$emit("update:modelValue", "Content that won't save");
      await nextTick();

      // Fast-forward time by 30 seconds to trigger auto-save
      vi.advanceTimersByTime(30000);
      await nextTick();

      // Editor should still be functional despite auto-save failure
      const saveButton = wrapper.find(".btn-save");
      expect(saveButton.exists()).toBe(true);

      // Restore original setItem
      Storage.prototype.setItem = originalSetItem;
    });

    it("handles localStorage unavailable gracefully", async () => {
      // Mock localStorage to be null
      const originalLocalStorage = global.localStorage;
      Object.defineProperty(global, "localStorage", {
        value: null,
        writable: true,
      });

      const wrapper = mount(ProseEditorModal, {
        props: {
          section: mockSection,
          isOpen: true,
        },
      });

      await nextTick();

      // Editor should still render and function
      const monacoEditor = wrapper.findComponent(MonacoEditor);
      expect(monacoEditor.exists()).toBe(true);

      // Restore localStorage
      Object.defineProperty(global, "localStorage", {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it("handles empty section content without errors", async () => {
      const emptySection = { ...mockSection, content: "" };
      const wrapper = mount(ProseEditorModal, {
        props: {
          section: emptySection,
          isOpen: true,
        },
      });

      await nextTick();

      const monacoEditor = wrapper.findComponent(MonacoEditor);
      expect(monacoEditor.props("modelValue")).toBe("");

      // Should be able to save empty content
      const saveButton = wrapper.find(".btn-save");
      await saveButton.trigger("click");
      await nextTick();

      expect(wrapper.emitted("save")).toBeTruthy();
      expect(wrapper.emitted("save")?.[0]).toEqual([""]);
    });

    it("handles very long content without errors", async () => {
      const longContent = "a".repeat(150000); // 150KB of content
      const longSection = { ...mockSection, content: longContent };

      const wrapper = mount(ProseEditorModal, {
        props: {
          section: longSection,
          isOpen: true,
        },
      });

      await nextTick();

      const monacoEditor = wrapper.findComponent(MonacoEditor);
      expect(monacoEditor.props("modelValue")).toBe(longContent);

      // Should be able to save long content
      const saveButton = wrapper.find(".btn-save");
      await saveButton.trigger("click");
      await nextTick();

      expect(wrapper.emitted("save")).toBeTruthy();
      expect(wrapper.emitted("save")?.[0]).toEqual([longContent]);
    });

    it("handles special characters in content", async () => {
      const specialContent = "Special: <>&\"'`\n\t\r\u0000\u{1F600}\u{1F4A9}";
      const specialSection = { ...mockSection, content: specialContent };

      const wrapper = mount(ProseEditorModal, {
        props: {
          section: specialSection,
          isOpen: true,
        },
      });

      await nextTick();

      const monacoEditor = wrapper.findComponent(MonacoEditor);
      expect(monacoEditor.props("modelValue")).toBe(specialContent);
    });
  });
});

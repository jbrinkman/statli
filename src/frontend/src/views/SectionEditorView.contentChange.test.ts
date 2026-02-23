import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import SectionEditorView from "./SectionEditorView.vue";
import type { ReportSection } from "../composables/useReports";

// Mock MonacoEditor component
vi.mock("../components/MonacoEditor.vue", () => ({
  default: {
    name: "MonacoEditor",
    template:
      '<div class="mock-monaco-editor"><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
    props: ["modelValue", "language", "theme", "placeholder"],
    emits: ["update:modelValue"],
  },
}));

// Mock useReports composable
const mockGetReportSection = vi.fn();
const mockUpdateReportSection = vi.fn();
const mockLoadStatusDefinitions = vi.fn();
const mockStatusDefinitions = { value: [] };

vi.mock("../composables/useReports", () => ({
  useReports: () => ({
    getReportSection: mockGetReportSection,
    updateReportSection: mockUpdateReportSection,
    loadStatusDefinitions: mockLoadStatusDefinitions,
    statusDefinitions: mockStatusDefinitions,
  }),
}));

// Mock useTasks composable
const mockLoadTasksBySection = vi.fn();
const mockTasks = { value: [] };
const mockSubtasks = { value: [] };

vi.mock("../composables/useTasks", () => ({
  useTasks: () => ({
    tasks: mockTasks,
    subtasks: mockSubtasks,
    loadTasksBySection: mockLoadTasksBySection,
    createTask: vi.fn(),
    updateTask: vi.fn(),
    softDeleteTask: vi.fn(),
    createSubtask: vi.fn(),
    updateSubtask: vi.fn(),
    softDeleteSubtask: vi.fn(),
    loading: { value: false },
    error: { value: null },
  }),
}));

describe("SectionEditorView - Content Change Tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLoadStatusDefinitions.mockResolvedValue(undefined);
    mockLoadTasksBySection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should handle @update:modelValue event from MonacoEditor and update content state", async () => {
    // Setup: Create a prose section
    const sectionData: ReportSection = {
      id: 1,
      project_id: 1,
      name: "Test Section",
      type: "prose",
      content: "Original content",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockGetReportSection.mockResolvedValue(sectionData);

    // Execute: Mount the component
    const wrapper = mount(SectionEditorView, {
      props: {
        sectionId: sectionData.id,
      },
    });

    // Wait for async data loading
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify: Initial content is loaded
    const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
    expect(monacoEditor.exists()).toBe(true);
    expect(monacoEditor.props("modelValue")).toBe("Original content");

    // Execute: Simulate content change by emitting update:modelValue
    const newContent = "Updated content from editor";
    await monacoEditor.vm.$emit("update:modelValue", newContent);
    await nextTick();

    // Verify: Content state is updated
    expect(monacoEditor.props("modelValue")).toBe(newContent);

    // Verify: The component tracks the change (hasUnsavedChanges should be true)
    // We can verify this by checking if the cancel button shows confirmation dialog
    const cancelButton = wrapper.find(".btn-cancel");
    await cancelButton.trigger("click");
    await nextTick();

    // The confirmation dialog should appear because content has changed
    const confirmDialog = wrapper.find(".dialog-overlay");
    expect(confirmDialog.exists()).toBe(true);

    // Cleanup
    wrapper.unmount();
  });

  it("should track content changes correctly", async () => {
    // Setup: Create a prose section
    const sectionData: ReportSection = {
      id: 2,
      project_id: 1,
      name: "Test Section",
      type: "prose",
      content: "Original content",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockGetReportSection.mockResolvedValue(sectionData);

    // Execute: Mount the component
    const wrapper = mount(SectionEditorView, {
      props: {
        sectionId: sectionData.id,
      },
    });

    // Wait for async data loading
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify: No unsaved changes initially
    const cancelButton = wrapper.find(".btn-cancel");
    await cancelButton.trigger("click");
    await nextTick();

    // No confirmation dialog should appear because no changes
    let confirmDialog = wrapper.find(".dialog-overlay");
    expect(confirmDialog.exists()).toBe(false);

    // Execute: Change content
    const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
    await monacoEditor.vm.$emit("update:modelValue", "Modified content");
    await nextTick();

    // Execute: Try to cancel again
    await cancelButton.trigger("click");
    await nextTick();

    // Verify: Confirmation dialog appears because content changed
    confirmDialog = wrapper.find(".dialog-overlay");
    expect(confirmDialog.exists()).toBe(true);

    // Cleanup
    wrapper.unmount();
  });

  it("should update content state when MonacoEditor emits multiple changes", async () => {
    // Setup: Create a prose section
    const sectionData: ReportSection = {
      id: 3,
      project_id: 1,
      name: "Test Section",
      type: "prose",
      content: "Initial",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockGetReportSection.mockResolvedValue(sectionData);

    // Execute: Mount the component
    const wrapper = mount(SectionEditorView, {
      props: {
        sectionId: sectionData.id,
      },
    });

    // Wait for async data loading
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });

    // Execute: Simulate multiple content changes
    const changes = ["Change 1", "Change 2", "Change 3", "Final content"];

    for (const change of changes) {
      await monacoEditor.vm.$emit("update:modelValue", change);
      await nextTick();

      // Verify: Content is updated after each change
      expect(monacoEditor.props("modelValue")).toBe(change);
    }

    // Verify: Final content is correct
    expect(monacoEditor.props("modelValue")).toBe("Final content");

    // Cleanup
    wrapper.unmount();
  });
});

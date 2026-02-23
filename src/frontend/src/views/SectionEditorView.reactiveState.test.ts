import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import SectionEditorView from "./SectionEditorView.vue";
import { useReports } from "../composables/useReports";
import { useTasks } from "../composables/useTasks";

// Mock the composables
vi.mock("../composables/useReports", () => ({
  useReports: vi.fn(),
}));

vi.mock("../composables/useTasks", () => ({
  useTasks: vi.fn(),
}));

// Mock MonacoEditor component to avoid Monaco initialization issues in tests
vi.mock("../components/MonacoEditor.vue", () => ({
  default: {
    name: "MonacoEditor",
    props: ["modelValue", "language", "placeholder"],
    template: '<div class="monaco-editor-mock"></div>',
  },
}));

describe("SectionEditorView - Reactive State Setup", () => {
  const mockGetReportSection = vi.fn();
  const mockUpdateReportSection = vi.fn();
  const mockLoadStatusDefinitions = vi.fn();
  const mockStatusDefinitions = { value: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    (useReports as any).mockReturnValue({
      getReportSection: mockGetReportSection,
      updateReportSection: mockUpdateReportSection,
      loadStatusDefinitions: mockLoadStatusDefinitions,
      statusDefinitions: mockStatusDefinitions,
    });
    (useTasks as any).mockReturnValue({
      tasks: { value: [] },
      subtasks: { value: [] },
      loadTasksBySection: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      softDeleteTask: vi.fn(),
      createSubtask: vi.fn(),
      updateSubtask: vi.fn(),
      softDeleteSubtask: vi.fn(),
      loading: { value: false },
      error: { value: null },
    });
    mockLoadStatusDefinitions.mockResolvedValue(undefined);
  });

  it("should initialize all section data reactive refs", async () => {
    const mockSection = {
      id: 1,
      project_id: 1,
      name: "Test Section",
      type: "prose",
      content: "Test content",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    };

    mockGetReportSection.mockResolvedValue(mockSection);

    const wrapper = mount(SectionEditorView, {
      props: {
        sectionId: 1,
      },
    });

    // Wait for the component to load
    await vi.waitFor(() => {
      expect(mockGetReportSection).toHaveBeenCalledWith(1);
    });

    // Verify section data refs are set
    expect(wrapper.vm.section).toEqual(mockSection);
    expect(wrapper.vm.originalSection).toEqual(mockSection);
    expect(wrapper.vm.sectionName).toBe("Test Section");
    expect(wrapper.vm.sectionType).toBe("prose");
    expect(wrapper.vm.content).toBe("Test content");
    expect(wrapper.vm.originalContent).toBe("Test content");
  });

  it("should initialize all UI state reactive refs with correct default values", () => {
    mockGetReportSection.mockResolvedValue({
      id: 1,
      project_id: 1,
      name: "Test",
      type: "prose",
      content: "",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    });

    const wrapper = mount(SectionEditorView, {
      props: {
        sectionId: 1,
      },
    });

    // Verify UI state refs are initialized
    expect(wrapper.vm.loading).toBe(true); // Initially true during load
    expect(wrapper.vm.saving).toBe(false);
    expect(wrapper.vm.error).toBe(null);
    expect(wrapper.vm.showConfirmDialog).toBe(false);
  });

  it("should update loading state after data loads", async () => {
    const mockSection = {
      id: 1,
      project_id: 1,
      name: "Test Section",
      type: "prose",
      content: "Test content",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    };

    mockGetReportSection.mockResolvedValue(mockSection);

    const wrapper = mount(SectionEditorView, {
      props: {
        sectionId: 1,
      },
    });

    // Initially loading should be true
    expect(wrapper.vm.loading).toBe(true);

    // Wait for data to load
    await vi.waitFor(() => {
      expect(wrapper.vm.loading).toBe(false);
    });
  });

  it("should set error state when loading fails", async () => {
    mockGetReportSection.mockRejectedValue(new Error("Failed to load"));

    const wrapper = mount(SectionEditorView, {
      props: {
        sectionId: 1,
      },
    });

    // Wait for error to be set
    await vi.waitFor(() => {
      expect(wrapper.vm.error).toBe("Failed to load");
    });

    expect(wrapper.vm.loading).toBe(false);
  });

  it("should update saving state during save operation", async () => {
    const mockSection = {
      id: 1,
      project_id: 1,
      name: "Test Section",
      type: "prose",
      content: "Test content",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    };

    mockGetReportSection.mockResolvedValue(mockSection);
    mockUpdateReportSection.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
    });

    const wrapper = mount(SectionEditorView, {
      props: {
        sectionId: 1,
      },
    });

    // Wait for data to load
    await vi.waitFor(() => {
      expect(wrapper.vm.loading).toBe(false);
    });

    // Initially saving should be false
    expect(wrapper.vm.saving).toBe(false);

    // Trigger save
    wrapper.vm.handleSave();

    // During save, saving should be true
    await vi.waitFor(() => {
      expect(wrapper.vm.saving).toBe(true);
    });

    // After save completes, saving should be false
    await vi.waitFor(() => {
      expect(wrapper.vm.saving).toBe(false);
    });
  });

  it("should update showConfirmDialog state when cancel is triggered with changes", async () => {
    const mockSection = {
      id: 1,
      project_id: 1,
      name: "Test Section",
      type: "prose",
      content: "Test content",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    };

    mockGetReportSection.mockResolvedValue(mockSection);

    const wrapper = mount(SectionEditorView, {
      props: {
        sectionId: 1,
      },
    });

    // Wait for data to load
    await vi.waitFor(() => {
      expect(wrapper.vm.loading).toBe(false);
    });

    // Initially showConfirmDialog should be false
    expect(wrapper.vm.showConfirmDialog).toBe(false);

    // Make a change
    wrapper.vm.sectionName = "Modified Section";

    // Trigger cancel
    wrapper.vm.handleCancel();

    // showConfirmDialog should now be true
    expect(wrapper.vm.showConfirmDialog).toBe(true);
  });
});

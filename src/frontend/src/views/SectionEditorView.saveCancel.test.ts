import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import SectionEditorView from "./SectionEditorView.vue";
import { useReports } from "../composables/useReports";

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

// Mock the composables
vi.mock("../composables/useReports", () => ({
  useReports: vi.fn(),
}));

describe("SectionEditorView - Save and Cancel Buttons", () => {
  const mockGetReportSection = vi.fn();
  const mockUpdateReportSection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useReports as any).mockReturnValue({
      getReportSection: mockGetReportSection,
      updateReportSection: mockUpdateReportSection,
    });
  });

  it("should render save and cancel buttons", async () => {
    mockGetReportSection.mockResolvedValue({
      id: 1,
      project_id: 1,
      name: "Test Section",
      type: "prose",
      content: "Test content",
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

    // Wait for data to load
    await vi.waitFor(() => {
      expect(wrapper.find(".btn-save").exists()).toBe(true);
    });

    expect(wrapper.find(".btn-cancel").exists()).toBe(true);
    expect(wrapper.find(".btn-save").text()).toBe("Save");
  });

  it("should show loading state on save button during save operation", async () => {
    mockGetReportSection.mockResolvedValue({
      id: 1,
      project_id: 1,
      name: "Test Section",
      type: "prose",
      content: "Test content",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    });

    // Make update take some time
    mockUpdateReportSection.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(undefined), 100);
      });
    });

    const wrapper = mount(SectionEditorView, {
      props: {
        sectionId: 1,
      },
    });

    // Wait for data to load
    await vi.waitFor(() => {
      expect(wrapper.find(".btn-save").exists()).toBe(true);
    });

    // Modify content to enable save
    await wrapper.find(".section-name-input").setValue("Modified Section");

    // Click save button
    await wrapper.find(".btn-save").trigger("click");

    // Check that button shows loading state
    await vi.waitFor(() => {
      expect(wrapper.find(".btn-save").text()).toBe("Saving...");
    });
  });

  it("should disable save button during save operation", async () => {
    mockGetReportSection.mockResolvedValue({
      id: 1,
      project_id: 1,
      name: "Test Section",
      type: "prose",
      content: "Test content",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    });

    // Make update take some time
    mockUpdateReportSection.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(undefined), 100);
      });
    });

    const wrapper = mount(SectionEditorView, {
      props: {
        sectionId: 1,
      },
    });

    // Wait for data to load
    await vi.waitFor(() => {
      expect(wrapper.find(".btn-save").exists()).toBe(true);
    });

    // Initially, button should not be disabled
    expect(wrapper.find(".btn-save").attributes("disabled")).toBeUndefined();

    // Modify content to enable save
    await wrapper.find(".section-name-input").setValue("Modified Section");

    // Click save button
    await wrapper.find(".btn-save").trigger("click");

    // Check that button is disabled during save
    await vi.waitFor(() => {
      expect(wrapper.find(".btn-save").attributes("disabled")).toBeDefined();
    });
  });

  it("should re-enable save button after save completes", async () => {
    mockGetReportSection.mockResolvedValue({
      id: 1,
      project_id: 1,
      name: "Test Section",
      type: "prose",
      content: "Test content",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    });

    mockUpdateReportSection.mockResolvedValue(undefined);

    const wrapper = mount(SectionEditorView, {
      props: {
        sectionId: 1,
      },
    });

    // Wait for data to load
    await vi.waitFor(() => {
      expect(wrapper.find(".btn-save").exists()).toBe(true);
    });

    // Modify content to enable save
    await wrapper.find(".section-name-input").setValue("Modified Section");

    // Click save button
    await wrapper.find(".btn-save").trigger("click");

    // Wait for save to complete and check button is re-enabled
    await vi.waitFor(() => {
      expect(wrapper.emitted("navigate-back")).toBeTruthy();
    });
  });

  it("should trigger cancel when cancel button is clicked", async () => {
    mockGetReportSection.mockResolvedValue({
      id: 1,
      project_id: 1,
      name: "Test Section",
      type: "prose",
      content: "Test content",
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

    // Wait for data to load
    await vi.waitFor(() => {
      expect(wrapper.find(".btn-cancel").exists()).toBe(true);
    });

    // Click cancel button (no changes, should navigate immediately)
    await wrapper.find(".btn-cancel").trigger("click");

    // Should emit navigate-back
    expect(wrapper.emitted("navigate-back")).toBeTruthy();
  });

  it("should show confirmation dialog when cancel is clicked with unsaved changes", async () => {
    mockGetReportSection.mockResolvedValue({
      id: 1,
      project_id: 1,
      name: "Test Section",
      type: "prose",
      content: "Test content",
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

    // Wait for data to load
    await vi.waitFor(() => {
      expect(wrapper.find(".btn-cancel").exists()).toBe(true);
    });

    // Modify content to create unsaved changes
    await wrapper.find(".section-name-input").setValue("Modified Section");

    // Click cancel button
    await wrapper.find(".btn-cancel").trigger("click");

    // Should show confirmation dialog
    await vi.waitFor(() => {
      expect(wrapper.find(".dialog-overlay").exists()).toBe(true);
    });
  });

  it("should prevent multiple save operations when button is disabled", async () => {
    mockGetReportSection.mockResolvedValue({
      id: 1,
      project_id: 1,
      name: "Test Section",
      type: "prose",
      content: "Test content",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    });

    // Make update take some time
    mockUpdateReportSection.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(undefined), 100);
      });
    });

    const wrapper = mount(SectionEditorView, {
      props: {
        sectionId: 1,
      },
    });

    // Wait for data to load
    await vi.waitFor(() => {
      expect(wrapper.find(".btn-save").exists()).toBe(true);
    });

    // Modify content to enable save
    await wrapper.find(".section-name-input").setValue("Modified Section");

    // Click save button
    await wrapper.find(".btn-save").trigger("click");

    // Try to click again while saving
    await wrapper.find(".btn-save").trigger("click");

    // Wait for save to complete
    await vi.waitFor(() => {
      expect(wrapper.emitted("navigate-back")).toBeTruthy();
    });

    // Should only have been called once
    expect(mockUpdateReportSection).toHaveBeenCalledTimes(1);
  });
});

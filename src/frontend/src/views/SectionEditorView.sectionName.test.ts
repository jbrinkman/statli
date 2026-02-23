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

vi.mock("../composables/useReports", () => ({
  useReports: () => ({
    getReportSection: mockGetReportSection,
    updateReportSection: mockUpdateReportSection,
  }),
}));

describe("SectionEditorView - Section Name Input (Task 3.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockSection = (
    overrides?: Partial<ReportSection>,
  ): ReportSection => ({
    id: 1,
    project_id: 1,
    name: "Test Section",
    type: "prose",
    content: "Test content",
    order: 1,
    is_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  describe("Section Name Input Field", () => {
    it("should render an editable text input bound to sectionName", async () => {
      const mockSection = createMockSection({ name: "My Section Name" });
      mockGetReportSection.mockResolvedValue(mockSection);

      const wrapper = mount(SectionEditorView, {
        props: { sectionId: mockSection.id },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const nameInput = wrapper.find(".section-name-input");

      // Verify input exists
      expect(nameInput.exists()).toBe(true);

      // Verify it's a text input
      expect(nameInput.element.tagName).toBe("INPUT");
      expect((nameInput.element as HTMLInputElement).type).toBe("text");

      // Verify it's bound to the section name
      expect((nameInput.element as HTMLInputElement).value).toBe(
        "My Section Name",
      );

      wrapper.unmount();
    });

    it("should have proper ARIA label for accessibility", async () => {
      const mockSection = createMockSection();
      mockGetReportSection.mockResolvedValue(mockSection);

      const wrapper = mount(SectionEditorView, {
        props: { sectionId: mockSection.id },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const nameInput = wrapper.find(".section-name-input");

      // Verify ARIA label exists
      expect(nameInput.attributes("aria-label")).toBe("Section name");

      wrapper.unmount();
    });

    it("should handle name change events", async () => {
      const mockSection = createMockSection({ name: "Original Name" });
      mockGetReportSection.mockResolvedValue(mockSection);

      const wrapper = mount(SectionEditorView, {
        props: { sectionId: mockSection.id },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const nameInput = wrapper.find(".section-name-input");

      // Change the input value
      await nameInput.setValue("Updated Name");
      await nextTick();

      // Verify the value was updated
      expect((nameInput.element as HTMLInputElement).value).toBe(
        "Updated Name",
      );

      wrapper.unmount();
    });

    it("should update sectionName state when input changes", async () => {
      const mockSection = createMockSection({ name: "Initial Name" });
      mockGetReportSection.mockResolvedValue(mockSection);

      const wrapper = mount(SectionEditorView, {
        props: { sectionId: mockSection.id },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const nameInput = wrapper.find(".section-name-input");

      // Change the input value
      await nameInput.setValue("New Name");
      await nextTick();

      // Verify the internal state was updated by checking if save would include the new name
      // We can verify this by triggering a save and checking the API call
      mockUpdateReportSection.mockResolvedValue(undefined);

      const saveButton = wrapper.find(".btn-save");
      await saveButton.trigger("click");
      await nextTick();

      // Verify updateReportSection was called with the new name
      expect(mockUpdateReportSection).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Name",
        }),
      );

      wrapper.unmount();
    });

    it("should have a placeholder attribute", async () => {
      const mockSection = createMockSection();
      mockGetReportSection.mockResolvedValue(mockSection);

      const wrapper = mount(SectionEditorView, {
        props: { sectionId: mockSection.id },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const nameInput = wrapper.find(".section-name-input");

      // Verify placeholder exists
      expect(nameInput.attributes("placeholder")).toBe("Section name");

      wrapper.unmount();
    });

    it("should allow empty section names (validation is separate)", async () => {
      const mockSection = createMockSection({ name: "Some Name" });
      mockGetReportSection.mockResolvedValue(mockSection);

      const wrapper = mount(SectionEditorView, {
        props: { sectionId: mockSection.id },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const nameInput = wrapper.find(".section-name-input");

      // Clear the input
      await nameInput.setValue("");
      await nextTick();

      // Verify the value can be empty
      expect((nameInput.element as HTMLInputElement).value).toBe("");

      wrapper.unmount();
    });
  });
});

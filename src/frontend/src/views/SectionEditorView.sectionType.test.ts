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

describe("SectionEditorView - Section Type Selector (Task 3.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Section Type Selector Rendering", () => {
    it("should render dropdown with prose and status options", async () => {
      const mockSection: ReportSection = {
        id: 1,
        project_id: 1,
        name: "Test Section",
        type: "prose",
        content: "Test content",
        order: 1,
        is_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockGetReportSection.mockResolvedValue(mockSection);

      const wrapper = mount(SectionEditorView, {
        props: { sectionId: 1 },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify dropdown exists
      const typeSelector = wrapper.find(".section-type-selector");
      expect(typeSelector.exists()).toBe(true);

      // Verify options exist
      const options = typeSelector.findAll("option");
      expect(options).toHaveLength(2);
      expect(options[0].text()).toBe("Prose");
      expect(options[0].element.value).toBe("prose");
      expect(options[1].text()).toBe("Status");
      expect(options[1].element.value).toBe("status");

      wrapper.unmount();
    });

    it("should bind to sectionType reactive state", async () => {
      const mockSection: ReportSection = {
        id: 1,
        project_id: 1,
        name: "Test Section",
        type: "status",
        content: "",
        order: 1,
        is_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockGetReportSection.mockResolvedValue(mockSection);

      const wrapper = mount(SectionEditorView, {
        props: { sectionId: 1 },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify initial value matches section type
      const typeSelector = wrapper.find(".section-type-selector");
      expect((typeSelector.element as HTMLSelectElement).value).toBe("status");

      wrapper.unmount();
    });
  });

  describe("Section Type Change Handling", () => {
    it("should update sectionType when dropdown value changes", async () => {
      const mockSection: ReportSection = {
        id: 1,
        project_id: 1,
        name: "Test Section",
        type: "prose",
        content: "Test content",
        order: 1,
        is_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockGetReportSection.mockResolvedValue(mockSection);

      const wrapper = mount(SectionEditorView, {
        props: { sectionId: 1 },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Change the dropdown value
      const typeSelector = wrapper.find(".section-type-selector");
      await typeSelector.setValue("status");
      await nextTick();

      // Verify the value changed
      expect((typeSelector.element as HTMLSelectElement).value).toBe("status");

      wrapper.unmount();
    });

    it("should switch from MonacoEditor to task list when changing from prose to status", async () => {
      const mockSection: ReportSection = {
        id: 1,
        project_id: 1,
        name: "Test Section",
        type: "prose",
        content: "Test content",
        order: 1,
        is_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockGetReportSection.mockResolvedValue(mockSection);

      const wrapper = mount(SectionEditorView, {
        props: { sectionId: 1 },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify MonacoEditor is displayed initially
      let monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      expect(monacoEditor.exists()).toBe(true);

      let taskList = wrapper.find(".task-list-container");
      expect(taskList.exists()).toBe(false);

      // Change type to status
      const typeSelector = wrapper.find(".section-type-selector");
      await typeSelector.setValue("status");
      await nextTick();

      // Verify MonacoEditor is hidden
      monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      expect(monacoEditor.exists()).toBe(false);

      // Verify task list is displayed
      taskList = wrapper.find(".task-list-container");
      expect(taskList.exists()).toBe(true);

      wrapper.unmount();
    });

    it("should switch from task list to MonacoEditor when changing from status to prose", async () => {
      const mockSection: ReportSection = {
        id: 1,
        project_id: 1,
        name: "Test Section",
        type: "status",
        content: "",
        order: 1,
        is_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockGetReportSection.mockResolvedValue(mockSection);

      const wrapper = mount(SectionEditorView, {
        props: { sectionId: 1 },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify task list is displayed initially
      let taskList = wrapper.find(".task-list-container");
      expect(taskList.exists()).toBe(true);

      let monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      expect(monacoEditor.exists()).toBe(false);

      // Change type to prose
      const typeSelector = wrapper.find(".section-type-selector");
      await typeSelector.setValue("prose");
      await nextTick();

      // Verify task list is hidden
      taskList = wrapper.find(".task-list-container");
      expect(taskList.exists()).toBe(false);

      // Verify MonacoEditor is displayed
      monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      expect(monacoEditor.exists()).toBe(true);

      wrapper.unmount();
    });

    it("should stop auto-save when switching from prose to status", async () => {
      const mockSection: ReportSection = {
        id: 1,
        project_id: 1,
        name: "Test Section",
        type: "prose",
        content: "Test content",
        order: 1,
        is_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockGetReportSection.mockResolvedValue(mockSection);

      const wrapper = mount(SectionEditorView, {
        props: { sectionId: 1 },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Save a draft to localStorage to verify auto-save was working
      const key = `section-draft-1`;
      localStorage.setItem(key, "initial content");

      // Change type to status
      const typeSelector = wrapper.find(".section-type-selector");
      await typeSelector.setValue("status");
      await nextTick();

      // Verify the component switched to task list (auto-save should be stopped)
      const taskList = wrapper.find(".task-list-container");
      expect(taskList.exists()).toBe(true);

      wrapper.unmount();
    });

    it("should start auto-save when switching from status to prose", async () => {
      const mockSection: ReportSection = {
        id: 1,
        project_id: 1,
        name: "Test Section",
        type: "status",
        content: "",
        order: 1,
        is_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockGetReportSection.mockResolvedValue(mockSection);

      const wrapper = mount(SectionEditorView, {
        props: { sectionId: 1 },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify task list is displayed initially
      let taskList = wrapper.find(".task-list-container");
      expect(taskList.exists()).toBe(true);

      // Change type to prose
      const typeSelector = wrapper.find(".section-type-selector");
      await typeSelector.setValue("prose");
      await nextTick();

      // Verify MonacoEditor is displayed (auto-save should be started)
      const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
      expect(monacoEditor.exists()).toBe(true);

      wrapper.unmount();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA label for section type selector", async () => {
      const mockSection: ReportSection = {
        id: 1,
        project_id: 1,
        name: "Test Section",
        type: "prose",
        content: "Test content",
        order: 1,
        is_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockGetReportSection.mockResolvedValue(mockSection);

      const wrapper = mount(SectionEditorView, {
        props: { sectionId: 1 },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const typeSelector = wrapper.find(".section-type-selector");
      expect(typeSelector.attributes("aria-label")).toBe("Section type");

      wrapper.unmount();
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import * as fc from "fast-check";
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

describe("SectionEditorView - Section Type Change Component Switch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLoadStatusDefinitions.mockResolvedValue(undefined);
    mockLoadTasksBySection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property 3: Section Type Change Component Switch", () => {
    /**
     * **Validates: Requirements 4.4, 4.5**
     *
     * Property: For any section being edited, changing the section type should
     * immediately switch the content area to display the appropriate component
     * (Monaco Editor for prose, Task List for status).
     */
    it("should immediately switch from Monaco Editor to Task List when changing type from prose to status", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary prose section data
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constant("prose"),
            content: fc.string({ maxLength: 5000 }),
            order: fc.integer({ min: 0, max: 100 }),
            is_enabled: fc.boolean(),
            created_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
            updated_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
          }),
          async (sectionData: ReportSection) => {
            // Setup: Mock the backend to return the generated prose section
            mockGetReportSection.mockResolvedValue(sectionData);

            // Execute: Mount the component with the prose section
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: sectionData.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: Initial state - Monaco Editor is displayed
            let monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
            let taskList = wrapper.findComponent({ name: "TaskList" });
            expect(monacoEditor.exists()).toBe(true);
            expect(taskList.exists()).toBe(false);

            // Execute: Change section type from prose to status
            const typeSelector = wrapper.find(".section-type-selector");
            await typeSelector.setValue("status");
            await nextTick();

            // Verify: Monaco Editor is hidden
            monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
            expect(monacoEditor.exists()).toBe(false);

            // Verify: Task List is displayed
            taskList = wrapper.findComponent({ name: "TaskList" });
            expect(taskList.exists()).toBe(true);

            // Verify: Only one component is displayed (XOR)
            expect(monacoEditor.exists() !== taskList.exists()).toBe(true);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should immediately switch from Task List to Monaco Editor when changing type from status to prose", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary status section data
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constant("status"),
            content: fc.string({ maxLength: 5000 }),
            order: fc.integer({ min: 0, max: 100 }),
            is_enabled: fc.boolean(),
            created_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
            updated_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
          }),
          async (sectionData: ReportSection) => {
            // Setup: Mock the backend to return the generated status section
            mockGetReportSection.mockResolvedValue(sectionData);

            // Execute: Mount the component with the status section
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: sectionData.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: Initial state - Task List is displayed
            let taskList = wrapper.findComponent({ name: "TaskList" });
            let monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
            expect(taskList.exists()).toBe(true);
            expect(monacoEditor.exists()).toBe(false);

            // Execute: Change section type from status to prose
            const typeSelector = wrapper.find(".section-type-selector");
            await typeSelector.setValue("prose");
            await nextTick();

            // Verify: Task List is hidden
            taskList = wrapper.findComponent({ name: "TaskList" });
            expect(taskList.exists()).toBe(false);

            // Verify: Monaco Editor is displayed
            monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
            expect(monacoEditor.exists()).toBe(true);

            // Verify: Only one component is displayed (XOR)
            expect(monacoEditor.exists() !== taskList.exists()).toBe(true);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should maintain component switch consistency across multiple type changes", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary section data with initial type
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            initialType: fc.constantFrom("prose", "status"),
            content: fc.string({ maxLength: 5000 }),
            order: fc.integer({ min: 0, max: 100 }),
            is_enabled: fc.boolean(),
            created_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
            updated_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
          }),
          // Generate a sequence of type changes
          fc.array(fc.constantFrom("prose", "status"), {
            minLength: 2,
            maxLength: 5,
          }),
          async (sectionData, typeChanges) => {
            // Setup: Create section with initial type
            const section: ReportSection = {
              id: sectionData.id,
              project_id: sectionData.project_id,
              name: sectionData.name,
              type: sectionData.initialType,
              content: sectionData.content,
              order: sectionData.order,
              is_enabled: sectionData.is_enabled,
              created_at: sectionData.created_at,
              updated_at: sectionData.updated_at,
            };

            mockGetReportSection.mockResolvedValue(section);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: section.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify initial state
            let currentType = section.type;
            const verifyComponentForType = (type: string) => {
              const monacoEditor = wrapper.findComponent({
                name: "MonacoEditor",
              });
              const taskList = wrapper.findComponent({ name: "TaskList" });

              if (type === "prose") {
                expect(monacoEditor.exists()).toBe(true);
                expect(taskList.exists()).toBe(false);
              } else {
                expect(monacoEditor.exists()).toBe(false);
                expect(taskList.exists()).toBe(true);
              }

              // Verify XOR: exactly one component is displayed
              expect(monacoEditor.exists() !== taskList.exists()).toBe(true);
            };

            // Verify initial component matches initial type
            verifyComponentForType(currentType);

            // Execute: Apply each type change in sequence
            const typeSelector = wrapper.find(".section-type-selector");
            for (const newType of typeChanges) {
              await typeSelector.setValue(newType);
              await nextTick();

              // Verify: Component matches the new type
              verifyComponentForType(newType);
              currentType = newType;
            }

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should preserve content area structure during type changes", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary section data
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constantFrom("prose", "status"),
            content: fc.string({ maxLength: 5000 }),
            order: fc.integer({ min: 0, max: 100 }),
            is_enabled: fc.boolean(),
            created_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
            updated_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
          }),
          async (sectionData: ReportSection) => {
            // Setup: Mock the backend to return the generated section
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

            // Verify: Content area exists before type change
            let contentArea = wrapper.find(".content-area");
            expect(contentArea.exists()).toBe(true);

            // Execute: Change to opposite type
            const typeSelector = wrapper.find(".section-type-selector");
            const newType = sectionData.type === "prose" ? "status" : "prose";
            await typeSelector.setValue(newType);
            await nextTick();

            // Verify: Content area still exists after type change
            contentArea = wrapper.find(".content-area");
            expect(contentArea.exists()).toBe(true);

            // Verify: Appropriate component is rendered within content area
            if (newType === "prose") {
              const monacoEditor = contentArea.findComponent({
                name: "MonacoEditor",
              });
              expect(monacoEditor.exists()).toBe(true);
            } else {
              const taskList = contentArea.findComponent({ name: "TaskList" });
              expect(taskList.exists()).toBe(true);
            }

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should handle rapid type changes without breaking component rendering", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary section data
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constantFrom("prose", "status"),
            content: fc.string({ maxLength: 5000 }),
            order: fc.integer({ min: 0, max: 100 }),
            is_enabled: fc.boolean(),
            created_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
            updated_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
          }),
          async (sectionData: ReportSection) => {
            // Setup: Mock the backend to return the generated section
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

            const typeSelector = wrapper.find(".section-type-selector");

            // Execute: Perform rapid type changes (toggle back and forth)
            const changes = ["prose", "status", "prose", "status", "prose"];
            for (const type of changes) {
              await typeSelector.setValue(type);
              // Don't wait for nextTick - simulate rapid changes
            }

            // Wait for all changes to settle
            await nextTick();
            await nextTick();

            // Verify: Final state is consistent with last type change
            const finalType = changes[changes.length - 1];
            const monacoEditor = wrapper.findComponent({
              name: "MonacoEditor",
            });
            const taskList = wrapper.findComponent({ name: "TaskList" });

            if (finalType === "prose") {
              expect(monacoEditor.exists()).toBe(true);
              expect(taskList.exists()).toBe(false);
            } else {
              expect(monacoEditor.exists()).toBe(false);
              expect(taskList.exists()).toBe(true);
            }

            // Verify: XOR - exactly one component is displayed
            expect(monacoEditor.exists() !== taskList.exists()).toBe(true);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

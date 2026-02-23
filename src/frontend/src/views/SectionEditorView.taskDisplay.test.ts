import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import * as fc from "fast-check";
import SectionEditorView from "./SectionEditorView.vue";
import type { ReportSection } from "../composables/useReports";
import type { Task } from "../composables/useTasks";

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

// Mock TaskList component
vi.mock("../components/TaskList.vue", () => ({
  default: {
    name: "TaskList",
    template: '<div class="mock-task-list">Task List</div>',
    props: [
      "tasks",
      "subtasks",
      "sections",
      "statusDefinitions",
      "loading",
      "error",
    ],
    emits: [
      "create-task",
      "edit-task",
      "delete-task",
      "create-subtask",
      "edit-subtask",
      "delete-subtask",
      "select-task",
      "select-subtask",
    ],
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

describe("SectionEditorView - Task Display Completeness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLoadStatusDefinitions.mockResolvedValue(undefined);
    mockLoadTasksBySection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property 23: Task Display Completeness", () => {
    /**
     * **Validates: Requirements 3.2**
     *
     * Property: For any status section with a set of tasks, the TaskList component
     * should receive and display all tasks associated with that section.
     */
    it("should pass all tasks for the section to TaskList component", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a status section
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constant("status"),
            content: fc.string({ maxLength: 1000 }),
            order: fc.integer({ min: 0, max: 100 }),
            is_enabled: fc.boolean(),
            created_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
            updated_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
          }),
          // Generate an array of tasks for this section
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 100000 }),
              project_id: fc.integer({ min: 1, max: 1000 }),
              report_section_id: fc.integer({ min: 1, max: 10000 }),
              name: fc.string({ minLength: 1, maxLength: 200 }),
              status: fc.constantFrom(
                "Not Started",
                "In Progress",
                "Completed",
                "Blocked",
              ),
              expected_completion_date: fc.option(
                fc
                  .integer({ min: 1577836800000, max: 1924905600000 })
                  .map((ts) => new Date(ts).toISOString()),
                { nil: null },
              ),
              url: fc.option(fc.webUrl(), { nil: "" }),
              notes: fc.string({ maxLength: 500 }),
              priority: fc.integer({ min: 1, max: 100 }),
              is_deleted: fc.constant(false),
              is_archived: fc.constant(false),
              created_at: fc
                .integer({ min: 1577836800000, max: 1924905600000 })
                .map((ts) => new Date(ts).toISOString()),
              updated_at: fc
                .integer({ min: 1577836800000, max: 1924905600000 })
                .map((ts) => new Date(ts).toISOString()),
            }),
            { minLength: 0, maxLength: 20 },
          ),
          async (sectionData: ReportSection, generatedTasks: Task[]) => {
            // Ensure all tasks belong to this section
            const tasks = generatedTasks.map((task) => ({
              ...task,
              report_section_id: sectionData.id,
              project_id: sectionData.project_id,
            }));

            // Setup: Mock the backend to return the section and tasks
            mockGetReportSection.mockResolvedValue(sectionData);
            mockTasks.value = tasks;

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: sectionData.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: TaskList component is rendered for status section
            const taskList = wrapper.findComponent({ name: "TaskList" });
            expect(taskList.exists()).toBe(true);

            // Verify: TaskList receives the tasks prop
            expect(taskList.props("tasks")).toBeDefined();

            // Verify: TaskList receives all tasks for this section
            // The tasks prop should be the actual array value, not the ref
            const receivedTasks = taskList.props("tasks");
            expect(receivedTasks).toEqual(tasks);

            // Verify: TaskList receives the section in sections prop
            const receivedSections = taskList.props("sections");
            expect(receivedSections).toBeDefined();
            expect(receivedSections).toHaveLength(1);
            expect(receivedSections[0].id).toBe(sectionData.id);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should handle empty task list for status sections", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a status section
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constant("status"),
            content: fc.string({ maxLength: 1000 }),
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
            // Setup: Mock the backend to return the section with no tasks
            mockGetReportSection.mockResolvedValue(sectionData);
            mockTasks.value = [];

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: sectionData.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: TaskList component is still rendered
            const taskList = wrapper.findComponent({ name: "TaskList" });
            expect(taskList.exists()).toBe(true);

            // Verify: TaskList receives empty tasks array
            const receivedTasks = taskList.props("tasks");
            expect(receivedTasks).toEqual([]);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should load tasks when section type is status", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a status section
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constant("status"),
            content: fc.string({ maxLength: 1000 }),
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
            // Setup: Mock the backend to return the section
            mockGetReportSection.mockResolvedValue(sectionData);
            mockTasks.value = [];

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: sectionData.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: loadTasksBySection was called with the section ID
            expect(mockLoadTasksBySection).toHaveBeenCalledWith(sectionData.id);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

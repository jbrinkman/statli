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

describe("SectionEditorView - Keyboard Shortcut Save Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLoadStatusDefinitions.mockResolvedValue(undefined);
    mockLoadTasksBySection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property 17: Keyboard Shortcut Save", () => {
    /**
     * **Validates: Requirements 7.1, 7.3**
     *
     * Property: For any section being edited, pressing Ctrl+S (or Cmd+S on Mac)
     * should trigger the save operation and prevent the browser's default save behavior.
     */
    it("should trigger save on Ctrl+S and prevent default", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate section data
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
          // Generate a new name to create unsaved changes
          fc.string({ minLength: 1, maxLength: 100 }),
          async (section: ReportSection, newName: string) => {
            // Ensure the new name is different
            fc.pre(newName !== section.name);

            // Setup: Mock the backend
            mockGetReportSection.mockResolvedValue(section);
            mockUpdateReportSection.mockResolvedValue(undefined);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: section.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Modify the name to create unsaved changes
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            // Create a keyboard event for Ctrl+S
            const event = new KeyboardEvent("keydown", {
              key: "s",
              ctrlKey: true,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(event, "preventDefault");

            // Dispatch the event
            window.dispatchEvent(event);
            await nextTick();

            // Verify: preventDefault was called
            expect(preventDefaultSpy).toHaveBeenCalled();

            // Verify: updateReportSection was called (save was triggered)
            expect(mockUpdateReportSection).toHaveBeenCalledWith(
              expect.objectContaining({
                name: newName,
              }),
            );

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should trigger save on Cmd+S (Mac) and prevent default", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate section data
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
          // Generate a new name to create unsaved changes
          fc.string({ minLength: 1, maxLength: 100 }),
          async (section: ReportSection, newName: string) => {
            // Ensure the new name is different
            fc.pre(newName !== section.name);

            // Setup: Mock the backend
            mockGetReportSection.mockResolvedValue(section);
            mockUpdateReportSection.mockResolvedValue(undefined);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: section.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Modify the name to create unsaved changes
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            // Create a keyboard event for Cmd+S (Mac)
            const event = new KeyboardEvent("keydown", {
              key: "s",
              metaKey: true,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(event, "preventDefault");

            // Dispatch the event
            window.dispatchEvent(event);
            await nextTick();

            // Verify: preventDefault was called
            expect(preventDefaultSpy).toHaveBeenCalled();

            // Verify: updateReportSection was called (save was triggered)
            expect(mockUpdateReportSection).toHaveBeenCalledWith(
              expect.objectContaining({
                name: newName,
              }),
            );

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should work for prose sections with content changes", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate prose section data
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
          // Generate new content
          fc.string({ maxLength: 5000 }),
          async (section: ReportSection, newContent: string) => {
            // Ensure the new content is different
            fc.pre(newContent !== section.content);

            // Setup: Mock the backend
            mockGetReportSection.mockResolvedValue(section);
            mockUpdateReportSection.mockResolvedValue(undefined);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: section.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Modify the content
            const monacoInput = wrapper.find(".mock-monaco-editor input");
            await monacoInput.setValue(newContent);
            await monacoInput.trigger("input");
            await nextTick();

            // Create a keyboard event for Ctrl+S
            const event = new KeyboardEvent("keydown", {
              key: "s",
              ctrlKey: true,
              bubbles: true,
              cancelable: true,
            });

            // Dispatch the event
            window.dispatchEvent(event);
            await nextTick();

            // Verify: updateReportSection was called with new content
            expect(mockUpdateReportSection).toHaveBeenCalledWith(
              expect.objectContaining({
                content: newContent,
              }),
            );

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should work for status sections with metadata changes", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate status section data
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
          // Generate a new name
          fc.string({ minLength: 1, maxLength: 100 }),
          async (section: ReportSection, newName: string) => {
            // Ensure the new name is different
            fc.pre(newName !== section.name);

            // Setup: Mock the backend
            mockGetReportSection.mockResolvedValue(section);
            mockUpdateReportSection.mockResolvedValue(undefined);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: section.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Modify the name
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            // Create a keyboard event for Ctrl+S
            const event = new KeyboardEvent("keydown", {
              key: "s",
              ctrlKey: true,
              bubbles: true,
              cancelable: true,
            });

            // Dispatch the event
            window.dispatchEvent(event);
            await nextTick();

            // Verify: updateReportSection was called
            expect(mockUpdateReportSection).toHaveBeenCalledWith(
              expect.objectContaining({
                name: newName,
              }),
            );

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

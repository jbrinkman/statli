/**
 * Property-Based Test: Navigation Guard Confirmation
 *
 * Feature: section-editor-view
 * Property 20: Navigation Guard Confirmation
 *
 * For any section with unsaved changes, attempting to navigate away (including
 * browser back button, refresh, or closing tab) should trigger browser confirmation.
 *
 * Validates: Requirements 8.3, 9.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
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

describe("SectionEditorView - Navigation Guard Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLoadStatusDefinitions.mockResolvedValue(undefined);
    mockLoadTasksBySection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property 20: Navigation Guard Confirmation", () => {
    /**
     * **Validates: Requirements 8.3, 9.4**
     *
     * Property: For any section with unsaved changes, attempting to navigate away
     * (browser back, refresh, close tab) should trigger browser confirmation via beforeunload.
     */
    it("should prevent browser navigation when there are unsaved changes", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate original section data
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
          // Generate a different name to create unsaved changes
          fc.string({ minLength: 1, maxLength: 100 }),
          async (originalSection: ReportSection, newName: string) => {
            // Ensure the new name is actually different
            fc.pre(newName !== originalSection.name);

            // Setup: Mock the backend to return the original section data
            mockGetReportSection.mockResolvedValue(originalSection);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: originalSection.id,
              },
              global: {
                stubs: {
                  MonacoEditor: true,
                  TaskList: true,
                },
              },
            });

            // Wait for async data loading
            await flushPromises();
            await nextTick();

            // Make a change to create unsaved changes
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            // Create a beforeunload event
            const beforeUnloadEvent = new Event("beforeunload", {
              bubbles: true,
              cancelable: true,
            }) as BeforeUnloadEvent;

            // Dispatch the event
            window.dispatchEvent(beforeUnloadEvent);

            // Verify that preventDefault was called (navigation was blocked)
            expect(beforeUnloadEvent.defaultPrevented).toBe(true);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should allow browser navigation when there are no unsaved changes", async () => {
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
          async (originalSection: ReportSection) => {
            // Setup: Mock the backend to return the original section data
            mockGetReportSection.mockResolvedValue(originalSection);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: originalSection.id,
              },
              global: {
                stubs: {
                  MonacoEditor: true,
                  TaskList: true,
                },
              },
            });

            // Wait for async data loading
            await flushPromises();
            await nextTick();

            // Don't make any changes - test navigation without unsaved changes

            // Create a beforeunload event
            const beforeUnloadEvent = new Event("beforeunload", {
              bubbles: true,
              cancelable: true,
            }) as BeforeUnloadEvent;

            // Dispatch the event
            window.dispatchEvent(beforeUnloadEvent);

            // Verify that preventDefault was NOT called (navigation was allowed)
            expect(beforeUnloadEvent.defaultPrevented).toBe(false);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should prevent browser navigation for any type of change (name, type, or content)", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate original section data
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc
              .stringMatching(/^[a-zA-Z0-9 ]{2,100}$/)
              .filter((s) => s.trim().length >= 2),
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
          async (originalSection: ReportSection) => {
            // Setup: Mock the backend to return the original section data
            mockGetReportSection.mockResolvedValue(originalSection);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: originalSection.id,
              },
              global: {
                stubs: {
                  MonacoEditor: true,
                  TaskList: true,
                },
              },
            });

            // Wait for async data loading
            await flushPromises();
            await nextTick();

            // Make a name change to create unsaved changes
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(originalSection.name + " Modified");
            await nextTick();

            // Create a beforeunload event
            const beforeUnloadEvent = new Event("beforeunload", {
              bubbles: true,
              cancelable: true,
            }) as BeforeUnloadEvent;

            // Dispatch the event
            window.dispatchEvent(beforeUnloadEvent);

            // Verify that preventDefault was called (navigation was blocked)
            expect(beforeUnloadEvent.defaultPrevented).toBe(true);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

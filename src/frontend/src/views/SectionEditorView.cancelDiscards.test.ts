/**
 * Property-Based Test: Cancel Discards Changes
 *
 * Feature: section-editor-view
 * Property 12: Cancel Discards Changes
 *
 * For any section with modifications, confirming cancel should revert all changes
 * and return to the original state.
 *
 * Validates: Requirements 6.2
 */

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

describe("SectionEditorView - Cancel Discards Changes Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLoadStatusDefinitions.mockResolvedValue(undefined);
    mockLoadTasksBySection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property 12: Cancel Discards Changes", () => {
    /**
     * **Validates: Requirements 6.2**
     *
     * Property: For any section with modifications, confirming cancel should revert
     * all changes and return to the original state.
     */
    it("should discard all changes when cancel is confirmed", async () => {
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
          // Generate modifications
          fc.record({
            newName: fc.string({ minLength: 1, maxLength: 100 }),
            newContent: fc.string({ maxLength: 5000 }),
          }),
          async (originalSection: ReportSection, modifications) => {
            // Ensure modifications are actually different
            fc.pre(
              modifications.newName !== originalSection.name ||
                modifications.newContent !== originalSection.content,
            );

            // Setup: Mock the backend to return the original section data
            mockGetReportSection.mockResolvedValue(originalSection);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: originalSection.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify original state is loaded
            expect(mockGetReportSection).toHaveBeenCalledWith(
              originalSection.id,
            );

            // Make modifications
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(modifications.newName);
            await nextTick();

            if (originalSection.type === "prose") {
              const monacoInput = wrapper.find(".mock-monaco-editor input");
              await monacoInput.setValue(modifications.newContent);
              await monacoInput.trigger("input");
              await nextTick();
            }

            // Verify changes are reflected in the UI
            expect((nameInput.element as HTMLInputElement).value).toBe(
              modifications.newName,
            );

            // Click cancel button
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            // Verify confirmation dialog is shown (because we have unsaved changes)
            const dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(true);

            // Click discard button
            const discardButton = wrapper.find(".btn-discard");
            await discardButton.trigger("click");
            await nextTick();

            // Verify navigate-back event was emitted
            expect(wrapper.emitted("navigate-back")).toBeTruthy();

            // Verify updateReportSection was NOT called (changes were discarded)
            expect(mockUpdateReportSection).not.toHaveBeenCalled();

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should navigate immediately when cancel is clicked with no changes", async () => {
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
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Click cancel button without making any changes
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            // Verify confirmation dialog is NOT shown (no unsaved changes)
            const dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(false);

            // Verify navigate-back event was emitted immediately
            expect(wrapper.emitted("navigate-back")).toBeTruthy();

            // Verify updateReportSection was NOT called
            expect(mockUpdateReportSection).not.toHaveBeenCalled();

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

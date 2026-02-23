/**
 * Property-Based Test: Confirmed Cancel Navigation
 *
 * Feature: section-editor-view
 * Property 14: Confirmed Cancel Navigation
 *
 * For any section, when cancel is confirmed (or no changes exist), the view should
 * navigate back to the previous view.
 *
 * Validates: Requirements 6.4, 8.7
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

describe("SectionEditorView - Confirmed Cancel Navigation Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLoadStatusDefinitions.mockResolvedValue(undefined);
    mockLoadTasksBySection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property 14: Confirmed Cancel Navigation", () => {
    /**
     * **Validates: Requirements 6.4, 8.7**
     *
     * Property: For any section, when cancel is confirmed (or no changes exist),
     * the view should navigate back to the previous view.
     */
    it("should navigate back when cancel is confirmed with unsaved changes", async () => {
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
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Make a change to create unsaved changes
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            // Click cancel button
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            // Verify confirmation dialog is shown
            let dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(true);

            // Click discard button to confirm cancel
            const discardButton = wrapper.find(".btn-discard");
            await discardButton.trigger("click");
            await nextTick();

            // Verify navigate-back event was emitted
            expect(wrapper.emitted("navigate-back")).toBeTruthy();
            expect(wrapper.emitted("navigate-back")).toHaveLength(1);

            // Verify dialog is closed
            dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(false);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should navigate back immediately when no changes exist", async () => {
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

            // Verify confirmation dialog is NOT shown
            const dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(false);

            // Verify navigate-back event was emitted immediately
            expect(wrapper.emitted("navigate-back")).toBeTruthy();
            expect(wrapper.emitted("navigate-back")).toHaveLength(1);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should navigate back when using back button with no changes", async () => {
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

            // Click back button without making any changes
            const backButton = wrapper.find(".btn-back");
            await backButton.trigger("click");
            await nextTick();

            // Verify confirmation dialog is NOT shown
            const dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(false);

            // Verify navigate-back event was emitted immediately
            expect(wrapper.emitted("navigate-back")).toBeTruthy();
            expect(wrapper.emitted("navigate-back")).toHaveLength(1);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

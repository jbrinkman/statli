/**
 * Property-Based Test: Discard Confirmation Action
 *
 * Feature: section-editor-view
 * Property 21: Discard Confirmation Action
 *
 * For any section with unsaved changes showing the confirmation dialog, selecting
 * "Discard" should discard all changes and navigate away.
 *
 * Validates: Requirements 8.5
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

describe("SectionEditorView - Discard Confirmation Action Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLoadStatusDefinitions.mockResolvedValue(undefined);
    mockLoadTasksBySection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property 21: Discard Confirmation Action", () => {
    /**
     * **Validates: Requirements 8.5**
     *
     * Property: For any section with unsaved changes showing the confirmation dialog,
     * selecting "Discard" should discard all changes and navigate away.
     */
    it("should discard changes and navigate when Discard button is clicked", async () => {
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
                (originalSection.type === "prose" &&
                  modifications.newContent !== originalSection.content),
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

            // Click cancel button to trigger confirmation dialog
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            // Verify confirmation dialog is shown
            let dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(true);

            // Click Discard button
            const discardButton = wrapper.find(".btn-discard");
            expect(discardButton.exists()).toBe(true);
            await discardButton.trigger("click");
            await nextTick();

            // Verify dialog is closed
            dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(false);

            // Verify navigate-back event was emitted
            expect(wrapper.emitted("navigate-back")).toBeTruthy();
            expect(wrapper.emitted("navigate-back")).toHaveLength(1);

            // Verify updateReportSection was NOT called (changes were discarded)
            expect(mockUpdateReportSection).not.toHaveBeenCalled();

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should discard changes for name modifications", async () => {
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
          // Generate a different name
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

            // Modify name
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            // Verify name was changed in UI
            expect((nameInput.element as HTMLInputElement).value).toBe(newName);

            // Click cancel and then discard
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            const discardButton = wrapper.find(".btn-discard");
            await discardButton.trigger("click");
            await nextTick();

            // Verify navigation occurred
            expect(wrapper.emitted("navigate-back")).toBeTruthy();

            // Verify changes were not saved
            expect(mockUpdateReportSection).not.toHaveBeenCalled();

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should discard changes for type modifications", async () => {
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

            // Change type to opposite value
            const newType =
              originalSection.type === "prose" ? "status" : "prose";
            const typeSelector = wrapper.find(".section-type-selector");
            await typeSelector.setValue(newType);
            await nextTick();

            // Verify type was changed in UI
            expect((typeSelector.element as HTMLSelectElement).value).toBe(
              newType,
            );

            // Click cancel and then discard
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            const discardButton = wrapper.find(".btn-discard");
            await discardButton.trigger("click");
            await nextTick();

            // Verify navigation occurred
            expect(wrapper.emitted("navigate-back")).toBeTruthy();

            // Verify changes were not saved
            expect(mockUpdateReportSection).not.toHaveBeenCalled();

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should discard changes for prose content modifications", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate original prose section data
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
          // Generate different content
          fc.string({ maxLength: 5000 }),
          async (originalSection: ReportSection, newContent: string) => {
            // Ensure the new content is actually different
            fc.pre(newContent !== originalSection.content);

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

            // Modify content
            const monacoInput = wrapper.find(".mock-monaco-editor input");
            await monacoInput.setValue(newContent);
            await monacoInput.trigger("input");
            await nextTick();

            // Verify content was changed in UI
            expect((monacoInput.element as HTMLInputElement).value).toBe(
              newContent,
            );

            // Click cancel and then discard
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            const discardButton = wrapper.find(".btn-discard");
            await discardButton.trigger("click");
            await nextTick();

            // Verify navigation occurred
            expect(wrapper.emitted("navigate-back")).toBeTruthy();

            // Verify changes were not saved
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

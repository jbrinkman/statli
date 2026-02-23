/**
 * Property-Based Test: Unsaved Changes Confirmation
 *
 * Feature: section-editor-view
 * Property 19: Unsaved Changes Confirmation
 *
 * For any section with unsaved changes, attempting to cancel (via button or Escape key)
 * should display a confirmation dialog before allowing navigation.
 *
 * Validates: Requirements 8.1, 8.2
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

describe("SectionEditorView - Unsaved Changes Confirmation Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLoadStatusDefinitions.mockResolvedValue(undefined);
    mockLoadTasksBySection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property 19: Unsaved Changes Confirmation", () => {
    /**
     * **Validates: Requirements 8.1, 8.2**
     *
     * Property: For any section with unsaved changes, attempting to cancel
     * (via button or Escape key) should display a confirmation dialog before
     * allowing navigation.
     */
    it("should show confirmation dialog when cancel button is clicked with unsaved changes", async () => {
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
            const dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(true);
            expect(dialog.text()).toContain("Unsaved Changes");
            expect(dialog.text()).toContain("Do you want to discard them");

            // Verify dialog has both action buttons
            const discardButton = wrapper.find(".btn-discard");
            const keepEditingButton = wrapper.find(".btn-keep-editing");
            expect(discardButton.exists()).toBe(true);
            expect(keepEditingButton.exists()).toBe(true);

            // Verify navigate-back was NOT emitted yet (waiting for confirmation)
            expect(wrapper.emitted("navigate-back")).toBeFalsy();

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should show confirmation dialog when Escape key is pressed with unsaved changes", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate original section data
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constant("prose"), // Use prose to test content changes
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
          // Generate different content to create unsaved changes
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

            // Make a change to create unsaved changes
            const monacoInput = wrapper.find(".mock-monaco-editor input");
            await monacoInput.setValue(newContent);
            await monacoInput.trigger("input");
            await nextTick();

            // Simulate Escape key press
            const escapeEvent = new KeyboardEvent("keydown", {
              key: "Escape",
              bubbles: true,
              cancelable: true,
            });
            window.dispatchEvent(escapeEvent);
            await nextTick();

            // Verify confirmation dialog is shown
            const dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(true);
            expect(dialog.text()).toContain("Unsaved Changes");

            // Verify navigate-back was NOT emitted yet (waiting for confirmation)
            expect(wrapper.emitted("navigate-back")).toBeFalsy();

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should NOT show confirmation dialog when cancel is clicked without changes", async () => {
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

            // Verify navigate-back was emitted immediately
            expect(wrapper.emitted("navigate-back")).toBeTruthy();

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should show confirmation dialog for any type of change (name, type, or content)", async () => {
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
          // Generate which field to change
          fc.constantFrom("name", "type"),
          async (originalSection: ReportSection, changeField: string) => {
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

            // Make a change based on the selected field
            if (changeField === "name") {
              const nameInput = wrapper.find(".section-name-input");
              await nameInput.setValue(originalSection.name + " Modified");
              await nextTick();
            } else if (changeField === "type") {
              const newType =
                originalSection.type === "prose" ? "status" : "prose";
              const typeSelector = wrapper.find(".section-type-selector");
              await typeSelector.setValue(newType);
              await nextTick();
            }

            // Click cancel button
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            // Verify confirmation dialog is shown
            const dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(true);
            expect(dialog.text()).toContain("Unsaved Changes");

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

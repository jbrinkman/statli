import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import TaskView from "./TaskView.vue";
import type { Project } from "../composables/useProjects";
import type { ReportSection } from "../composables/useReports";
import fc from "fast-check";

// Mock window.go
const mockApp = {
  ListTasksBySection: vi.fn().mockResolvedValue([]),
  ListSubtasksByTask: vi.fn().mockResolvedValue([]),
};

(global as any).window = {
  go: {
    main: {
      App: mockApp,
    },
  },
};

// Mock alert for test environment
(global as any).alert = vi.fn();

// Create a mock for updateReportSection that we can spy on
const mockUpdateReportSection = vi.fn().mockResolvedValue(undefined);
const mockLoadReportSections = vi.fn().mockResolvedValue(undefined);

// Mock the composables
vi.mock("../composables/useTasks", () => ({
  useTasks: () => ({
    tasks: { value: [] },
    subtasks: { value: [] },
    loading: { value: false },
    error: { value: null },
    createTask: vi.fn().mockResolvedValue(undefined),
    updateTask: vi.fn().mockResolvedValue(undefined),
    softDeleteTask: vi.fn().mockResolvedValue(undefined),
    createSubtask: vi.fn().mockResolvedValue(undefined),
    updateSubtask: vi.fn().mockResolvedValue(undefined),
    softDeleteSubtask: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("../composables/useReports", () => ({
  useReports: () => ({
    reportSections: { value: [] },
    statusDefinitions: { value: [] },
    loading: { value: false },
    error: { value: null },
    loadReportSections: mockLoadReportSections,
    loadStatusDefinitions: vi.fn().mockResolvedValue(undefined),
    updateReportSection: mockUpdateReportSection,
  }),
}));

describe("TaskView - Prose Editor Integration", () => {
  const mockProject: Project = {
    id: 1,
    name: "Test Project",
    filename_format: "{project-name}-{YYYY-MM-DD}.md",
    report_title_format: "{project-name} Status Report",
    default_directory: "/reports",
    use_year_subfolders: false,
    recipients_to: "test@example.com",
    recipients_cc: "",
    recipients_bcc: "",
    is_archived: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Property-Based Tests", () => {
    /**
     * **Property 2: Markdown and HTML Input Acceptance**
     * **Validates: Requirements 2.1, 2.2**
     *
     * For any valid markdown or HTML string, the section editor SHALL accept
     * the input and store it without modification or rejection.
     */
    it("accepts and stores markdown and HTML without modification", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Markdown strings with special characters
            fc.string({ minLength: 0, maxLength: 1000 }),
            // Markdown with headers
            fc.string().map((s) => `# ${s}\n## ${s}`),
            // Markdown with bold/italic
            fc.string().map((s) => `**${s}** _${s}_`),
            // HTML strings
            fc.string().map((s) => `<div>${s}</div>`),
            fc.string().map((s) => `<p>${s}</p><span>${s}</span>`),
            // Long strings
            fc.string({ minLength: 500, maxLength: 5000 }),
            // Special characters
            fc.constantFrom(
              "# Header\n\n**Bold** _italic_",
              "<div>HTML content</div>",
              "```code block```",
              "[link](url)",
              "- list\n- items",
              "| table | header |\n|-------|--------|\n| cell  | cell   |",
              "<!-- comment -->",
              "&lt;escaped&gt;",
              "emoji 🎉 unicode ñ",
              "\n\n\n",
              "   spaces   ",
              "\ttabs\t",
            ),
          ),
          async (content) => {
            mockUpdateReportSection.mockClear();
            mockLoadReportSections.mockClear();

            const mockProseSection: ReportSection = {
              id: 1,
              project_id: 1,
              name: "Test Prose Section",
              type: "prose",
              content: "",
              order: 1,
              is_enabled: true,
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            };

            const wrapper = mount(TaskView, {
              props: {
                project: mockProject,
              },
              global: {
                stubs: {
                  TaskList: true,
                  TaskForm: true,
                  SubtaskForm: true,
                  ProjectForm: true,
                  ProseEditorModal: true,
                },
              },
            });

            // Simulate opening the editor and saving content
            const vm = wrapper.vm as any;
            vm.editingProseSection = mockProseSection;
            vm.showProseEditor = true;

            await wrapper.vm.$nextTick();

            // Simulate save with the generated content
            await vm.handleProseSave(content);

            // Verify that updateReportSection was called with the exact content
            expect(mockUpdateReportSection).toHaveBeenCalledWith(
              expect.objectContaining({
                content: content,
              }),
            );

            // Verify content was not modified
            const savedContent =
              mockUpdateReportSection.mock.calls[0][0].content;
            expect(savedContent).toBe(content);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("Integration Tests", () => {
    it("opens editor with section content", async () => {
      const mockProseSection: ReportSection = {
        id: 1,
        project_id: 1,
        name: "Test Prose Section",
        type: "prose",
        content: "Initial content",
        order: 1,
        is_enabled: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const wrapper = mount(TaskView, {
        props: {
          project: mockProject,
        },
        global: {
          stubs: {
            TaskList: true,
            TaskForm: true,
            SubtaskForm: true,
            ProjectForm: true,
            ProseEditorModal: true,
          },
        },
      });

      const vm = wrapper.vm as any;
      vm.handleEditProseSection(mockProseSection);

      await wrapper.vm.$nextTick();

      // Check that it emits the navigation event (new behavior)
      expect(wrapper.emitted("navigate-to-section-editor")).toBeTruthy();
      expect(wrapper.emitted("navigate-to-section-editor")?.[0]).toEqual([
        mockProseSection.id,
      ]);

      // Also check backward compatibility (old behavior still works)
      expect(vm.editingProseSection).toEqual(mockProseSection);
      expect(vm.showProseEditor).toBe(true);
    });

    it("saves editor content and updates section list", async () => {
      const mockProseSection: ReportSection = {
        id: 1,
        project_id: 1,
        name: "Test Prose Section",
        type: "prose",
        content: "Initial content",
        order: 1,
        is_enabled: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const wrapper = mount(TaskView, {
        props: {
          project: mockProject,
        },
        global: {
          stubs: {
            TaskList: true,
            TaskForm: true,
            SubtaskForm: true,
            ProjectForm: true,
            ProseEditorModal: true,
          },
        },
      });

      const vm = wrapper.vm as any;
      vm.editingProseSection = mockProseSection;
      vm.showProseEditor = true;

      await wrapper.vm.$nextTick();

      const newContent = "Updated content";
      await vm.handleProseSave(newContent);

      expect(mockUpdateReportSection).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          content: newContent,
        }),
      );
      expect(mockLoadReportSections).toHaveBeenCalledWith(mockProject.id);
      expect(vm.showProseEditor).toBe(false);
      expect(vm.editingProseSection).toBeNull();
    });

    it("cancels editor and discards changes", async () => {
      const mockProseSection: ReportSection = {
        id: 1,
        project_id: 1,
        name: "Test Prose Section",
        type: "prose",
        content: "Initial content",
        order: 1,
        is_enabled: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const wrapper = mount(TaskView, {
        props: {
          project: mockProject,
        },
        global: {
          stubs: {
            TaskList: true,
            TaskForm: true,
            SubtaskForm: true,
            ProjectForm: true,
            ProseEditorModal: true,
          },
        },
      });

      const vm = wrapper.vm as any;
      vm.editingProseSection = mockProseSection;
      vm.showProseEditor = true;

      await wrapper.vm.$nextTick();

      vm.handleProseCancel();

      expect(vm.showProseEditor).toBe(false);
      expect(vm.editingProseSection).toBeNull();
      expect(mockUpdateReportSection).not.toHaveBeenCalled();
    });
  });
});

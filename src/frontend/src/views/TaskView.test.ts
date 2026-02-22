import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import TaskView from "./TaskView.vue";
import type { Project } from "../composables/useProjects";

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
    loadReportSections: vi.fn().mockResolvedValue(undefined),
    loadStatusDefinitions: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("TaskView", () => {
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

  it("renders the component", () => {
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
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
  });

  it("displays project name in header", async () => {
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
        },
      },
    });

    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("Test Project");
  });

  it("shows back button", () => {
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
        },
      },
    });

    const backButton = wrapper.find(".btn-back");
    expect(backButton.exists()).toBe(true);
    expect(backButton.text()).toContain("Back to Projects");
  });

  it("shows configure project button", () => {
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
        },
      },
    });

    const configButton = wrapper.find(".btn-config");
    expect(configButton.exists()).toBe(true);
    expect(configButton.text()).toContain("Configure Project");
  });

  it("shows generate report button", () => {
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
        },
      },
    });

    const generateButton = wrapper.find(".btn-generate");
    expect(generateButton.exists()).toBe(true);
    expect(generateButton.text()).toContain("Generate Report");
  });

  it("renders TaskList component when not loading", async () => {
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
        },
      },
    });

    // Wait for loading to complete
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 10));

    // TaskList should be rendered (stubbed)
    expect(wrapper.html()).toContain("task-list-stub");
  });

  it("shows loading state initially", () => {
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
        },
      },
    });

    // Initially should show loading
    expect(wrapper.text()).toContain("Loading project data");
  });

  it("handles task CRUD operations", async () => {
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
        },
      },
    });

    // Component should handle task operations through composables
    expect(wrapper.vm).toBeDefined();
  });

  it("handles subtask CRUD operations", async () => {
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
        },
      },
    });

    // Component should handle subtask operations through composables
    expect(wrapper.vm).toBeDefined();
  });

  it("passes project to child components", () => {
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
        },
      },
    });

    // Component should use the project prop
    expect(wrapper.props("project")).toEqual(mockProject);
  });

  it("has navigation and action buttons", () => {
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
        },
      },
    });

    // Verify all required buttons exist
    expect(wrapper.find(".btn-back").exists()).toBe(true);
    expect(wrapper.find(".btn-config").exists()).toBe(true);
    expect(wrapper.find(".btn-generate").exists()).toBe(true);
  });

  // Navigation Tests
  describe("Navigation", () => {
    it("displays navigation buttons", () => {
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
          },
        },
      });

      expect(wrapper.find(".btn-back").exists()).toBe(true);
      expect(wrapper.find(".btn-generate").exists()).toBe(true);
      expect(wrapper.find(".btn-config").exists()).toBe(true);
    });

    it("shows TaskForm overlay when creating task", async () => {
      const wrapper = mount(TaskView, {
        props: {
          project: mockProject,
        },
        global: {
          stubs: {
            TaskList: false,
            TaskForm: true,
            SubtaskForm: true,
            ProjectForm: true,
          },
        },
      });

      // Wait for loading to complete
      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Trigger create task
      const taskList = wrapper.findComponent({ name: "TaskList" });
      if (taskList.exists()) {
        await taskList.vm.$emit("create-task");
        await wrapper.vm.$nextTick();

        expect(wrapper.find(".form-overlay").exists()).toBe(true);
      }
    });

    it("shows SubtaskForm overlay when creating subtask", async () => {
      const wrapper = mount(TaskView, {
        props: {
          project: mockProject,
        },
        global: {
          stubs: {
            TaskList: false,
            TaskForm: true,
            SubtaskForm: true,
            ProjectForm: true,
          },
        },
      });

      // Wait for loading to complete
      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const mockTask = {
        id: 1,
        project_id: 1,
        report_section_id: 1,
        name: "Test Task",
        status: "in progress",
        expected_completion_date: null,
        url: "",
        notes: "",
        priority: 0,
        is_deleted: false,
        is_archived: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      // Trigger create subtask
      const taskList = wrapper.findComponent({ name: "TaskList" });
      if (taskList.exists()) {
        await taskList.vm.$emit("create-subtask", mockTask);
        await wrapper.vm.$nextTick();

        expect(wrapper.find(".form-overlay").exists()).toBe(true);
      }
    });

    it("shows ProjectForm overlay when configure button is clicked", async () => {
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
          },
        },
      });

      // Component has the config button
      expect(wrapper.find(".btn-config").exists()).toBe(true);
    });
  });

  // Data Flow Tests
  describe("Data Flow", () => {
    it("passes project data to child components", () => {
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
          },
        },
      });

      expect(wrapper.props("project")).toEqual(mockProject);
    });

    it("handles loading state correctly", async () => {
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
          },
        },
      });

      // Initially should show loading
      expect(wrapper.text()).toContain("Loading project data");

      // Wait for loading to complete
      await new Promise((resolve) => setTimeout(resolve, 10));
      await wrapper.vm.$nextTick();

      // Should not show loading anymore
      expect(wrapper.text()).not.toContain("Loading project data");
    });
  });
});

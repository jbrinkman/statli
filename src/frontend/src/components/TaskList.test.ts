import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import TaskList from "./TaskList.vue";
import type { Task, Subtask } from "../composables/useTasks";
import type {
  ReportSection,
  StatusDefinition,
} from "../composables/useReports";

describe("TaskList", () => {
  const mockStatusDefinitions: StatusDefinition[] = [
    {
      id: 1,
      project_id: 1,
      name: "not started",
      style: "gray",
      order: 1,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: 2,
      project_id: 1,
      name: "in progress",
      style: "yellow",
      order: 2,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: 3,
      project_id: 1,
      name: "done",
      style: "green",
      order: 3,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];

  const mockSections: ReportSection[] = [
    {
      id: 1,
      project_id: 1,
      name: "In Progress",
      type: "status",
      content: "",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: 2,
      project_id: 1,
      name: "Completed",
      type: "status",
      content: "",
      order: 2,
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: 3,
      project_id: 1,
      name: "TL;DR",
      type: "prose",
      content: "Summary content",
      order: 0,
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];

  const mockTasks: Task[] = [
    {
      id: 1,
      project_id: 1,
      report_section_id: 1,
      name: "Implement feature A",
      status: "in progress",
      expected_completion_date: "2024-02-15",
      url: "https://github.com/org/repo/issues/1",
      notes: "Working on the implementation",
      priority: 1,
      is_deleted: false,
      is_archived: false,
      created_at: "2024-01-10T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
    {
      id: 2,
      project_id: 1,
      report_section_id: 1,
      name: "Fix bug B",
      status: "not started",
      expected_completion_date: null,
      url: "",
      notes: "",
      priority: 2,
      is_deleted: false,
      is_archived: false,
      created_at: "2024-01-11T00:00:00Z",
      updated_at: "2024-01-11T00:00:00Z",
    },
    {
      id: 3,
      project_id: 1,
      report_section_id: 2,
      name: "Deploy to production",
      status: "done",
      expected_completion_date: "2024-01-20",
      url: "",
      notes: "Successfully deployed",
      priority: 1,
      is_deleted: false,
      is_archived: false,
      created_at: "2024-01-05T00:00:00Z",
      updated_at: "2024-01-20T00:00:00Z",
    },
  ];

  const mockSubtasks: Subtask[] = [
    {
      id: 1,
      task_id: 1,
      name: "Write unit tests",
      status: "done",
      expected_completion_date: "2024-02-10",
      url: "",
      notes: "All tests passing",
      is_deleted: false,
      created_at: "2024-01-10T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
    {
      id: 2,
      task_id: 1,
      name: "Code review",
      status: "in progress",
      expected_completion_date: null,
      url: "https://github.com/org/repo/pull/1",
      notes: "",
      is_deleted: false,
      created_at: "2024-01-11T00:00:00Z",
      updated_at: "2024-01-11T00:00:00Z",
    },
  ];

  it("renders tasks organized by status sections", () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).toContain("In Progress");
    expect(wrapper.text()).toContain("Completed");
    expect(wrapper.text()).toContain("Implement feature A");
    expect(wrapper.text()).toContain("Fix bug B");
    expect(wrapper.text()).toContain("Deploy to production");
  });

  it("displays loading state", () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: [],
        subtasks: [],
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: true,
        error: null,
      },
    });

    expect(wrapper.text()).toContain("Loading tasks");
  });

  it("displays error state", () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: [],
        subtasks: [],
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: "Failed to load tasks",
      },
    });

    expect(wrapper.text()).toContain("Failed to load tasks");
  });

  it("displays task details including status and ECD", () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).toContain("in progress");
    expect(wrapper.text()).toContain("ECD:");
  });

  it("displays task notes when present", () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).toContain("Working on the implementation");
    expect(wrapper.text()).toContain("Successfully deployed");
  });

  it("displays subtasks with indentation", () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).toContain("Write unit tests");
    expect(wrapper.text()).toContain("Code review");

    // Check that subtasks are in a subtasks container
    const subtasksContainer = wrapper.find(".subtasks-container");
    expect(subtasksContainer.exists()).toBe(true);
  });

  it("displays subtask details including status and ECD", () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    const subtaskItems = wrapper.findAll(".subtask-item");
    expect(subtaskItems.length).toBe(2);
    expect(wrapper.text()).toContain("All tests passing");
  });

  it("emits create-task event when create button is clicked", async () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    await wrapper.find(".btn-create").trigger("click");
    expect(wrapper.emitted("create-task")).toBeTruthy();
  });

  it("emits edit-task event when edit button is clicked", async () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    const editButtons = wrapper.findAll(".task-item .btn-action");
    await editButtons[0].trigger("click");

    expect(wrapper.emitted("edit-task")).toBeTruthy();
    expect(wrapper.emitted("edit-task")?.[0]).toEqual([mockTasks[0]]);
  });

  it("emits delete-task event when delete button is clicked", async () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    const deleteButtons = wrapper.findAll(".task-item .btn-delete");
    await deleteButtons[0].trigger("click");

    expect(wrapper.emitted("delete-task")).toBeTruthy();
    expect(wrapper.emitted("delete-task")?.[0]).toEqual([mockTasks[0].id]);
  });

  it("emits create-subtask event when add subtask button is clicked", async () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    const addSubtaskButtons = wrapper.findAll(".btn-add-subtask");
    await addSubtaskButtons[0].trigger("click");

    expect(wrapper.emitted("create-subtask")).toBeTruthy();
    expect(wrapper.emitted("create-subtask")?.[0]).toEqual([mockTasks[0]]);
  });

  it("emits edit-subtask event when subtask edit button is clicked", async () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    const subtaskEditButtons = wrapper.findAll(".subtask-item .btn-action");
    await subtaskEditButtons[0].trigger("click");

    expect(wrapper.emitted("edit-subtask")).toBeTruthy();
    expect(wrapper.emitted("edit-subtask")?.[0]).toEqual([mockSubtasks[0]]);
  });

  it("emits delete-subtask event when subtask delete button is clicked", async () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    const subtaskDeleteButtons = wrapper.findAll(".subtask-item .btn-delete");
    await subtaskDeleteButtons[0].trigger("click");

    expect(wrapper.emitted("delete-subtask")).toBeTruthy();
    expect(wrapper.emitted("delete-subtask")?.[0]).toEqual([
      mockSubtasks[0].id,
    ]);
  });

  it("emits select-task event when task is clicked", async () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    const taskItems = wrapper.findAll(".task-item");
    await taskItems[0].trigger("click");

    expect(wrapper.emitted("select-task")).toBeTruthy();
    expect(wrapper.emitted("select-task")?.[0]).toEqual([mockTasks[0]]);
  });

  it("highlights selected task", () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
        selectedTaskId: 1,
      },
    });

    const taskItems = wrapper.findAll(".task-item");
    expect(taskItems[0].classes()).toContain("selected");
    expect(taskItems[1].classes()).not.toContain("selected");
  });

  it("applies correct status styling based on status definitions", () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    const statusElements = wrapper.findAll(".task-status");
    expect(statusElements[0].classes()).toContain("status-yellow"); // in progress
    expect(statusElements[1].classes()).toContain("status-gray"); // not started
  });

  it("filters out deleted and archived tasks", () => {
    const tasksWithDeleted: Task[] = [
      ...mockTasks,
      {
        id: 4,
        project_id: 1,
        report_section_id: 1,
        name: "Deleted task",
        status: "done",
        expected_completion_date: null,
        url: "",
        notes: "",
        priority: 3,
        is_deleted: true,
        is_archived: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 5,
        project_id: 1,
        report_section_id: 1,
        name: "Archived task",
        status: "done",
        expected_completion_date: null,
        url: "",
        notes: "",
        priority: 4,
        is_deleted: false,
        is_archived: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];

    const wrapper = mount(TaskList, {
      props: {
        tasks: tasksWithDeleted,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).not.toContain("Deleted task");
    expect(wrapper.text()).not.toContain("Archived task");
  });

  it("filters out deleted subtasks", () => {
    const subtasksWithDeleted: Subtask[] = [
      ...mockSubtasks,
      {
        id: 3,
        task_id: 1,
        name: "Deleted subtask",
        status: "done",
        expected_completion_date: null,
        url: "",
        notes: "",
        is_deleted: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];

    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: subtasksWithDeleted,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).not.toContain("Deleted subtask");
  });

  it("displays empty state when section has no tasks", () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: [],
        subtasks: [],
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).toContain("No tasks in this section");
  });

  it("displays empty state when no status sections configured", () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: [mockSections[2]], // Only prose section
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).toContain("No status sections configured");
  });

  it("only displays status-type sections, not prose sections", () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).toContain("In Progress");
    expect(wrapper.text()).toContain("Completed");
    expect(wrapper.text()).not.toContain("TL;DR");
  });

  it("orders sections by order field", () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    const sectionTitles = wrapper.findAll(".section-title");
    expect(sectionTitles[0].text()).toBe("In Progress");
    expect(sectionTitles[1].text()).toBe("Completed");
  });

  it("renders task URLs as clickable links", () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    const taskLinks = wrapper.findAll(".task-link");
    expect(taskLinks.length).toBeGreaterThan(0);
    expect(taskLinks[0].attributes("href")).toBe(
      "https://github.com/org/repo/issues/1",
    );
  });

  it("renders subtask URLs as clickable links", () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    const subtaskLinks = wrapper.findAll(".subtask-link");
    expect(subtaskLinks.length).toBeGreaterThan(0);
    expect(subtaskLinks[0].attributes("href")).toBe(
      "https://github.com/org/repo/pull/1",
    );
  });

  it("formats dates correctly", () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: mockTasks,
        subtasks: mockSubtasks,
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        loading: false,
        error: null,
      },
    });

    // Check that dates are formatted (exact format depends on locale)
    const ecdElements = wrapper.findAll(".task-ecd");
    expect(ecdElements[0].text()).toMatch(/ECD: \d+\/\d+\/\d+/);
  });
});

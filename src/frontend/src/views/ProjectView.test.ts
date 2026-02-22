import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import ProjectView from "./ProjectView.vue";
import ProjectList from "../components/ProjectList.vue";
import ProjectForm from "../components/ProjectForm.vue";
import { useProjects } from "../composables/useProjects";

// Mock the useProjects composable
vi.mock("../composables/useProjects", () => ({
  useProjects: vi.fn(),
}));

describe("ProjectView", () => {
  let mockUseProjects: any;

  beforeEach(() => {
    // Reset mock before each test
    // Create actual refs to match the composable behavior
    const activeProjects = { value: [] };
    const archivedProjects = { value: [] };
    const loading = { value: false };
    const error = { value: null };

    mockUseProjects = {
      activeProjects,
      archivedProjects,
      loading,
      error,
      createProject: vi.fn(),
      updateProject: vi.fn(),
      loadActiveProjects: vi.fn().mockResolvedValue(undefined),
      loadArchivedProjects: vi.fn().mockResolvedValue(undefined),
    };

    (useProjects as any).mockReturnValue(mockUseProjects);
  });

  it("renders ProjectList by default", () => {
    const wrapper = mount(ProjectView);

    expect(wrapper.findComponent(ProjectList).exists()).toBe(true);
    expect(wrapper.findComponent(ProjectForm).exists()).toBe(false);
  });

  it("loads active and archived projects on mount", async () => {
    mount(ProjectView);

    // Wait for onMounted to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockUseProjects.loadActiveProjects).toHaveBeenCalled();
    expect(mockUseProjects.loadArchivedProjects).toHaveBeenCalled();
  });

  it("shows ProjectForm when create button is clicked", async () => {
    const wrapper = mount(ProjectView);

    // Find and click create button through ProjectList
    const projectList = wrapper.findComponent(ProjectList);
    await projectList.vm.$emit("create");

    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent(ProjectForm).exists()).toBe(true);
    expect(wrapper.findComponent(ProjectList).exists()).toBe(false);
  });

  it("hides ProjectForm when cancel is clicked", async () => {
    const wrapper = mount(ProjectView);

    // Show form first
    const projectList = wrapper.findComponent(ProjectList);
    await projectList.vm.$emit("create");
    await wrapper.vm.$nextTick();

    // Cancel form
    const projectForm = wrapper.findComponent(ProjectForm);
    await projectForm.vm.$emit("cancel");
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent(ProjectList).exists()).toBe(true);
    expect(wrapper.findComponent(ProjectForm).exists()).toBe(false);
  });

  it("creates a new project when form is submitted", async () => {
    mockUseProjects.createProject.mockResolvedValue(undefined);

    const wrapper = mount(ProjectView);

    // Show form
    const projectList = wrapper.findComponent(ProjectList);
    await projectList.vm.$emit("create");
    await wrapper.vm.$nextTick();

    // Submit form with new project data
    const projectForm = wrapper.findComponent(ProjectForm);
    const newProjectData = {
      name: "Test Project",
      filename_format: "{project-name}-{YYYY-MM-DD}.md",
      report_title_format: "{project-name} Report",
      default_directory: "/test",
      use_year_subfolders: false,
      recipients_to: "",
      recipients_cc: "",
      recipients_bcc: "",
      is_archived: false,
    };

    await projectForm.vm.$emit("submit", newProjectData);
    await wrapper.vm.$nextTick();

    expect(mockUseProjects.createProject).toHaveBeenCalledWith(newProjectData);
    // Form should be hidden after successful creation
    expect(wrapper.findComponent(ProjectList).exists()).toBe(true);
    expect(wrapper.findComponent(ProjectForm).exists()).toBe(false);
  });

  it("updates an existing project when form is submitted with id", async () => {
    mockUseProjects.updateProject.mockResolvedValue(undefined);

    const wrapper = mount(ProjectView);

    // Show form
    const projectList = wrapper.findComponent(ProjectList);
    await projectList.vm.$emit("create");
    await wrapper.vm.$nextTick();

    // Submit form with existing project data (has id)
    const projectForm = wrapper.findComponent(ProjectForm);
    const existingProjectData = {
      id: 1,
      name: "Updated Project",
      filename_format: "{project-name}-{YYYY-MM-DD}.md",
      report_title_format: "{project-name} Report",
      default_directory: "/test",
      use_year_subfolders: false,
      recipients_to: "",
      recipients_cc: "",
      recipients_bcc: "",
      is_archived: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    await projectForm.vm.$emit("submit", existingProjectData);
    await wrapper.vm.$nextTick();

    expect(mockUseProjects.updateProject).toHaveBeenCalledWith(
      existingProjectData,
    );
    // Form should be hidden after successful update
    expect(wrapper.findComponent(ProjectList).exists()).toBe(true);
    expect(wrapper.findComponent(ProjectForm).exists()).toBe(false);
  });

  it("emits navigateToTasks when a project is selected", async () => {
    const wrapper = mount(ProjectView);

    const selectedProject = {
      id: 1,
      name: "Test Project",
      filename_format: "{project-name}-{YYYY-MM-DD}.md",
      report_title_format: "{project-name} Report",
      default_directory: "/test",
      use_year_subfolders: false,
      recipients_to: "",
      recipients_cc: "",
      recipients_bcc: "",
      is_archived: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const projectList = wrapper.findComponent(ProjectList);
    await projectList.vm.$emit("select", selectedProject);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("navigateToTasks")).toBeTruthy();
    expect(wrapper.emitted("navigateToTasks")?.[0]).toEqual([selectedProject]);
  });

  it("passes loading state to ProjectList", () => {
    mockUseProjects.loading.value = true;

    const wrapper = mount(ProjectView);
    const projectList = wrapper.findComponent(ProjectList);

    // The component passes the ref object, check its value
    expect(projectList.props("loading")).toEqual({ value: true });
  });

  it("passes error state to ProjectList", () => {
    mockUseProjects.error.value = "Test error";

    const wrapper = mount(ProjectView);
    const projectList = wrapper.findComponent(ProjectList);

    // The component passes the ref object, check its value
    expect(projectList.props("error")).toEqual({ value: "Test error" });
  });

  it("passes active and archived projects to ProjectList", () => {
    const activeProjects = [
      {
        id: 1,
        name: "Active Project",
        filename_format: "{project-name}-{YYYY-MM-DD}.md",
        report_title_format: "{project-name} Report",
        default_directory: "/test",
        use_year_subfolders: false,
        recipients_to: "",
        recipients_cc: "",
        recipients_bcc: "",
        is_archived: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];

    const archivedProjects = [
      {
        id: 2,
        name: "Archived Project",
        filename_format: "{project-name}-{YYYY-MM-DD}.md",
        report_title_format: "{project-name} Report",
        default_directory: "/test",
        use_year_subfolders: false,
        recipients_to: "",
        recipients_cc: "",
        recipients_bcc: "",
        is_archived: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];

    mockUseProjects.activeProjects.value = activeProjects;
    mockUseProjects.archivedProjects.value = archivedProjects;

    const wrapper = mount(ProjectView);
    const projectList = wrapper.findComponent(ProjectList);

    // The component passes the ref objects, check their values
    expect(projectList.props("activeProjects")).toEqual({
      value: activeProjects,
    });
    expect(projectList.props("archivedProjects")).toEqual({
      value: archivedProjects,
    });
  });

  it("handles project creation error gracefully", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockUseProjects.createProject.mockRejectedValue(
      new Error("Creation failed"),
    );

    const wrapper = mount(ProjectView);

    // Show form
    const projectList = wrapper.findComponent(ProjectList);
    await projectList.vm.$emit("create");
    await wrapper.vm.$nextTick();

    // Submit form
    const projectForm = wrapper.findComponent(ProjectForm);
    const newProjectData = {
      name: "Test Project",
      filename_format: "{project-name}-{YYYY-MM-DD}.md",
      report_title_format: "{project-name} Report",
      default_directory: "/test",
      use_year_subfolders: false,
      recipients_to: "",
      recipients_cc: "",
      recipients_bcc: "",
      is_archived: false,
    };

    await projectForm.vm.$emit("submit", newProjectData);
    await wrapper.vm.$nextTick();

    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  // Navigation Tests
  describe("Navigation", () => {
    it("navigates to TaskView when project is selected", async () => {
      const wrapper = mount(ProjectView);

      const testProject = {
        id: 1,
        name: "Test Project",
        filename_format: "{project-name}-{YYYY-MM-DD}.md",
        report_title_format: "{project-name} Report",
        default_directory: "/test",
        use_year_subfolders: false,
        recipients_to: "",
        recipients_cc: "",
        recipients_bcc: "",
        is_archived: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const projectList = wrapper.findComponent(ProjectList);
      await projectList.vm.$emit("select", testProject);

      expect(wrapper.emitted("navigateToTasks")).toBeTruthy();
      expect(wrapper.emitted("navigateToTasks")?.[0]).toEqual([testProject]);
    });

    it("maintains selected project ID when navigating", async () => {
      const wrapper = mount(ProjectView);

      const testProject = {
        id: 42,
        name: "Test Project",
        filename_format: "{project-name}-{YYYY-MM-DD}.md",
        report_title_format: "{project-name} Report",
        default_directory: "/test",
        use_year_subfolders: false,
        recipients_to: "",
        recipients_cc: "",
        recipients_bcc: "",
        is_archived: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const projectList = wrapper.findComponent(ProjectList);
      await projectList.vm.$emit("select", testProject);
      await wrapper.vm.$nextTick();

      // Check that selectedProjectId is set
      expect(projectList.props("selectedProjectId")).toBe(42);
    });

    it("toggles between list and form views", async () => {
      const wrapper = mount(ProjectView);

      // Initially shows list
      expect(wrapper.findComponent(ProjectList).exists()).toBe(true);
      expect(wrapper.findComponent(ProjectForm).exists()).toBe(false);

      // Show form
      const projectList = wrapper.findComponent(ProjectList);
      await projectList.vm.$emit("create");
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent(ProjectList).exists()).toBe(false);
      expect(wrapper.findComponent(ProjectForm).exists()).toBe(true);

      // Hide form
      const projectForm = wrapper.findComponent(ProjectForm);
      await projectForm.vm.$emit("cancel");
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent(ProjectList).exists()).toBe(true);
      expect(wrapper.findComponent(ProjectForm).exists()).toBe(false);
    });
  });

  // Data Flow Tests
  describe("Data Flow", () => {
    it("flows project data from composable to ProjectList", () => {
      const testProjects = [
        {
          id: 1,
          name: "Project 1",
          filename_format: "{project-name}-{YYYY-MM-DD}.md",
          report_title_format: "{project-name} Report",
          default_directory: "/test",
          use_year_subfolders: false,
          recipients_to: "",
          recipients_cc: "",
          recipients_bcc: "",
          is_archived: false,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockUseProjects.activeProjects.value = testProjects;

      const wrapper = mount(ProjectView);
      const projectList = wrapper.findComponent(ProjectList);

      expect(projectList.props("activeProjects")).toEqual({
        value: testProjects,
      });
    });

    it("flows form data from ProjectForm to composable on create", async () => {
      mockUseProjects.createProject.mockResolvedValue(undefined);

      const wrapper = mount(ProjectView);

      // Show form
      const projectList = wrapper.findComponent(ProjectList);
      await projectList.vm.$emit("create");
      await wrapper.vm.$nextTick();

      // Submit form
      const projectForm = wrapper.findComponent(ProjectForm);
      const newProjectData = {
        name: "New Project",
        filename_format: "{project-name}-{YYYY-MM-DD}.md",
        report_title_format: "{project-name} Report",
        default_directory: "/test",
        use_year_subfolders: true,
        recipients_to: "test@example.com",
        recipients_cc: "cc@example.com",
        recipients_bcc: "",
        is_archived: false,
      };

      await projectForm.vm.$emit("submit", newProjectData);
      await wrapper.vm.$nextTick();

      expect(mockUseProjects.createProject).toHaveBeenCalledWith(
        newProjectData,
      );
    });

    it("flows form data from ProjectForm to composable on update", async () => {
      mockUseProjects.updateProject.mockResolvedValue(undefined);

      const wrapper = mount(ProjectView);

      // Show form
      const projectList = wrapper.findComponent(ProjectList);
      await projectList.vm.$emit("create");
      await wrapper.vm.$nextTick();

      // Submit form with existing project
      const projectForm = wrapper.findComponent(ProjectForm);
      const updatedProjectData = {
        id: 1,
        name: "Updated Project",
        filename_format: "{project-name}-{YYYY-MM-DD}.md",
        report_title_format: "{project-name} Report",
        default_directory: "/updated",
        use_year_subfolders: true,
        recipients_to: "updated@example.com",
        recipients_cc: "",
        recipients_bcc: "",
        is_archived: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      await projectForm.vm.$emit("submit", updatedProjectData);
      await wrapper.vm.$nextTick();

      expect(mockUseProjects.updateProject).toHaveBeenCalledWith(
        updatedProjectData,
      );
    });

    it("flows loading state from composable to ProjectList", () => {
      mockUseProjects.loading.value = true;

      const wrapper = mount(ProjectView);
      const projectList = wrapper.findComponent(ProjectList);

      expect(projectList.props("loading")).toEqual({ value: true });
    });

    it("flows error state from composable to ProjectList", () => {
      mockUseProjects.error.value = "Test error message";

      const wrapper = mount(ProjectView);
      const projectList = wrapper.findComponent(ProjectList);

      expect(projectList.props("error")).toEqual({
        value: "Test error message",
      });
    });

    it("clears form state after successful submission", async () => {
      mockUseProjects.createProject.mockResolvedValue(undefined);

      const wrapper = mount(ProjectView);

      // Show form
      const projectList = wrapper.findComponent(ProjectList);
      await projectList.vm.$emit("create");
      await wrapper.vm.$nextTick();

      // Submit form
      const projectForm = wrapper.findComponent(ProjectForm);
      const newProjectData = {
        name: "Test Project",
        filename_format: "{project-name}-{YYYY-MM-DD}.md",
        report_title_format: "{project-name} Report",
        default_directory: "/test",
        use_year_subfolders: false,
        recipients_to: "",
        recipients_cc: "",
        recipients_bcc: "",
        is_archived: false,
      };

      await projectForm.vm.$emit("submit", newProjectData);
      await wrapper.vm.$nextTick();

      // Form should be hidden and state cleared
      expect(wrapper.findComponent(ProjectForm).exists()).toBe(false);
      expect(wrapper.findComponent(ProjectList).exists()).toBe(true);
    });

    it("preserves project list data during form interactions", async () => {
      const testProjects = [
        {
          id: 1,
          name: "Project 1",
          filename_format: "{project-name}-{YYYY-MM-DD}.md",
          report_title_format: "{project-name} Report",
          default_directory: "/test",
          use_year_subfolders: false,
          recipients_to: "",
          recipients_cc: "",
          recipients_bcc: "",
          is_archived: false,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockUseProjects.activeProjects.value = testProjects;

      const wrapper = mount(ProjectView);

      // Show form
      const projectList = wrapper.findComponent(ProjectList);
      await projectList.vm.$emit("create");
      await wrapper.vm.$nextTick();

      // Cancel form
      const projectForm = wrapper.findComponent(ProjectForm);
      await projectForm.vm.$emit("cancel");
      await wrapper.vm.$nextTick();

      // Project data should still be available
      const projectListAfter = wrapper.findComponent(ProjectList);
      expect(projectListAfter.props("activeProjects")).toEqual({
        value: testProjects,
      });
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ProjectList from "./ProjectList.vue";
import type { Project } from "../composables/useProjects";

describe("ProjectList", () => {
  const mockActiveProjects: Project[] = [
    {
      id: 1,
      name: "Project Alpha",
      filename_format: "{project-name}-{YYYY-MM-DD}.md",
      report_title_format: "{project-name} Status Report",
      default_directory: "/reports",
      use_year_subfolders: false,
      recipients_to: "team@example.com",
      recipients_cc: "",
      recipients_bcc: "",
      is_archived: false,
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z",
    },
    {
      id: 2,
      name: "Project Beta",
      filename_format: "{project-name}-{YYYY-MM-DD}.md",
      report_title_format: "{project-name} Status Report",
      default_directory: "/reports",
      use_year_subfolders: true,
      recipients_to: "team@example.com",
      recipients_cc: "",
      recipients_bcc: "",
      is_archived: false,
      created_at: "2024-02-20T14:30:00Z",
      updated_at: "2024-02-20T14:30:00Z",
    },
  ];

  const mockArchivedProjects: Project[] = [
    {
      id: 3,
      name: "Project Gamma",
      filename_format: "{project-name}-{YYYY-MM-DD}.md",
      report_title_format: "{project-name} Status Report",
      default_directory: "/reports",
      use_year_subfolders: false,
      recipients_to: "team@example.com",
      recipients_cc: "",
      recipients_bcc: "",
      is_archived: true,
      created_at: "2023-12-01T09:00:00Z",
      updated_at: "2024-01-10T16:00:00Z",
    },
  ];

  it("renders active projects", () => {
    const wrapper = mount(ProjectList, {
      props: {
        activeProjects: mockActiveProjects,
        archivedProjects: [],
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).toContain("Project Alpha");
    expect(wrapper.text()).toContain("Project Beta");
  });

  it("displays loading state", () => {
    const wrapper = mount(ProjectList, {
      props: {
        activeProjects: [],
        archivedProjects: [],
        loading: true,
        error: null,
      },
    });

    expect(wrapper.text()).toContain("Loading projects");
  });

  it("displays error state", () => {
    const wrapper = mount(ProjectList, {
      props: {
        activeProjects: [],
        archivedProjects: [],
        loading: false,
        error: "Failed to load projects",
      },
    });

    // Error is now shown via notification system, not inline
    // Component should still render normally
    expect(wrapper.find(".projects-section").exists()).toBe(true);
  });

  it("displays empty state when no active projects", () => {
    const wrapper = mount(ProjectList, {
      props: {
        activeProjects: [],
        archivedProjects: [],
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).toContain("No active projects");
  });

  it("emits create event when create button is clicked", async () => {
    const wrapper = mount(ProjectList, {
      props: {
        activeProjects: mockActiveProjects,
        archivedProjects: [],
        loading: false,
        error: null,
      },
    });

    await wrapper.find(".btn-create").trigger("click");
    expect(wrapper.emitted("create")).toBeTruthy();
  });

  it("emits select event when project is clicked", async () => {
    const wrapper = mount(ProjectList, {
      props: {
        activeProjects: mockActiveProjects,
        archivedProjects: [],
        loading: false,
        error: null,
      },
    });

    const projectItems = wrapper.findAll(".project-item");
    await projectItems[0].trigger("click");

    expect(wrapper.emitted("select")).toBeTruthy();
    expect(wrapper.emitted("select")?.[0]).toEqual([mockActiveProjects[0]]);
  });

  it("highlights selected project", () => {
    const wrapper = mount(ProjectList, {
      props: {
        activeProjects: mockActiveProjects,
        archivedProjects: [],
        loading: false,
        error: null,
        selectedProjectId: 1,
      },
    });

    const projectItems = wrapper.findAll(".project-item");
    expect(projectItems[0].classes()).toContain("selected");
    expect(projectItems[1].classes()).not.toContain("selected");
  });

  it("toggles archived projects visibility", async () => {
    const wrapper = mount(ProjectList, {
      props: {
        activeProjects: mockActiveProjects,
        archivedProjects: mockArchivedProjects,
        loading: false,
        error: null,
      },
    });

    // Initially archived projects should not be visible
    expect(wrapper.text()).not.toContain("Project Gamma");
    expect(wrapper.text()).toContain("Show Archived Projects");

    // Click toggle button
    await wrapper.find(".btn-toggle-archived").trigger("click");

    // Now archived projects should be visible
    expect(wrapper.text()).toContain("Project Gamma");
    expect(wrapper.text()).toContain("Hide Archived Projects");
  });

  it("displays archived projects with archived styling", async () => {
    const wrapper = mount(ProjectList, {
      props: {
        activeProjects: [],
        archivedProjects: mockArchivedProjects,
        loading: false,
        error: null,
      },
    });

    // Show archived projects
    await wrapper.find(".btn-toggle-archived").trigger("click");

    const archivedItems = wrapper.findAll(".project-item.archived");
    expect(archivedItems.length).toBe(1);
  });

  it("formats dates correctly", () => {
    const wrapper = mount(ProjectList, {
      props: {
        activeProjects: mockActiveProjects,
        archivedProjects: [],
        loading: false,
        error: null,
      },
    });

    // Check that dates are formatted (exact format depends on locale)
    const projectMeta = wrapper.findAll(".project-meta");
    expect(projectMeta[0].text()).toMatch(/Created: \d+\/\d+\/\d+/);
  });

  it("handles empty archived projects list", async () => {
    const wrapper = mount(ProjectList, {
      props: {
        activeProjects: mockActiveProjects,
        archivedProjects: [],
        loading: false,
        error: null,
      },
    });

    // Show archived section
    await wrapper.find(".btn-toggle-archived").trigger("click");

    expect(wrapper.text()).toContain("No archived projects");
  });
});

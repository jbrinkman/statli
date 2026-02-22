import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import StatusDefinitionList from "./StatusDefinitionList.vue";
import type { StatusDefinition } from "../composables/useReports";

describe("StatusDefinitionList", () => {
  const mockStatuses: StatusDefinition[] = [
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

  it("renders status definitions with styles", () => {
    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: mockStatuses,
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).toContain("not started");
    expect(wrapper.text()).toContain("in progress");
    expect(wrapper.text()).toContain("done");
  });

  it("displays loading state", () => {
    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: [],
        loading: true,
        error: null,
      },
    });

    expect(wrapper.text()).toContain("Loading status definitions");
  });

  it("displays error state", () => {
    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: [],
        loading: false,
        error: "Failed to load status definitions",
      },
    });

    expect(wrapper.text()).toContain("Failed to load status definitions");
  });

  it("displays style preview with color badges", () => {
    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: mockStatuses,
        loading: false,
        error: null,
      },
    });

    const badges = wrapper.findAll(".status-badge");
    expect(badges.length).toBe(3);
    expect(badges[0].text()).toBe("gray");
    expect(badges[1].text()).toBe("yellow");
    expect(badges[2].text()).toBe("green");
  });

  it("applies correct CSS classes for each style", () => {
    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: mockStatuses,
        loading: false,
        error: null,
      },
    });

    const badges = wrapper.findAll(".status-badge");
    expect(badges[0].classes()).toContain("status-gray");
    expect(badges[1].classes()).toContain("status-yellow");
    expect(badges[2].classes()).toContain("status-green");
  });

  it("displays all status style types correctly", () => {
    const allStyleStatuses: StatusDefinition[] = [
      {
        id: 1,
        project_id: 1,
        name: "blocked",
        style: "red",
        order: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 2,
        project_id: 1,
        name: "completed",
        style: "green",
        order: 2,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 3,
        project_id: 1,
        name: "in progress",
        style: "yellow",
        order: 3,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 4,
        project_id: 1,
        name: "not started",
        style: "gray",
        order: 4,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 5,
        project_id: 1,
        name: "on hold",
        style: "paused",
        order: 5,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 6,
        project_id: 1,
        name: "waiting",
        style: "pending",
        order: 6,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];

    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: allStyleStatuses,
        loading: false,
        error: null,
      },
    });

    const badges = wrapper.findAll(".status-badge");
    expect(badges[0].classes()).toContain("status-red");
    expect(badges[1].classes()).toContain("status-green");
    expect(badges[2].classes()).toContain("status-yellow");
    expect(badges[3].classes()).toContain("status-gray");
    expect(badges[4].classes()).toContain("status-paused");
    expect(badges[5].classes()).toContain("status-pending");
  });

  it("emits create-status event when create button is clicked", async () => {
    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: mockStatuses,
        loading: false,
        error: null,
      },
    });

    await wrapper.find(".btn-create").trigger("click");
    expect(wrapper.emitted("create-status")).toBeTruthy();
  });

  it("emits edit-status event when edit button is clicked", async () => {
    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: mockStatuses,
        loading: false,
        error: null,
      },
    });

    const editButtons = wrapper.findAll(".btn-action");
    await editButtons[0].trigger("click");

    expect(wrapper.emitted("edit-status")).toBeTruthy();
    expect(wrapper.emitted("edit-status")?.[0]).toEqual([mockStatuses[0]]);
  });

  it("emits delete-status event when delete button is clicked", async () => {
    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: mockStatuses,
        loading: false,
        error: null,
      },
    });

    const deleteButtons = wrapper.findAll(".btn-delete");
    await deleteButtons[0].trigger("click");

    expect(wrapper.emitted("delete-status")).toBeTruthy();
    expect(wrapper.emitted("delete-status")?.[0]).toEqual([mockStatuses[0].id]);
  });

  it("displays statuses in order by order field", () => {
    const unorderedStatuses: StatusDefinition[] = [
      { ...mockStatuses[2], order: 1 },
      { ...mockStatuses[0], order: 3 },
      { ...mockStatuses[1], order: 2 },
    ];

    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: unorderedStatuses,
        loading: false,
        error: null,
      },
    });

    const statusNames = wrapper.findAll(".status-name");
    expect(statusNames[0].text()).toBe("done");
    expect(statusNames[1].text()).toBe("in progress");
    expect(statusNames[2].text()).toBe("not started");
  });

  it("displays empty state when no statuses", () => {
    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: [],
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).toContain("No status definitions configured");
  });

  it("displays both edit and delete buttons for each status", () => {
    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: mockStatuses,
        loading: false,
        error: null,
      },
    });

    const statusItems = wrapper.findAll(".status-item");
    statusItems.forEach((item) => {
      const actionButtons = item.findAll(".btn-action");
      expect(actionButtons.length).toBe(2); // Edit and delete
    });
  });

  it("displays status name and style badge together", () => {
    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: [mockStatuses[0]],
        loading: false,
        error: null,
      },
    });

    const statusInfo = wrapper.find(".status-info");
    expect(statusInfo.text()).toContain("not started");
    expect(statusInfo.text()).toContain("gray");
  });

  it("handles empty statuses array gracefully", () => {
    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: [],
        loading: false,
        error: null,
      },
    });

    expect(wrapper.find(".empty-state").exists()).toBe(true);
    expect(wrapper.findAll(".status-item").length).toBe(0);
  });

  it("does not display loading or error when data is present", () => {
    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: mockStatuses,
        loading: false,
        error: null,
      },
    });

    expect(wrapper.find(".loading").exists()).toBe(false);
    expect(wrapper.find(".error").exists()).toBe(false);
  });

  it("hides status list when loading", () => {
    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: mockStatuses,
        loading: true,
        error: null,
      },
    });

    expect(wrapper.find(".status-container").exists()).toBe(false);
    expect(wrapper.find(".loading").exists()).toBe(true);
  });

  it("hides status list when error is present", () => {
    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: mockStatuses,
        loading: false,
        error: "Error message",
      },
    });

    expect(wrapper.find(".status-container").exists()).toBe(false);
    expect(wrapper.find(".error").exists()).toBe(true);
  });

  it("renders correct number of status items", () => {
    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: mockStatuses,
        loading: false,
        error: null,
      },
    });

    const statusItems = wrapper.findAll(".status-item");
    expect(statusItems.length).toBe(mockStatuses.length);
  });

  it("displays header with title and create button", () => {
    const wrapper = mount(StatusDefinitionList, {
      props: {
        statuses: mockStatuses,
        loading: false,
        error: null,
      },
    });

    expect(wrapper.find(".title").text()).toBe("Status Definitions");
    expect(wrapper.find(".btn-create").text()).toBe("Create Status");
  });
});

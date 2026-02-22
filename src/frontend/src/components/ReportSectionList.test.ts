import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ReportSectionList from "./ReportSectionList.vue";
import type { ReportSection } from "../composables/useReports";

describe("ReportSectionList", () => {
  const mockSections: ReportSection[] = [
    {
      id: 1,
      project_id: 1,
      name: "TL;DR",
      type: "prose",
      content: "This is a summary of the week's activities.",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: 2,
      project_id: 1,
      name: "In Progress",
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
      name: "Completed",
      type: "status",
      content: "",
      order: 3,
      is_enabled: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];

  it("renders report sections with order", () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: mockSections,
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).toContain("TL;DR");
    expect(wrapper.text()).toContain("In Progress");
    expect(wrapper.text()).toContain("Completed");
  });

  it("displays loading state", () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: [],
        loading: true,
        error: null,
      },
    });

    expect(wrapper.text()).toContain("Loading sections");
  });

  it("displays error state", () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: [],
        loading: false,
        error: "Failed to load sections",
      },
    });

    expect(wrapper.text()).toContain("Failed to load sections");
  });

  it("displays section type badges", () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: mockSections,
        loading: false,
        error: null,
      },
    });

    const typeBadges = wrapper.findAll(".section-type");
    expect(typeBadges.length).toBe(3);
    expect(typeBadges[0].text()).toBe("prose");
    expect(typeBadges[1].text()).toBe("status");
  });

  it("displays enable/disable toggles", () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: mockSections,
        loading: false,
        error: null,
      },
    });

    const toggles = wrapper.findAll(".toggle-checkbox");
    expect(toggles.length).toBe(3);
    expect((toggles[0].element as HTMLInputElement).checked).toBe(true);
    expect((toggles[2].element as HTMLInputElement).checked).toBe(false);
  });

  it("shows enabled/disabled labels correctly", () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: mockSections,
        loading: false,
        error: null,
      },
    });

    const labels = wrapper.findAll(".toggle-label");
    expect(labels[0].text()).toBe("Enabled");
    expect(labels[2].text()).toBe("Disabled");
  });

  it("applies disabled styling to disabled sections", () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: mockSections,
        loading: false,
        error: null,
      },
    });

    const sectionItems = wrapper.findAll(".section-item");
    expect(sectionItems[0].classes()).not.toContain("disabled");
    expect(sectionItems[2].classes()).toContain("disabled");
  });

  it("displays prose section content preview", () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: mockSections,
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).toContain(
      "This is a summary of the week's activities.",
    );
  });

  it("truncates long prose content", () => {
    const longContentSection: ReportSection = {
      id: 4,
      project_id: 1,
      name: "Long Section",
      type: "prose",
      content: "A".repeat(150),
      order: 4,
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const wrapper = mount(ReportSectionList, {
      props: {
        sections: [longContentSection],
        loading: false,
        error: null,
      },
    });

    const preview = wrapper.find(".section-preview");
    expect(preview.text()).toContain("...");
    expect(preview.text().length).toBeLessThan(150);
  });

  it("does not display preview for status sections", () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: [mockSections[1]], // Status section
        loading: false,
        error: null,
      },
    });

    const preview = wrapper.find(".section-preview");
    expect(preview.exists()).toBe(false);
  });

  it("emits create-section event when create button is clicked", async () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: mockSections,
        loading: false,
        error: null,
      },
    });

    await wrapper.find(".btn-create").trigger("click");
    expect(wrapper.emitted("create-section")).toBeTruthy();
  });

  it("emits edit-section event when edit button is clicked", async () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: mockSections,
        loading: false,
        error: null,
      },
    });

    const editButtons = wrapper.findAll(".btn-action");
    await editButtons[0].trigger("click");

    expect(wrapper.emitted("edit-section")).toBeTruthy();
    expect(wrapper.emitted("edit-section")?.[0]).toEqual([mockSections[0]]);
  });

  it("emits delete-section event when delete button is clicked", async () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: mockSections,
        loading: false,
        error: null,
      },
    });

    const deleteButtons = wrapper.findAll(".btn-delete");
    await deleteButtons[0].trigger("click");

    expect(wrapper.emitted("delete-section")).toBeTruthy();
    expect(wrapper.emitted("delete-section")?.[0]).toEqual([
      mockSections[0].id,
    ]);
  });

  it("emits toggle-section event when toggle is changed", async () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: mockSections,
        loading: false,
        error: null,
      },
    });

    const toggles = wrapper.findAll(".toggle-checkbox");
    await toggles[0].trigger("change");

    expect(wrapper.emitted("toggle-section")).toBeTruthy();
    expect(wrapper.emitted("toggle-section")?.[0]).toEqual([mockSections[0]]);
  });

  it("displays sections in order by order field", () => {
    const unorderedSections: ReportSection[] = [
      { ...mockSections[2], order: 1 },
      { ...mockSections[0], order: 3 },
      { ...mockSections[1], order: 2 },
    ];

    const wrapper = mount(ReportSectionList, {
      props: {
        sections: unorderedSections,
        loading: false,
        error: null,
      },
    });

    const sectionNames = wrapper.findAll(".section-name");
    expect(sectionNames[0].text()).toBe("Completed");
    expect(sectionNames[1].text()).toBe("In Progress");
    expect(sectionNames[2].text()).toBe("TL;DR");
  });

  it("displays drag handles for reordering", () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: mockSections,
        loading: false,
        error: null,
      },
    });

    const dragHandles = wrapper.findAll(".drag-handle");
    expect(dragHandles.length).toBe(3);
  });

  it("makes section items draggable", () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: mockSections,
        loading: false,
        error: null,
      },
    });

    const sectionItems = wrapper.findAll(".section-item");
    sectionItems.forEach((item) => {
      expect(item.attributes("draggable")).toBe("true");
    });
  });

  it("emits reorder-sections event on drag and drop", async () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: mockSections,
        loading: false,
        error: null,
      },
    });

    const sectionItems = wrapper.findAll(".section-item");

    // Simulate drag and drop: drag first item to third position
    await sectionItems[0].trigger("dragstart");
    await sectionItems[2].trigger("dragover");
    await sectionItems[2].trigger("drop");

    expect(wrapper.emitted("reorder-sections")).toBeTruthy();
    const emittedOrder = wrapper.emitted(
      "reorder-sections",
    )?.[0]?.[0] as number[];
    expect(emittedOrder).toBeDefined();
    expect(emittedOrder.length).toBe(3);
    // After dragging first to third position: [2, 3, 1]
    expect(emittedOrder).toEqual([2, 3, 1]);
  });

  it("displays empty state when no sections", () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: [],
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).toContain("No report sections configured");
  });

  it("applies correct styling to prose type badge", () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: [mockSections[0]],
        loading: false,
        error: null,
      },
    });

    const typeBadge = wrapper.find(".section-type");
    expect(typeBadge.classes()).toContain("type-prose");
  });

  it("applies correct styling to status type badge", () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: [mockSections[1]],
        loading: false,
        error: null,
      },
    });

    const typeBadge = wrapper.find(".section-type");
    expect(typeBadge.classes()).toContain("type-status");
  });

  it("handles drag end event", async () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: mockSections,
        loading: false,
        error: null,
      },
    });

    const sectionItems = wrapper.findAll(".section-item");
    await sectionItems[0].trigger("dragstart");
    await sectionItems[0].trigger("dragend");

    // Should not emit reorder if dropped on same position
    expect(wrapper.emitted("reorder-sections")).toBeFalsy();
  });

  it("does not emit reorder when dragging to same position", async () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: mockSections,
        loading: false,
        error: null,
      },
    });

    const sectionItems = wrapper.findAll(".section-item");

    // Drag and drop to same position
    await sectionItems[0].trigger("dragstart");
    await sectionItems[0].trigger("dragover");
    await sectionItems[0].trigger("drop");

    expect(wrapper.emitted("reorder-sections")).toBeFalsy();
  });

  it("displays all action buttons for each section", () => {
    const wrapper = mount(ReportSectionList, {
      props: {
        sections: mockSections,
        loading: false,
        error: null,
      },
    });

    const sectionItems = wrapper.findAll(".section-item");
    sectionItems.forEach((item) => {
      expect(item.find(".toggle-checkbox").exists()).toBe(true);
      expect(item.findAll(".btn-action").length).toBe(2); // Edit and delete
    });
  });
});

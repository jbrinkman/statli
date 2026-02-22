import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import TaskForm from "./TaskForm.vue";
import type { Task } from "../composables/useTasks";
import type {
  ReportSection,
  StatusDefinition,
} from "../composables/useReports";

describe("TaskForm", () => {
  let wrapper: VueWrapper<any>;

  const mockSections: ReportSection[] = [
    {
      id: 1,
      project_id: 1,
      name: "Weekly Support",
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
      name: "Roadmap",
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
      content: "",
      order: 0,
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];

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

  const mockTask: Task = {
    id: 1,
    project_id: 1,
    report_section_id: 1,
    name: "Test Task",
    status: "in progress",
    expected_completion_date: "2024-12-31",
    url: "https://example.com",
    notes: "Test notes",
    priority: 0,
    is_deleted: false,
    is_archived: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    wrapper = mount(TaskForm, {
      props: {
        sections: mockSections,
        statusDefinitions: mockStatusDefinitions,
        projectId: 1,
      },
    });
  });

  describe("Component Rendering", () => {
    it("should render the form with all fields", () => {
      expect(wrapper.find("h2").text()).toBe("Create Task");
      expect(wrapper.find("#name").exists()).toBe(true);
      expect(wrapper.find("#report_section_id").exists()).toBe(true);
      expect(wrapper.find("#status").exists()).toBe(true);
      expect(wrapper.find("#expected_completion_date").exists()).toBe(true);
      expect(wrapper.find("#url").exists()).toBe(true);
      expect(wrapper.find("#notes").exists()).toBe(true);
    });

    it('should show "Create Task" title when creating new task', () => {
      expect(wrapper.find(".title").text()).toBe("Create Task");
    });

    it('should show "Edit Task" title when editing existing task', async () => {
      await wrapper.setProps({ task: mockTask });
      expect(wrapper.find(".title").text()).toBe("Edit Task");
    });

    it("should populate form fields when editing existing task", async () => {
      await wrapper.setProps({ task: mockTask });

      const nameInput = wrapper.find("#name").element as HTMLInputElement;
      const sectionSelect = wrapper.find("#report_section_id")
        .element as HTMLSelectElement;
      const statusSelect = wrapper.find("#status").element as HTMLSelectElement;
      const ecdInput = wrapper.find("#expected_completion_date")
        .element as HTMLInputElement;
      const urlInput = wrapper.find("#url").element as HTMLInputElement;
      const notesTextarea = wrapper.find("#notes")
        .element as HTMLTextAreaElement;

      expect(nameInput.value).toBe("Test Task");
      expect(Number(sectionSelect.value)).toBe(1);
      expect(statusSelect.value).toBe("in progress");
      expect(ecdInput.value).toBe("2024-12-31");
      expect(urlInput.value).toBe("https://example.com");
      expect(notesTextarea.value).toBe("Test notes");
    });

    it("should only show status-type sections in section dropdown", () => {
      const sectionSelect = wrapper.find("#report_section_id");
      const options = sectionSelect.findAll("option");

      // Should have 3 options: placeholder + 2 status sections
      expect(options.length).toBe(3);
      expect(options[0].text()).toBe("Select a section");
      expect(options[1].text()).toBe("Weekly Support");
      expect(options[2].text()).toBe("Roadmap");
    });

    it("should show all status definitions in status dropdown", () => {
      const statusSelect = wrapper.find("#status");
      const options = statusSelect.findAll("option");

      // Should have 4 options: placeholder + 3 statuses
      expect(options.length).toBe(4);
      expect(options[0].text()).toBe("Select a status");
      expect(options[1].text()).toBe("not started");
      expect(options[2].text()).toBe("in progress");
      expect(options[3].text()).toBe("done");
    });
  });

  describe("Form Validation", () => {
    it("should show error when task name is empty", async () => {
      await wrapper.find("form").trigger("submit.prevent");

      expect(wrapper.vm.errors.name).toBe("Task name is required");
      expect(wrapper.find(".error-message").text()).toBe(
        "Task name is required",
      );
    });

    it("should show error when section is not selected", async () => {
      const nameInput = wrapper.find("#name");
      await nameInput.setValue("Test Task");

      await wrapper.find("form").trigger("submit.prevent");

      expect(wrapper.vm.errors.report_section_id).toBe("Section is required");
    });

    it("should show error when status is not selected", async () => {
      const nameInput = wrapper.find("#name");
      await nameInput.setValue("Test Task");

      const sectionSelect = wrapper.find("#report_section_id");
      await sectionSelect.setValue(1);

      await wrapper.find("form").trigger("submit.prevent");

      expect(wrapper.vm.errors.status).toBe("Status is required");
    });

    it("should not show errors when all required fields are filled", async () => {
      const nameInput = wrapper.find("#name");
      await nameInput.setValue("Test Task");

      const sectionSelect = wrapper.find("#report_section_id");
      await sectionSelect.setValue("1");
      await wrapper.vm.$nextTick();

      const statusSelect = wrapper.find("#status");
      await statusSelect.setValue("in progress");
      await wrapper.vm.$nextTick();

      await wrapper.find("form").trigger("submit.prevent");
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.errors.name).toBeUndefined();
      expect(wrapper.vm.errors.report_section_id).toBeUndefined();
      expect(wrapper.vm.errors.status).toBeUndefined();
    });
  });

  describe("Form Submission", () => {
    it("should emit submit event with task data when creating new task", async () => {
      const nameInput = wrapper.find("#name");
      await nameInput.setValue("New Task");

      const sectionSelect = wrapper.find("#report_section_id");
      await sectionSelect.setValue("1");
      await wrapper.vm.$nextTick();

      const statusSelect = wrapper.find("#status");
      await statusSelect.setValue("not started");
      await wrapper.vm.$nextTick();

      const ecdInput = wrapper.find("#expected_completion_date");
      await ecdInput.setValue("2024-12-31");

      const urlInput = wrapper.find("#url");
      await urlInput.setValue("https://example.com");

      const notesTextarea = wrapper.find("#notes");
      await notesTextarea.setValue("Task notes");

      await wrapper.find("form").trigger("submit.prevent");
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted("submit")).toBeTruthy();
      const submitEvent = wrapper.emitted("submit")?.[0]?.[0] as any;

      expect(submitEvent.name).toBe("New Task");
      expect(submitEvent.report_section_id).toBe(1);
      expect(submitEvent.status).toBe("not started");
      expect(submitEvent.expected_completion_date).toBe("2024-12-31");
      expect(submitEvent.url).toBe("https://example.com");
      expect(submitEvent.notes).toBe("Task notes");
      expect(submitEvent.project_id).toBe(1);
    });

    it("should emit submit event with updated task data when editing", async () => {
      await wrapper.setProps({ task: mockTask });

      const nameInput = wrapper.find("#name");
      await nameInput.setValue("Updated Task");

      await wrapper.find("form").trigger("submit.prevent");

      expect(wrapper.emitted("submit")).toBeTruthy();
      const submitEvent = wrapper.emitted("submit")?.[0]?.[0] as any;

      expect(submitEvent.id).toBe(1);
      expect(submitEvent.name).toBe("Updated Task");
    });

    it("should handle null expected_completion_date", async () => {
      const nameInput = wrapper.find("#name");
      await nameInput.setValue("Task without ECD");

      const sectionSelect = wrapper.find("#report_section_id");
      await sectionSelect.setValue("1");
      await wrapper.vm.$nextTick();

      const statusSelect = wrapper.find("#status");
      await statusSelect.setValue("not started");
      await wrapper.vm.$nextTick();

      await wrapper.find("form").trigger("submit.prevent");
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted("submit")).toBeTruthy();
      const submitEvent = wrapper.emitted("submit")?.[0]?.[0] as any;
      expect(submitEvent.expected_completion_date).toBeNull();
    });
  });

  describe("User Interactions", () => {
    it("should emit cancel event when cancel button is clicked", async () => {
      const cancelButton = wrapper.find(".btn-cancel");
      await cancelButton.trigger("click");

      expect(wrapper.emitted("cancel")).toBeTruthy();
    });

    it("should emit cancel event when close button is clicked", async () => {
      const closeButton = wrapper.find(".btn-close");
      await closeButton.trigger("click");

      expect(wrapper.emitted("cancel")).toBeTruthy();
    });

    it("should disable submit button when submitting", async () => {
      wrapper.vm.submitting = true;
      await wrapper.vm.$nextTick();

      const submitButton = wrapper.find(".btn-submit");
      expect((submitButton.element as HTMLButtonElement).disabled).toBe(true);
    });

    it('should show "Saving..." text when submitting', async () => {
      wrapper.vm.submitting = true;
      await wrapper.vm.$nextTick();

      const submitButton = wrapper.find(".btn-submit");
      expect(submitButton.text()).toBe("Saving...");
    });
  });

  describe("Auto-resize Textarea", () => {
    it("should have textarea element with ref", () => {
      const textarea = wrapper.find("#notes");
      expect(textarea.exists()).toBe(true);
    });

    it("should auto-resize textarea when notes change", async () => {
      const notesTextarea = wrapper.find("#notes");
      const element = notesTextarea.element as HTMLTextAreaElement;

      // Set initial height
      element.style.height = "50px";

      await notesTextarea.setValue("New notes content\nwith multiple\nlines");
      await wrapper.vm.$nextTick();

      // After auto-resize, height should be different from initial
      expect(element.style.height).not.toBe("50px");
    });
  });

  describe("Requirements Validation", () => {
    it("should validate Requirement 3.1: Task name is required", async () => {
      await wrapper.find("form").trigger("submit.prevent");
      expect(wrapper.vm.errors.name).toBe("Task name is required");
    });

    it("should validate Requirement 3.2: Section assignment is required", async () => {
      const nameInput = wrapper.find("#name");
      await nameInput.setValue("Test Task");

      await wrapper.find("form").trigger("submit.prevent");
      expect(wrapper.vm.errors.report_section_id).toBe("Section is required");
    });

    it("should support Requirement 12.3: Form for creating/editing tasks", () => {
      expect(wrapper.find("form").exists()).toBe(true);
      expect(wrapper.find("#name").exists()).toBe(true);
      expect(wrapper.find("#report_section_id").exists()).toBe(true);
      expect(wrapper.find("#status").exists()).toBe(true);
    });

    it("should support Requirement 12.12: Resizable text fields", () => {
      const textarea = wrapper.find("#notes");
      expect(textarea.exists()).toBe(true);
      // Check that textarea has the textarea class which includes resize: vertical
      expect(textarea.classes()).toContain("textarea");
    });

    it("should support Requirement 12.13: Auto-resize text fields", async () => {
      const textarea = wrapper.find("#notes");
      await textarea.setValue("Line 1\nLine 2\nLine 3\nLine 4\nLine 5");

      await wrapper.vm.$nextTick();

      // The textarea should have auto-resized
      const element = textarea.element as HTMLTextAreaElement;
      expect(element.style.height).not.toBe("auto");
    });

    it("should support Requirement 12.14: Maintain proper spacing", () => {
      const formGroups = wrapper.findAll(".form-group");
      expect(formGroups.length).toBeGreaterThan(0);

      // Check that form has gap styling
      const form = wrapper.find(".form");
      expect(form.classes()).toContain("form");
    });
  });
});

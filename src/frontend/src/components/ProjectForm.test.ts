import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ProjectForm from "./ProjectForm.vue";
import type { Project } from "../composables/useProjects";

describe("ProjectForm", () => {
  describe("Create Mode", () => {
    it("should render form with default values", () => {
      const wrapper = mount(ProjectForm);

      expect(wrapper.find("h2").text()).toBe("Create Project");
      expect(wrapper.find("#name").element.value).toBe("");
      expect(wrapper.find("#filename_format").element.value).toBe(
        "{project-name}-status-{YYYY-MM-DD}.md",
      );
      expect(wrapper.find("#report_title_format").element.value).toBe(
        "{project-name} Status Report - {YYYY-MM-DD}",
      );
      expect(wrapper.find("#default_directory").element.value).toBe("");
      expect(wrapper.find("#use_year_subfolders").element.checked).toBe(false);
    });

    it("should validate required fields", async () => {
      const wrapper = mount(ProjectForm);

      // Submit without filling required fields
      await wrapper.find("form").trigger("submit.prevent");

      // Check for error messages
      expect(wrapper.text()).toContain("Project name is required");
    });

    it("should validate filename format for invalid characters", async () => {
      const wrapper = mount(ProjectForm);

      // Fill in name but use invalid filename format
      await wrapper.find("#name").setValue("Test Project");
      await wrapper.find("#filename_format").setValue("invalid/filename*.md");
      await wrapper.find("#default_directory").setValue("/path/to/reports");

      await wrapper.find("form").trigger("submit.prevent");

      expect(wrapper.text()).toContain(
        "Filename format contains invalid characters",
      );
    });

    it("should emit submit event with form data on valid submission", async () => {
      const wrapper = mount(ProjectForm);

      // Fill in all required fields
      await wrapper.find("#name").setValue("Test Project");
      await wrapper
        .find("#filename_format")
        .setValue("{project-name}-{YYYY-MM-DD}.md");
      await wrapper
        .find("#report_title_format")
        .setValue("{project-name} Report");
      await wrapper.find("#default_directory").setValue("/path/to/reports");
      await wrapper.find("#recipients_to").setValue("test@example.com");

      await wrapper.find("form").trigger("submit.prevent");

      expect(wrapper.emitted("submit")).toBeTruthy();
      const emittedData = wrapper.emitted("submit")?.[0]?.[0] as any;
      expect(emittedData.name).toBe("Test Project");
      expect(emittedData.filename_format).toBe(
        "{project-name}-{YYYY-MM-DD}.md",
      );
      expect(emittedData.recipients_to).toBe("test@example.com");
    });

    it("should emit cancel event when cancel button is clicked", async () => {
      const wrapper = mount(ProjectForm);

      await wrapper.find(".btn-cancel").trigger("click");

      expect(wrapper.emitted("cancel")).toBeTruthy();
    });

    it("should emit cancel event when close button is clicked", async () => {
      const wrapper = mount(ProjectForm);

      await wrapper.find(".btn-close").trigger("click");

      expect(wrapper.emitted("cancel")).toBeTruthy();
    });
  });

  describe("Edit Mode", () => {
    const mockProject: Project = {
      id: 1,
      name: "Existing Project",
      filename_format: "{project-name}-status-{YYYY-MM-DD}.md",
      report_title_format: "{project-name} Status Report",
      default_directory: "/existing/path",
      use_year_subfolders: true,
      recipients_to: "existing@example.com",
      recipients_cc: "cc@example.com",
      recipients_bcc: "",
      is_archived: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    it("should render form with project data", () => {
      const wrapper = mount(ProjectForm, {
        props: {
          project: mockProject,
        },
      });

      expect(wrapper.find("h2").text()).toBe("Edit Project");
      expect(wrapper.find("#name").element.value).toBe("Existing Project");
      expect(wrapper.find("#default_directory").element.value).toBe(
        "/existing/path",
      );
      expect(wrapper.find("#use_year_subfolders").element.checked).toBe(true);
      expect(wrapper.find("#recipients_to").element.value).toBe(
        "existing@example.com",
      );
      expect(wrapper.find("#recipients_cc").element.value).toBe(
        "cc@example.com",
      );
    });

    it("should emit submit event with updated project data", async () => {
      const wrapper = mount(ProjectForm, {
        props: {
          project: mockProject,
        },
      });

      // Update the name
      await wrapper.find("#name").setValue("Updated Project");

      await wrapper.find("form").trigger("submit.prevent");

      expect(wrapper.emitted("submit")).toBeTruthy();
      const emittedData = wrapper.emitted("submit")?.[0]?.[0] as any;
      expect(emittedData.id).toBe(1);
      expect(emittedData.name).toBe("Updated Project");
      expect(emittedData.created_at).toBe("2024-01-01T00:00:00Z");
    });
  });

  describe("Validation", () => {
    it("should reject empty project name", async () => {
      const wrapper = mount(ProjectForm);

      await wrapper.find("#name").setValue("   ");
      await wrapper.find("#filename_format").setValue("valid.md");
      await wrapper.find("#report_title_format").setValue("Valid Title");
      await wrapper.find("#default_directory").setValue("/path");

      await wrapper.find("form").trigger("submit.prevent");

      expect(wrapper.text()).toContain("Project name is required");
      expect(wrapper.emitted("submit")).toBeFalsy();
    });

    it("should reject filename format with forward slash", async () => {
      const wrapper = mount(ProjectForm);

      await wrapper.find("#name").setValue("Test");
      await wrapper.find("#filename_format").setValue("path/to/file.md");
      await wrapper.find("#report_title_format").setValue("Title");
      await wrapper.find("#default_directory").setValue("/path");

      await wrapper.find("form").trigger("submit.prevent");

      expect(wrapper.text()).toContain("invalid characters");
    });

    it("should reject filename format with backslash", async () => {
      const wrapper = mount(ProjectForm);

      await wrapper.find("#name").setValue("Test");
      await wrapper.find("#filename_format").setValue("path\\to\\file.md");
      await wrapper.find("#report_title_format").setValue("Title");
      await wrapper.find("#default_directory").setValue("/path");

      await wrapper.find("form").trigger("submit.prevent");

      expect(wrapper.text()).toContain("invalid characters");
    });

    it("should reject filename format with asterisk", async () => {
      const wrapper = mount(ProjectForm);

      await wrapper.find("#name").setValue("Test");
      await wrapper.find("#filename_format").setValue("file*.md");
      await wrapper.find("#report_title_format").setValue("Title");
      await wrapper.find("#default_directory").setValue("/path");

      await wrapper.find("form").trigger("submit.prevent");

      expect(wrapper.text()).toContain("invalid characters");
    });

    it("should accept valid filename format with template variables", async () => {
      const wrapper = mount(ProjectForm);

      await wrapper.find("#name").setValue("Test Project");
      await wrapper
        .find("#filename_format")
        .setValue("{project-name}-{YYYY}-{MM}-{DD}.md");
      await wrapper
        .find("#report_title_format")
        .setValue("{project-name} {YYYY-MM-DD}");
      await wrapper.find("#default_directory").setValue("/path/to/reports");

      await wrapper.find("form").trigger("submit.prevent");

      expect(wrapper.emitted("submit")).toBeTruthy();
    });

    it("should trim whitespace from all text inputs", async () => {
      const wrapper = mount(ProjectForm);

      await wrapper.find("#name").setValue("  Test Project  ");
      await wrapper.find("#filename_format").setValue("  file.md  ");
      await wrapper.find("#report_title_format").setValue("  Title  ");
      await wrapper.find("#default_directory").setValue("  /path  ");
      await wrapper.find("#recipients_to").setValue("  test@example.com  ");

      await wrapper.find("form").trigger("submit.prevent");

      const emittedData = wrapper.emitted("submit")?.[0]?.[0] as any;
      expect(emittedData.name).toBe("Test Project");
      expect(emittedData.filename_format).toBe("file.md");
      expect(emittedData.report_title_format).toBe("Title");
      expect(emittedData.default_directory).toBe("/path");
      expect(emittedData.recipients_to).toBe("test@example.com");
    });
  });

  describe("Year Subfolders", () => {
    it("should toggle year subfolders checkbox", async () => {
      const wrapper = mount(ProjectForm);

      const checkbox = wrapper.find("#use_year_subfolders");
      expect(checkbox.element.checked).toBe(false);

      await checkbox.setValue(true);
      expect(checkbox.element.checked).toBe(true);

      await wrapper.find("#name").setValue("Test");
      await wrapper.find("#filename_format").setValue("file.md");
      await wrapper.find("#report_title_format").setValue("Title");
      await wrapper.find("#default_directory").setValue("/path");
      await wrapper.find("form").trigger("submit.prevent");

      const emittedData = wrapper.emitted("submit")?.[0]?.[0] as any;
      expect(emittedData.use_year_subfolders).toBe(true);
    });
  });

  describe("Recipients", () => {
    it("should handle multiple recipient fields", async () => {
      const wrapper = mount(ProjectForm);

      await wrapper.find("#name").setValue("Test");
      await wrapper.find("#filename_format").setValue("file.md");
      await wrapper.find("#report_title_format").setValue("Title");
      await wrapper.find("#default_directory").setValue("/path");
      await wrapper.find("#recipients_to").setValue("to@example.com");
      await wrapper.find("#recipients_cc").setValue("cc@example.com");
      await wrapper.find("#recipients_bcc").setValue("bcc@example.com");

      await wrapper.find("form").trigger("submit.prevent");

      const emittedData = wrapper.emitted("submit")?.[0]?.[0] as any;
      expect(emittedData.recipients_to).toBe("to@example.com");
      expect(emittedData.recipients_cc).toBe("cc@example.com");
      expect(emittedData.recipients_bcc).toBe("bcc@example.com");
    });

    it("should allow empty recipient fields", async () => {
      const wrapper = mount(ProjectForm);

      await wrapper.find("#name").setValue("Test");
      await wrapper.find("#filename_format").setValue("file.md");
      await wrapper.find("#report_title_format").setValue("Title");
      await wrapper.find("#default_directory").setValue("/path");

      await wrapper.find("form").trigger("submit.prevent");

      const emittedData = wrapper.emitted("submit")?.[0]?.[0] as any;
      expect(emittedData.recipients_to).toBe("");
      expect(emittedData.recipients_cc).toBe("");
      expect(emittedData.recipients_bcc).toBe("");
    });
  });
});

import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ReportPreview from "./ReportPreview.vue";
import type { GeneratedReport } from "../composables/useReports";

describe("ReportPreview", () => {
  const mockReport: GeneratedReport = {
    Title: "Test Project Status Report - 2026-02-20",
    Recipients: {
      To: "team@example.com",
      CC: "manager@example.com",
      BCC: "archive@example.com",
    },
    Sections: [
      {
        Name: "TL;DR",
        Type: "prose",
        Content: "This is a summary of the report.",
      },
      {
        Name: "Weekly Support",
        Type: "status",
        Content:
          '- [Task 1](https://example.com/task1) <span class="status-green">done</span> 2026-02-20\n  Task notes here',
      },
    ],
    CSS: ".status-green { background-color: #efe; color: #0a0; padding: 2px 6px; border-radius: 3px; font-weight: bold; }",
  };

  it("renders loading state", () => {
    const wrapper = mount(ReportPreview, {
      props: {
        report: null,
        loading: true,
      },
    });

    expect(wrapper.text()).toContain("Loading report preview");
  });

  it("renders error state", () => {
    const wrapper = mount(ReportPreview, {
      props: {
        report: null,
        error: "Failed to generate report",
      },
    });

    expect(wrapper.text()).toContain("Failed to generate report");
    expect(wrapper.find(".error").exists()).toBe(true);
  });

  it("renders empty state when no report", () => {
    const wrapper = mount(ReportPreview, {
      props: {
        report: null,
      },
    });

    expect(wrapper.text()).toContain("No report generated");
  });

  it("renders report title", () => {
    const wrapper = mount(ReportPreview, {
      props: {
        report: mockReport,
      },
    });

    expect(wrapper.find(".report-title").text()).toBe(mockReport.Title);
  });

  it("renders recipients block", () => {
    const wrapper = mount(ReportPreview, {
      props: {
        report: mockReport,
      },
    });

    const recipientsBlock = wrapper.find(".recipients-block");
    expect(recipientsBlock.exists()).toBe(true);
    expect(recipientsBlock.text()).toContain("To: team@example.com");
    expect(recipientsBlock.text()).toContain("CC: manager@example.com");
    expect(recipientsBlock.text()).toContain("BCC: archive@example.com");
  });

  it("renders all report sections", () => {
    const wrapper = mount(ReportPreview, {
      props: {
        report: mockReport,
      },
    });

    const sections = wrapper.findAll(".report-section");
    expect(sections).toHaveLength(2);
    expect(sections[0].find(".section-title").text()).toBe("TL;DR");
    expect(sections[1].find(".section-title").text()).toBe("Weekly Support");
  });

  it("renders section content with HTML", () => {
    const mockReportSections = [
      {
        id: 1,
        project_id: 1,
        name: "TL;DR",
        type: "prose",
        content: "This is a summary of the report.",
        order: 0,
        is_enabled: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];

    const wrapper = mount(ReportPreview, {
      props: {
        report: mockReport,
        reportSections: mockReportSections,
      },
    });

    // Prose sections use RenderedProseSection component, status sections use section-content div
    const sections = wrapper.findAll(".report-section");
    expect(sections[0].html()).toContain("This is a summary of the report");

    const sectionContent = wrapper.findAll(".section-content");
    expect(sectionContent).toHaveLength(1); // Only status section has section-content
    expect(sectionContent[0].html()).toContain("Task 1");
  });

  it("renders status badges with CSS classes", () => {
    const wrapper = mount(ReportPreview, {
      props: {
        report: mockReport,
      },
    });

    const sectionContent = wrapper.findAll(".section-content")[0]; // Changed from [1] to [0]
    expect(sectionContent.html()).toContain("status-green");
    expect(sectionContent.html()).toContain("done");
  });

  it("converts markdown links to HTML", () => {
    const wrapper = mount(ReportPreview, {
      props: {
        report: mockReport,
      },
    });

    const sectionContent = wrapper.findAll(".section-content")[0]; // Changed from [1] to [0]
    expect(sectionContent.html()).toContain(
      '<a href="https://example.com/task1"',
    );
    expect(sectionContent.html()).toContain('target="_blank"');
  });

  it("handles report with empty recipients", () => {
    const reportWithEmptyRecipients: GeneratedReport = {
      ...mockReport,
      Recipients: {
        To: "",
        CC: "",
        BCC: "",
      },
    };

    const wrapper = mount(ReportPreview, {
      props: {
        report: reportWithEmptyRecipients,
      },
    });

    const recipientsBlock = wrapper.find(".recipients-block");
    expect(recipientsBlock.exists()).toBe(true);
    // Should not render empty recipient lines
    expect(recipientsBlock.text()).not.toContain("To:");
    expect(recipientsBlock.text()).not.toContain("CC:");
    expect(recipientsBlock.text()).not.toContain("BCC:");
  });

  it("handles report with no sections", () => {
    const reportWithNoSections: GeneratedReport = {
      ...mockReport,
      Sections: [],
    };

    const wrapper = mount(ReportPreview, {
      props: {
        report: reportWithNoSections,
      },
    });

    const sections = wrapper.findAll(".report-section");
    expect(sections).toHaveLength(0);
  });

  it("renders strikethrough markdown", () => {
    const reportWithStrikethrough: GeneratedReport = {
      ...mockReport,
      Sections: [
        {
          Name: "Test",
          Type: "status",
          Content: "~~old date~~ new date",
        },
      ],
    };

    const wrapper = mount(ReportPreview, {
      props: {
        report: reportWithStrikethrough,
      },
    });

    const sectionContent = wrapper.find(".section-content");
    expect(sectionContent.html()).toContain("<del>old date</del>");
  });

  it("renders status change indicators", () => {
    const reportWithStatusChange: GeneratedReport = {
      ...mockReport,
      Sections: [
        {
          Name: "Test",
          Type: "status",
          Content:
            '<span class="status-yellow">in progress</span> → <span class="status-green">done</span>',
        },
      ],
    };

    const wrapper = mount(ReportPreview, {
      props: {
        report: reportWithStatusChange,
      },
    });

    const sectionContent = wrapper.find(".section-content");
    expect(sectionContent.html()).toContain("status-yellow");
    expect(sectionContent.html()).toContain("status-green");
    expect(sectionContent.html()).toContain("→");
  });

  it("injects CSS styles from report", () => {
    const wrapper = mount(ReportPreview, {
      props: {
        report: mockReport,
      },
    });

    // Check that the style component is rendered
    const reportContent = wrapper.find(".report-content");
    expect(reportContent.exists()).toBe(true);

    // The CSS should be injected via the component :is="'style'" element
    expect(wrapper.html()).toContain(".status-green");
  });
});

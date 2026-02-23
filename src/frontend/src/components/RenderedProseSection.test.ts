import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import fc from "fast-check";
import RenderedProseSection from "./RenderedProseSection.vue";

// Helper to create a mock ReportSection
const createMockSection = (content: string) => ({
  id: 1,
  project_id: 1,
  name: "Test Section",
  type: "prose",
  content,
  order: 1,
  is_enabled: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
});

describe("RenderedProseSection - Property-Based Tests", () => {
  /**
   * Property 6: Markdown-to-HTML Conversion
   * Validates: Requirements 4.1, 4.2
   */
  it("Property 6: converts markdown to valid HTML for all valid markdown strings", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random markdown strings with various markdown syntax
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.constantFrom(
            "# Heading 1",
            "## Heading 2",
            "**bold text**",
            "*italic text*",
            "`code`",
            "- list item",
            "1. numbered item",
            "[link](http://example.com)",
            "> blockquote",
            "---",
            "```\ncode block\n```",
          ),
          fc
            .array(
              fc.constantFrom(
                "# Heading",
                "paragraph text",
                "**bold**",
                "*italic*",
                "- item",
              ),
              { minLength: 1, maxLength: 10 },
            )
            .map((arr) => arr.join("\n\n")),
        ),
        async (markdown) => {
          const section = createMockSection(markdown);
          const wrapper = mount(RenderedProseSection, {
            props: {
              section,
              stylesheet: "",
            },
          });

          await wrapper.vm.$nextTick();

          // Verify conversion produces valid HTML (no error)
          expect(wrapper.find(".error-message").exists()).toBe(false);

          // Check output is non-empty for non-empty input
          const proseContent = wrapper.find(".prose-content");
          if (markdown.trim() !== "") {
            expect(proseContent.exists()).toBe(true);
            expect(proseContent.html()).not.toBe("");
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7: HTML Passthrough Preservation
   * Validates: Requirements 4.3
   */
  it("Property 7: preserves embedded HTML tags unchanged in rendered output", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate markdown with embedded HTML tags
        fc
          .record({
            htmlTag: fc.constantFrom("div", "span", "a", "strong", "em"),
            // Use alphanumeric content only to avoid HTML entity encoding issues
            content: fc
              .stringMatching(/^[a-zA-Z0-9 ]+$/)
              .filter((s) => s.length > 0 && s.length <= 50),
          })
          .chain(({ htmlTag, content }) => {
            // Build simple HTML tag
            const fullHtml = `<${htmlTag}>${content}</${htmlTag}>`;

            // Embed in markdown
            const markdown = `Some text ${fullHtml} more text`;

            return fc.tuple(
              fc.constant(markdown),
              fc.constant(htmlTag),
              fc.constant(content),
            );
          }),
        async ([markdown, htmlTag, content]) => {
          const section = createMockSection(markdown);
          const wrapper = mount(RenderedProseSection, {
            props: {
              section,
              stylesheet: "",
            },
          });

          await wrapper.vm.$nextTick();

          // Verify HTML tags appear in rendered output
          const proseContent = wrapper.find(".prose-content");
          expect(proseContent.exists()).toBe(true);

          const innerHtml = proseContent.element.innerHTML;
          // The HTML should contain the tag and content (HTML passthrough preserved)
          expect(innerHtml).toContain(`<${htmlTag}>`);
          expect(innerHtml).toContain(`</${htmlTag}>`);
          if (content.trim()) {
            expect(innerHtml).toContain(content);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("RenderedProseSection - Unit Tests", () => {
  it("renders markdown as HTML", async () => {
    const markdown = "# Hello World\n\nThis is **bold** text.";
    const section = createMockSection(markdown);

    const wrapper = mount(RenderedProseSection, {
      props: {
        section,
        stylesheet: "",
      },
    });

    await wrapper.vm.$nextTick();

    const proseContent = wrapper.find(".prose-content");
    expect(proseContent.exists()).toBe(true);

    const html = proseContent.html();
    expect(html).toContain("<h1>");
    expect(html).toContain("Hello World");
    expect(html).toContain("<strong>");
    expect(html).toContain("bold");
  });

  it("applies stylesheet to rendered content", async () => {
    const markdown = "# Test";
    const section = createMockSection(markdown);
    const stylesheet = ".prose-content h1 { color: red; }";

    const wrapper = mount(RenderedProseSection, {
      props: {
        section,
        stylesheet,
      },
    });

    await wrapper.vm.$nextTick();

    // Verify stylesheet is injected
    const styleElement = wrapper.find("style");
    expect(styleElement.exists()).toBe(true);
    expect(styleElement.text()).toContain(".prose-content h1 { color: red; }");
  });

  it("handles empty content gracefully", async () => {
    const section = createMockSection("");

    const wrapper = mount(RenderedProseSection, {
      props: {
        section,
        stylesheet: "",
      },
    });

    await wrapper.vm.$nextTick();

    const emptyContent = wrapper.find(".empty-content");
    expect(emptyContent.exists()).toBe(true);
    expect(emptyContent.text()).toContain("No content");
  });

  it("sanitizes HTML and removes script tags", async () => {
    const markdown = '<script>alert("XSS")</script><p>Safe content</p>';
    const section = createMockSection(markdown);

    const wrapper = mount(RenderedProseSection, {
      props: {
        section,
        stylesheet: "",
      },
    });

    await wrapper.vm.$nextTick();

    const proseContent = wrapper.find(".prose-content");
    expect(proseContent.exists()).toBe(true);

    const html = proseContent.html();
    // Script tag should be removed by DOMPurify
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("alert");
    // Safe content should remain
    expect(html).toContain("Safe content");
  });

  it("handles malformed markdown without errors", async () => {
    // Marked.js is very permissive, so most "malformed" markdown just renders as-is
    const markdown = "### Unclosed [link\n**Unclosed bold";
    const section = createMockSection(markdown);

    const wrapper = mount(RenderedProseSection, {
      props: {
        section,
        stylesheet: "",
      },
    });

    await wrapper.vm.$nextTick();

    // Should not show error message
    const errorMessage = wrapper.find(".error-message");
    expect(errorMessage.exists()).toBe(false);

    // Should render something
    const proseContent = wrapper.find(".prose-content");
    expect(proseContent.exists()).toBe(true);
  });
});

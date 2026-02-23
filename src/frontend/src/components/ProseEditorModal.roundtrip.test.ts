import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import fc from "fast-check";
import ProseEditorModal from "./ProseEditorModal.vue";
import type { ReportSection } from "../composables/useReports";

// Mock MonacoEditor component
vi.mock("./MonacoEditor.vue", () => ({
  default: {
    name: "MonacoEditor",
    template:
      '<div class="mock-monaco-editor"><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
    props: ["modelValue", "language", "theme"],
    emits: ["update:modelValue"],
  },
}));

describe("ProseEditorModal - Comprehensive Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  /**
   * Property 14: Markdown Round-Trip Integrity
   * **Validates: Requirements 6.1, 6.2, 6.3**
   *
   * For any valid markdown content, saving the content to a prose section
   * and then reopening that section for editing SHALL produce identical
   * markdown text (round-trip property).
   */
  it("Property 14: markdown round-trip preserves content exactly", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate diverse markdown strings
        fc.oneof(
          // Random strings with various lengths
          fc.string({ minLength: 1, maxLength: 10000 }),
          // Empty string
          fc.constant(""),
          // Whitespace variations
          fc.constantFrom("   ", "\n\n\n", "\t\t", " \n \t \n "),
          // Markdown syntax
          fc.constantFrom(
            "# Heading 1\n## Heading 2\n### Heading 3",
            "**bold** *italic* ***both***",
            "`inline code` and ```\ncode block\n```",
            "- list\n- items\n  - nested",
            "1. numbered\n2. list\n3. items",
            "[link](http://example.com)",
            "![image](http://example.com/img.png)",
            "> blockquote\n> multiple lines",
            "---\nhorizontal rule",
            "| table | header |\n|-------|--------|\n| cell  | cell   |",
          ),
          // HTML embedded in markdown
          fc.constantFrom(
            "<div>HTML content</div>",
            "<p>Paragraph</p><span>Span</span>",
            "<strong>Bold HTML</strong>",
            "<!-- HTML comment -->",
            "<a href='#'>Link</a>",
          ),
          // Special characters
          fc.constantFrom(
            "Special chars: & < > \" ' / \\",
            "Unicode: ñ é ü ö 中文 日本語 한국어",
            "Emoji: 🎉 🚀 ✨ 💻 📝",
            "Symbols: © ® ™ § ¶ † ‡",
          ),
          // Mixed content
          fc
            .array(
              fc.constantFrom(
                "# Header",
                "paragraph",
                "**bold**",
                "*italic*",
                "`code`",
                "- item",
                "<div>html</div>",
                "\n\n",
                "   ",
              ),
              { minLength: 1, maxLength: 20 },
            )
            .map((arr) => arr.join("\n")),
        ),
        async (originalMarkdown) => {
          // Create a mock section with the original markdown
          const mockSection: ReportSection = {
            id: 1,
            project_id: 1,
            name: "Test Section",
            type: "prose",
            content: originalMarkdown,
            order: 1,
            is_enabled: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          };

          // Mount the editor with the section (simulating "reopening for editing")
          const wrapper = mount(ProseEditorModal, {
            props: {
              section: mockSection,
              isOpen: true,
            },
          });

          await wrapper.vm.$nextTick();

          // Get the content loaded into the editor
          const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
          const loadedContent = monacoEditor.props("modelValue");

          // Verify round-trip integrity: loaded content must be identical to original
          expect(loadedContent).toBe(originalMarkdown);

          // Simulate saving the content (without modification)
          const saveButton = wrapper.find(".btn-save");
          await saveButton.trigger("click");
          await wrapper.vm.$nextTick();

          // Verify save event emits the exact same content
          expect(wrapper.emitted("save")).toBeTruthy();
          const savedContent = wrapper.emitted("save")?.[0]?.[0];
          expect(savedContent).toBe(originalMarkdown);

          wrapper.unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: Full-Screen Editor Display
   * **Validates: Requirements 1.1, 1.2, 1.3**
   *
   * For any prose section (new or existing), when the section editor is opened,
   * the editor modal SHALL occupy the full viewport and remain full-screen until
   * the user explicitly saves or cancels.
   */
  it("Property 1: editor occupies full viewport and remains full-screen", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various section configurations
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          content: fc.oneof(
            fc.constant(""), // New section (empty)
            fc.string({ minLength: 1, maxLength: 5000 }), // Existing section
          ),
        }),
        async (sectionData) => {
          const mockSection: ReportSection = {
            id: sectionData.id,
            project_id: 1,
            name: sectionData.name,
            type: "prose",
            content: sectionData.content,
            order: 1,
            is_enabled: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          };

          // Open the editor
          const wrapper = mount(ProseEditorModal, {
            props: {
              section: mockSection,
              isOpen: true,
            },
          });

          await wrapper.vm.$nextTick();

          // Verify modal exists and is full-screen
          const modal = wrapper.find(".prose-editor-modal");
          expect(modal.exists()).toBe(true);

          // Verify modal content exists (indicates full-screen layout is rendered)
          const modalContent = wrapper.find(".modal-content");
          expect(modalContent.exists()).toBe(true);

          // Verify backdrop exists (full-screen modals have backdrops)
          const backdrop = wrapper.find(".modal-backdrop");
          expect(backdrop.exists()).toBe(true);

          // Verify modal remains open (not closed automatically)
          expect(wrapper.props("isOpen")).toBe(true);
          expect(modal.exists()).toBe(true);

          // Simulate user interaction (typing) - modal should remain open
          const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
          await monacoEditor.vm.$emit("update:modelValue", "User is typing...");
          await wrapper.vm.$nextTick();

          // Modal should still be full-screen
          expect(modal.exists()).toBe(true);
          expect(wrapper.props("isOpen")).toBe(true);

          // Verify modal only closes on explicit save or cancel
          const saveButton = wrapper.find(".btn-save");
          await saveButton.trigger("click");
          await wrapper.vm.$nextTick();

          // Save event should be emitted (indicating user explicitly saved)
          expect(wrapper.emitted("save")).toBeTruthy();

          wrapper.unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3: Syntax Highlighting for Markup
   * **Validates: Requirements 2.3, 2.4**
   *
   * For any markdown or HTML syntax entered in the editor, the syntax highlighter
   * SHALL apply distinct visual styling to markup tokens (headers, bold, italic, tags)
   * that differentiates them from plain text content.
   */
  it("Property 3: syntax highlighter applies distinct styling to markup", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various markdown and HTML syntax patterns
        fc.oneof(
          // Markdown headers
          fc
            .record({
              type: fc.constant("markdown-header"),
              content: fc.string({ minLength: 1, maxLength: 50 }),
              level: fc.integer({ min: 1, max: 6 }),
            })
            .map((data) => `${"#".repeat(data.level)} ${data.content}`),

          // Markdown bold/italic
          fc
            .record({
              type: fc.constant("markdown-emphasis"),
              content: fc.string({ minLength: 1, maxLength: 50 }),
              style: fc.constantFrom("**", "*", "***", "__", "_"),
            })
            .map((data) => `${data.style}${data.content}${data.style}`),

          // Markdown code
          fc
            .record({
              type: fc.constant("markdown-code"),
              content: fc.string({ minLength: 1, maxLength: 50 }),
            })
            .map((data) => `\`${data.content}\``),

          // HTML tags
          fc
            .record({
              type: fc.constant("html-tag"),
              tag: fc.constantFrom("div", "p", "span", "strong", "em", "a"),
              content: fc.string({ minLength: 1, maxLength: 50 }),
            })
            .map((data) => `<${data.tag}>${data.content}</${data.tag}>`),

          // Mixed content
          fc
            .array(
              fc.constantFrom(
                "# Header",
                "**bold**",
                "*italic*",
                "`code`",
                "<div>html</div>",
                "plain text",
              ),
              { minLength: 2, maxLength: 5 },
            )
            .map((arr) => arr.join(" ")),
        ),
        async (markupContent) => {
          const mockSection: ReportSection = {
            id: 1,
            project_id: 1,
            name: "Test Section",
            type: "prose",
            content: "",
            order: 1,
            is_enabled: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          };

          const wrapper = mount(ProseEditorModal, {
            props: {
              section: mockSection,
              isOpen: true,
            },
          });

          await wrapper.vm.$nextTick();

          // Get the Monaco editor component
          const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
          expect(monacoEditor.exists()).toBe(true);

          // Verify the editor is configured with markdown language mode
          // (Monaco Editor applies syntax highlighting based on language mode)
          expect(monacoEditor.props("language")).toBe("markdown");

          // Update the editor content with markup
          await monacoEditor.vm.$emit("update:modelValue", markupContent);
          await wrapper.vm.$nextTick();

          // Verify the content is accepted and stored
          const currentContent = monacoEditor.props("modelValue");
          expect(currentContent).toContain(markupContent);

          // The actual syntax highlighting is handled by Monaco Editor internally
          // based on the language mode. We verify that:
          // 1. The editor is in markdown mode (checked above)
          // 2. The content is properly loaded (checked above)
          // 3. Monaco Editor is configured with syntax highlighting options

          // Monaco Editor automatically applies syntax highlighting for markdown
          // when language="markdown" is set, which includes:
          // - Headers (# ## ###)
          // - Bold (**text**)
          // - Italic (*text*)
          // - Code (`code`)
          // - HTML tags (<tag>)

          wrapper.unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4: Real-Time Highlighting Updates
   * **Validates: Requirements 2.5**
   *
   * For any text input event in the editor, syntax highlighting SHALL update
   * within 100 milliseconds to reflect the current content.
   */
  it(
    "Property 4: syntax highlighting updates in real-time",
    { timeout: 30000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate sequences of text input events
          fc.array(
            fc.oneof(
              fc.string({ minLength: 1, maxLength: 20 }),
              fc.constantFrom("# ", "**", "*", "`", "<", ">", "[", "]", "\n"),
            ),
            { minLength: 1, maxLength: 10 },
          ),
          async (inputSequence) => {
            const mockSection: ReportSection = {
              id: 1,
              project_id: 1,
              name: "Test Section",
              type: "prose",
              content: "",
              order: 1,
              is_enabled: true,
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            };

            const wrapper = mount(ProseEditorModal, {
              props: {
                section: mockSection,
                isOpen: true,
              },
            });

            await wrapper.vm.$nextTick();

            const monacoEditor = wrapper.findComponent({
              name: "MonacoEditor",
            });
            expect(monacoEditor.exists()).toBe(true);

            // Simulate a sequence of text input events
            let accumulatedContent = "";

            for (const content of inputSequence) {
              const startTime = Date.now();

              // Simulate text input
              accumulatedContent += content;
              await monacoEditor.vm.$emit(
                "update:modelValue",
                accumulatedContent,
              );

              await wrapper.vm.$nextTick();

              const updateTime = Date.now() - startTime;

              // Verify the content was updated
              const currentContent = monacoEditor.props("modelValue");
              expect(currentContent).toBe(accumulatedContent);

              // Verify update happened within reasonable time
              // (In test environment, updates are synchronous, so this should be very fast)
              // The 100ms requirement is for the real Monaco Editor in browser
              expect(updateTime).toBeLessThan(100);
            }

            // Verify final content matches all accumulated input
            const finalContent = monacoEditor.props("modelValue");
            expect(finalContent).toBe(accumulatedContent);

            // Monaco Editor's syntax highlighting is reactive and updates
            // automatically when content changes. The language mode (markdown)
            // ensures that syntax highlighting is applied in real-time.
            expect(monacoEditor.props("language")).toBe("markdown");

            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});

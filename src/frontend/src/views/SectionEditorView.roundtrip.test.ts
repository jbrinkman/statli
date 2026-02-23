import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import fc from "fast-check";
import SectionEditorView from "./SectionEditorView.vue";
import type { ReportSection } from "../composables/useReports";

// Mock MonacoEditor component
vi.mock("../components/MonacoEditor.vue", () => ({
  default: {
    name: "MonacoEditor",
    template:
      '<div class="mock-monaco-editor"><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
    props: ["modelValue", "language", "theme", "placeholder"],
    emits: ["update:modelValue"],
  },
}));

// Mock useReports composable
const mockGetReportSection = vi.fn();
const mockUpdateReportSection = vi.fn();

vi.mock("../composables/useReports", () => ({
  useReports: () => ({
    getReportSection: mockGetReportSection,
    updateReportSection: mockUpdateReportSection,
  }),
}));

describe("SectionEditorView - Property 4: Prose Content Round-Trip Preservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  /**
   * Property 4: Prose Content Round-Trip Preservation
   * **Validates: Requirements 2.6**
   *
   * For any valid prose content, the sequence of editing → saving → re-opening
   * the section should preserve the content exactly.
   */
  it("Property 4: prose content round-trip preserves content exactly", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate diverse prose content strings
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
        async (originalContent) => {
          // Step 1: Create a mock section with the original content
          const mockSection: ReportSection = {
            id: 1,
            project_id: 1,
            name: "Test Section",
            type: "prose",
            content: originalContent,
            order: 1,
            is_enabled: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          };

          // Mock the getReportSection to return our section
          mockGetReportSection.mockResolvedValue(mockSection);

          // Step 2: Mount the editor (simulating "opening the section for editing")
          const wrapper = mount(SectionEditorView, {
            props: {
              sectionId: 1,
            },
          });

          // Wait for the component to load the section data
          await wrapper.vm.$nextTick();
          await new Promise((resolve) => setTimeout(resolve, 0));

          // Verify the section loaded correctly
          expect(mockGetReportSection).toHaveBeenCalledWith(1);

          // Step 3: Get the content loaded into the editor
          const monacoEditor = wrapper.findComponent({ name: "MonacoEditor" });
          expect(monacoEditor.exists()).toBe(true);

          const loadedContent = monacoEditor.props("modelValue");

          // Verify the content was loaded exactly as stored
          expect(loadedContent).toBe(originalContent);

          // Step 4: Simulate editing by modifying the content
          const editedContent = originalContent + " [edited]";
          await monacoEditor.vm.$emit("update:modelValue", editedContent);
          await wrapper.vm.$nextTick();

          // Verify the editor reflects the edited content
          expect(monacoEditor.props("modelValue")).toBe(editedContent);

          // Step 5: Save the changes
          mockUpdateReportSection.mockResolvedValue(undefined);

          const saveButton = wrapper.find(".btn-save");
          await saveButton.trigger("click");
          await wrapper.vm.$nextTick();

          // Verify save was called with the edited content
          expect(mockUpdateReportSection).toHaveBeenCalledWith(
            expect.objectContaining({
              id: 1,
              content: editedContent,
            }),
          );

          // Step 6: Re-open the section (simulating navigation back and re-opening)
          wrapper.unmount();

          // Update the mock to return the saved content
          const savedSection: ReportSection = {
            ...mockSection,
            content: editedContent,
          };
          mockGetReportSection.mockResolvedValue(savedSection);

          // Mount a new instance (simulating re-opening)
          const wrapper2 = mount(SectionEditorView, {
            props: {
              sectionId: 1,
            },
          });

          await wrapper2.vm.$nextTick();
          await new Promise((resolve) => setTimeout(resolve, 0));

          // Step 7: Verify the content was preserved exactly through the round-trip
          const monacoEditor2 = wrapper2.findComponent({
            name: "MonacoEditor",
          });
          expect(monacoEditor2.exists()).toBe(true);

          const reopenedContent = monacoEditor2.props("modelValue");

          // Critical assertion: content must be identical after round-trip
          expect(reopenedContent).toBe(editedContent);

          wrapper2.unmount();
        },
      ),
      { numRuns: 100 },
    );
  });
});

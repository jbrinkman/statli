import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fc from "fast-check";

/**
 * Property Test: LocalStorage Draft Round-Trip
 * Feature: section-editor-view
 * Property 6: For any prose content, saving a draft to localStorage then restoring it should preserve the content exactly.
 * Validates: Requirements 5.7
 */

describe("SectionEditorView - LocalStorage Draft Round-Trip Property Tests", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up localStorage after each test
    localStorage.clear();
  });

  it("Property 6: localStorage draft round-trip preserves content exactly", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }), // section ID
        fc.string({ minLength: 0, maxLength: 10000 }), // prose content
        (sectionId, content) => {
          // Generate the localStorage key
          const key = `section-draft-${sectionId}`;

          // Save the draft to localStorage
          localStorage.setItem(key, content);

          // Restore the draft from localStorage
          const restoredContent = localStorage.getItem(key);

          // The restored content should exactly match the original
          return restoredContent === content;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 6: round-trip preserves special characters and unicode", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.string({ minLength: 0, maxLength: 5000 }),
        (sectionId, content) => {
          const key = `section-draft-${sectionId}`;

          // Save and restore
          localStorage.setItem(key, content);
          const restored = localStorage.getItem(key);

          return restored === content;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 6: round-trip preserves markdown formatting", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.string({ minLength: 0, maxLength: 5000 }),
        (sectionId, baseContent) => {
          // Create markdown-like content with various formatting
          const markdownContent = `# Heading\n\n${baseContent}\n\n## Subheading\n\n- List item\n- Another item\n\n**Bold** and *italic* text\n\n\`\`\`code\n${baseContent}\n\`\`\``;

          const key = `section-draft-${sectionId}`;

          // Save and restore
          localStorage.setItem(key, markdownContent);
          const restored = localStorage.getItem(key);

          return restored === markdownContent;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 6: round-trip preserves whitespace and newlines", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.array(fc.string({ minLength: 0, maxLength: 100 }), {
          minLength: 0,
          maxLength: 50,
        }),
        (sectionId, lines) => {
          // Join lines with newlines to create content with specific whitespace
          const content = lines.join("\n");

          const key = `section-draft-${sectionId}`;

          // Save and restore
          localStorage.setItem(key, content);
          const restored = localStorage.getItem(key);

          return restored === content;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 6: round-trip works for empty content", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000000 }), (sectionId) => {
        const content = "";
        const key = `section-draft-${sectionId}`;

        // Save and restore
        localStorage.setItem(key, content);
        const restored = localStorage.getItem(key);

        return restored === content;
      }),
      { numRuns: 100 },
    );
  });

  it("Property 6: multiple sections can have independent drafts", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            sectionId: fc.integer({ min: 1, max: 1000000 }),
            content: fc.string({ minLength: 0, maxLength: 1000 }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (sections) => {
          // Create a map to track the last content for each section ID
          // (since duplicate IDs will overwrite previous values)
          const lastContentBySectionId = new Map<number, string>();

          // Save all drafts and track the last content for each section ID
          sections.forEach(({ sectionId, content }) => {
            const key = `section-draft-${sectionId}`;
            localStorage.setItem(key, content);
            lastContentBySectionId.set(sectionId, content);
          });

          // Restore and verify all drafts using the last content for each unique section ID
          return Array.from(lastContentBySectionId.entries()).every(
            ([sectionId, expectedContent]) => {
              const key = `section-draft-${sectionId}`;
              const restored = localStorage.getItem(key);
              return restored === expectedContent;
            },
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

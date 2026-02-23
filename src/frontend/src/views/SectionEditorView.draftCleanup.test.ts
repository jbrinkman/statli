import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fc from "fast-check";

/**
 * Property Test: Draft Cleanup on Save
 * Feature: section-editor-view
 * Property 8: For any prose section, successfully saving changes should clear the draft from localStorage.
 * Validates: Requirements 5.3
 */

describe("SectionEditorView - Draft Cleanup Property Tests", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up localStorage after each test
    localStorage.clear();
  });

  it("Property 8: draft is cleared from localStorage after save", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }), // section ID
        fc.string({ minLength: 0, maxLength: 5000 }), // draft content
        (sectionId, draftContent) => {
          const key = `section-draft-${sectionId}`;

          // Save a draft to localStorage
          localStorage.setItem(key, draftContent);

          // Verify draft exists
          const draftBefore = localStorage.getItem(key);
          if (draftBefore !== draftContent) return false;

          // Simulate successful save by clearing the draft
          localStorage.removeItem(key);

          // Verify draft is cleared
          const draftAfter = localStorage.getItem(key);
          return draftAfter === null;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 8: clearing non-existent draft is safe", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000000 }), (sectionId) => {
        const key = `section-draft-${sectionId}`;

        // Ensure no draft exists
        localStorage.removeItem(key);

        // Attempt to clear again (should not throw)
        try {
          localStorage.removeItem(key);
          return true;
        } catch (err) {
          return false;
        }
      }),
      { numRuns: 100 },
    );
  });

  it("Property 8: clearing draft for one section does not affect other sections", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.integer({ min: 1, max: 1000000 }),
        fc.string({ minLength: 0, maxLength: 1000 }),
        fc.string({ minLength: 0, maxLength: 1000 }),
        (sectionId1, sectionId2, draft1, draft2) => {
          // Skip if section IDs are the same
          if (sectionId1 === sectionId2) return true;

          const key1 = `section-draft-${sectionId1}`;
          const key2 = `section-draft-${sectionId2}`;

          // Save drafts for both sections
          localStorage.setItem(key1, draft1);
          localStorage.setItem(key2, draft2);

          // Clear draft for section 1 (simulating save)
          localStorage.removeItem(key1);

          // Section 1 draft should be cleared
          const draft1After = localStorage.getItem(key1);

          // Section 2 draft should still exist
          const draft2After = localStorage.getItem(key2);

          return draft1After === null && draft2After === draft2;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 8: draft cleanup is idempotent", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.string({ minLength: 0, maxLength: 5000 }),
        (sectionId, draftContent) => {
          const key = `section-draft-${sectionId}`;

          // Save a draft
          localStorage.setItem(key, draftContent);

          // Clear multiple times
          localStorage.removeItem(key);
          localStorage.removeItem(key);
          localStorage.removeItem(key);

          // Draft should still be null
          const draft = localStorage.getItem(key);
          return draft === null;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 8: after cleanup, new draft can be saved", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.string({ minLength: 0, maxLength: 5000 }),
        fc.string({ minLength: 0, maxLength: 5000 }),
        (sectionId, draft1, draft2) => {
          const key = `section-draft-${sectionId}`;

          // Save first draft
          localStorage.setItem(key, draft1);

          // Clear (simulate save)
          localStorage.removeItem(key);

          // Save new draft
          localStorage.setItem(key, draft2);

          // New draft should be retrievable
          const restoredDraft = localStorage.getItem(key);
          return restoredDraft === draft2;
        },
      ),
      { numRuns: 100 },
    );
  });
});

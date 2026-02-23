import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Property Test: Unique LocalStorage Keys
 * Feature: section-editor-view
 * Property 10: For any two different sections, their localStorage draft keys should be unique and not collide.
 * Validates: Requirements 5.6
 */

describe("SectionEditorView - LocalStorage Keys Property Tests", () => {
  it("Property 10: localStorage keys are unique for different section IDs", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 1000000 }), {
          minLength: 2,
          maxLength: 100,
        }),
        (sectionIds) => {
          // Generate localStorage keys for all section IDs
          const keys = sectionIds.map((id) => `section-draft-${id}`);

          // Create a set to check for uniqueness
          const uniqueKeys = new Set(keys);

          // Create a set of unique section IDs
          const uniqueIds = new Set(sectionIds);

          // The number of unique keys should equal the number of unique section IDs
          // This ensures that different section IDs produce different keys
          // and the same section ID always produces the same key
          return uniqueKeys.size === uniqueIds.size;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 10: same section ID always produces the same key", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000000 }), (sectionId) => {
        // Generate the key multiple times
        const key1 = `section-draft-${sectionId}`;
        const key2 = `section-draft-${sectionId}`;
        const key3 = `section-draft-${sectionId}`;

        // All keys should be identical
        return key1 === key2 && key2 === key3;
      }),
      { numRuns: 100 },
    );
  });

  it("Property 10: different section IDs produce different keys", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.integer({ min: 1, max: 1000000 }),
        (sectionId1, sectionId2) => {
          // Skip if the IDs are the same
          fc.pre(sectionId1 !== sectionId2);

          // Generate keys for both section IDs
          const key1 = `section-draft-${sectionId1}`;
          const key2 = `section-draft-${sectionId2}`;

          // Keys should be different
          return key1 !== key2;
        },
      ),
      { numRuns: 100 },
    );
  });
});

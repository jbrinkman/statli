# Implementation Plan: Section Editor View

## Overview

This implementation plan creates a full-viewport section editing experience that replaces the current dialog-based interface. The SectionEditorView component will support both prose sections (with Monaco Editor) and status sections (with task list), including auto-save, keyboard shortcuts, and unsaved changes protection.

The implementation follows the architectural pattern of TaskView.vue and reuses existing components (MonacoEditor.vue) and patterns (auto-save, unsaved changes confirmation) from ProseEditorModal.vue.

## Tasks

- [x] 1. Set up SectionEditorView component structure and routing
  - Create `src/frontend/src/views/SectionEditorView.vue` with basic Vue 3 Composition API structure
  - Add route configuration to Vue Router: `/section/:id`
  - Define component props interface and route parameter handling
  - Set up full-viewport layout (100vw x 100vh) with header and content area using flexbox
  - _Requirements: 1.1, 1.3, 9.1, 9.2_

- [ ] 2. Implement section data loading and state management
  - [x] 2.1 Create data loading logic using useReports composable
    - Load section data based on route parameter `id`
    - Store original section data for change detection
    - Handle loading states and errors
    - _Requirements: 1.4, 9.5_
  
  - [x] 2.2 Write property test for section data loading
    - **Property 1: Section Data Loading**
    - **Validates: Requirements 1.4, 9.5**
  
  - [x] 2.3 Set up reactive state for section editing
    - Create reactive refs for: section, originalSection, content, originalContent, sectionName, sectionType
    - Create reactive refs for UI state: loading, saving, error, showConfirmDialog
    - _Requirements: 1.4, 4.1, 4.2_

- [ ] 3. Build header section with metadata controls
  - [x] 3.1 Implement section name input field
    - Create editable text input bound to sectionName
    - Add proper ARIA labels for accessibility
    - Handle name change events
    - _Requirements: 4.1_
  
  - [x] 3.2 Implement section type selector
    - Create dropdown with "prose" and "status" options
    - Bind to sectionType reactive state
    - Handle type change events
    - _Requirements: 4.2, 4.3_
  
  - [x] 3.3 Add save and cancel action buttons
    - Create save button with loading state handling
    - Create cancel button
    - Disable save button during save operation
    - _Requirements: 1.5, 6.6_

- [ ] 4. Implement dynamic content area with component switching
  - [x] 4.1 Create conditional rendering for prose vs status sections
    - Use v-if to render MonacoEditor for prose sections
    - Use v-if to render task list for status sections
    - Ensure content area fills remaining viewport space
    - _Requirements: 1.3, 2.1, 3.1_
  
  - [x] 4.2 Write property test for content area component selection
    - **Property 2: Content Area Component Selection**
    - **Validates: Requirements 2.1, 3.1**
  
  - [x] 4.3 Implement section type change handler
    - Switch between MonacoEditor and task list when type changes
    - Clear/preserve content appropriately during type switch
    - _Requirements: 4.4, 4.5_
  
  - [x] 4.4 Write property test for section type change component switch
    - **Property 3: Section Type Change Component Switch**
    - **Validates: Requirements 4.4, 4.5**

- [ ] 5. Integrate MonacoEditor for prose sections
  - [x] 5.1 Add MonacoEditor component with proper configuration
    - Import and use existing MonacoEditor.vue component
    - Configure for markdown language by default
    - Bind to content reactive state with v-model
    - Fill entire content area
    - _Requirements: 2.1, 2.2, 2.4, 10.1_
  
  - [x] 5.2 Implement content change tracking
    - Handle @update:modelValue event from MonacoEditor
    - Update content state and track changes
    - _Requirements: 2.5_
  
  - [x] 5.3 Write property test for prose content round-trip preservation
    - **Property 4: Prose Content Round-Trip Preservation**
    - **Validates: Requirements 2.6**

- [x] 6. Implement task list for status sections
  - [x] 6.1 Create or identify TaskList component
    - Check if TaskList component exists, create if needed
    - Define props: sectionId, tasks
    - Define emits: task-created, task-updated, task-deleted
    - _Requirements: 3.1, 10.2_
  
  - [x] 6.2 Integrate TaskList with section editor
    - Load tasks using useTasks composable
    - Pass tasks to TaskList component
    - Handle task modification events
    - Fill entire content area
    - _Requirements: 3.2, 3.3, 3.4, 3.5_
  
  - [x] 6.3 Write property test for task display completeness
    - **Property 23: Task Display Completeness**
    - **Validates: Requirements 3.2**

- [~] 7. Checkpoint - Ensure basic editing works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement change detection mechanism
  - [~] 8.1 Create hasUnsavedChanges method
    - Compare current name with original name
    - Compare current type with original type
    - Compare current content with original content (for prose)
    - Return true if any differences exist
    - _Requirements: 2.5, 3.5, 4.6, 8.8_
  
  - [~] 8.2 Write property test for change detection accuracy
    - **Property 5: Change Detection Accuracy**
    - **Validates: Requirements 2.5, 3.5, 4.6, 8.8**

- [ ] 9. Implement localStorage auto-save for prose sections
  - [~] 9.1 Create localStorage key generation method
    - Generate unique key using section ID: `section-draft-${sectionId}`
    - _Requirements: 5.6_
  
  - [~] 9.2 Write property test for unique localStorage keys
    - **Property 10: Unique LocalStorage Keys**
    - **Validates: Requirements 5.6**
  
  - [~] 9.3 Implement draft save to localStorage
    - Create saveDraftToLocalStorage method
    - Handle localStorage errors gracefully
    - Log warnings if localStorage unavailable
    - _Requirements: 5.1, 5.5_
  
  - [~] 9.4 Implement draft restore from localStorage
    - Create restoreDraftFromLocalStorage method
    - Check for existing draft on component mount
    - Restore draft if exists, otherwise use saved content
    - _Requirements: 5.2_
  
  - [~] 9.5 Write property test for localStorage draft round-trip
    - **Property 6: LocalStorage Draft Round-Trip**
    - **Validates: Requirements 5.7**
  
  - [~] 9.6 Write property test for draft restoration on open
    - **Property 7: Draft Restoration on Open**
    - **Validates: Requirements 5.2**
  
  - [~] 9.7 Implement draft cleanup method
    - Create clearDraftFromLocalStorage method
    - Call after successful save
    - _Requirements: 5.3_
  
  - [~] 9.8 Write property test for draft cleanup on save
    - **Property 8: Draft Cleanup on Save**
    - **Validates: Requirements 5.3**
  
  - [~] 9.9 Write property test for draft preservation on cancel
    - **Property 9: Draft Preservation on Cancel**
    - **Validates: Requirements 5.4**
  
  - [~] 9.10 Implement auto-save interval
    - Create startAutoSave method with 30-second interval
    - Create stopAutoSave method to clear interval
    - Call startAutoSave on mount for prose sections
    - Call stopAutoSave on unmount
    - _Requirements: 5.1, 10.3_

- [ ] 10. Implement save operation
  - [~] 10.1 Create handleSave method
    - Set saving state to true
    - Call useReports update method with all changes
    - Clear localStorage draft on success
    - Navigate back on success
    - Handle errors and display error message
    - Set saving state to false
    - _Requirements: 6.1, 6.3, 6.5, 6.6_
  
  - [~] 10.2 Write property test for save persists all changes
    - **Property 11: Save Persists All Changes**
    - **Validates: Requirements 6.1**
  
  - [~] 10.3 Write property test for successful save navigation
    - **Property 13: Successful Save Navigation**
    - **Validates: Requirements 6.3, 9.3**
  
  - [~] 10.4 Write property test for save error handling
    - **Property 15: Save Error Handling**
    - **Validates: Requirements 6.5**
  
  - [~] 10.5 Write property test for save button disabled during save
    - **Property 16: Save Button Disabled During Save**
    - **Validates: Requirements 6.6**

- [ ] 11. Implement cancel operation with unsaved changes protection
  - [~] 11.1 Create handleCancel method
    - Check for unsaved changes using hasUnsavedChanges
    - Show confirmation dialog if changes exist
    - Navigate back immediately if no changes
    - _Requirements: 6.2, 6.4, 8.1, 8.7_
  
  - [~] 11.2 Create confirmation dialog component or logic
    - Display dialog with "Discard" and "Keep Editing" options
    - Handle "Discard" action: discard changes and navigate
    - Handle "Keep Editing" action: close dialog and stay
    - _Requirements: 8.4, 8.5, 8.6_
  
  - [~] 11.3 Write property test for cancel discards changes
    - **Property 12: Cancel Discards Changes**
    - **Validates: Requirements 6.2**
  
  - [~] 11.4 Write property test for confirmed cancel navigation
    - **Property 14: Confirmed Cancel Navigation**
    - **Validates: Requirements 6.4, 8.7**
  
  - [~] 11.5 Write property test for unsaved changes confirmation
    - **Property 19: Unsaved Changes Confirmation**
    - **Validates: Requirements 8.1, 8.2**
  
  - [~] 11.6 Write property test for discard confirmation action
    - **Property 21: Discard Confirmation Action**
    - **Validates: Requirements 8.5**
  
  - [~] 11.7 Write property test for keep editing confirmation action
    - **Property 22: Keep Editing Confirmation Action**
    - **Validates: Requirements 8.6**

- [ ] 12. Implement keyboard shortcuts
  - [~] 12.1 Create handleKeyDown method
    - Handle Ctrl+S (Cmd+S on Mac) for save
    - Handle Escape for cancel
    - Prevent default browser behavior for Ctrl+S
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [~] 12.2 Register and unregister keyboard event listeners
    - Add event listener on component mount
    - Remove event listener on component unmount
    - _Requirements: 7.4, 7.5_
  
  - [~] 12.3 Write property test for keyboard shortcut save
    - **Property 17: Keyboard Shortcut Save**
    - **Validates: Requirements 7.1, 7.3**
  
  - [~] 12.4 Write property test for keyboard shortcut cancel
    - **Property 18: Keyboard Shortcut Cancel**
    - **Validates: Requirements 7.2**

- [ ] 13. Implement navigation guard for unsaved changes
  - [~] 13.1 Add beforeRouteLeave navigation guard
    - Check for unsaved changes
    - Show confirmation dialog if changes exist
    - Allow navigation if no changes or user confirms discard
    - Block navigation if user chooses "Keep Editing"
    - _Requirements: 8.3, 9.4_
  
  - [~] 13.2 Write property test for navigation guard confirmation
    - **Property 20: Navigation Guard Confirmation**
    - **Validates: Requirements 8.3, 9.4**

- [~] 14. Checkpoint - Ensure all core functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Add styling and accessibility
  - [~] 15.1 Apply consistent styling following TaskView.vue pattern
    - Full viewport layout with flexbox
    - Header with fixed height
    - Content area fills remaining space
    - Consistent color scheme and typography
    - _Requirements: 1.1, 1.2, 1.3, 10.5_
  
  - [~] 15.2 Add accessibility features
    - ARIA labels for all interactive elements
    - Keyboard navigation support
    - Focus management for dialogs
    - Semantic HTML structure
    - _Requirements: 10.5_

- [ ] 16. Add error handling and edge cases
  - [~] 16.1 Handle backend API errors
    - Display user-friendly error messages
    - Log detailed errors to console
    - Remain in edit mode on errors
    - Preserve unsaved changes
    - _Requirements: 6.5_
  
  - [~] 16.2 Handle localStorage errors
    - Log warnings for localStorage failures
    - Disable auto-save if localStorage unavailable
    - Continue functioning normally
    - _Requirements: 5.5_
  
  - [~] 16.3 Add validation for user inputs
    - Validate section name is not empty
    - Display inline validation messages
    - Disable save button if validation fails
    - _Requirements: 4.1_

- [ ] 17. Integration and wiring
  - [~] 17.1 Update navigation triggers to use new route
    - Update section edit buttons/links to navigate to `/section/:id`
    - Ensure proper section ID is passed in route
    - _Requirements: 9.1_
  
  - [~] 17.2 Test full user flow end-to-end
    - Navigate to section editor from section list
    - Edit section metadata and content
    - Save changes and verify persistence
    - Cancel with unsaved changes and verify confirmation
    - Test keyboard shortcuts
    - Test auto-save and draft restoration
    - _Requirements: All_

- [~] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Property tests validate universal correctness properties across many generated inputs
- Unit tests (not listed as separate tasks) should be written alongside implementation
- The implementation reuses MonacoEditor.vue and patterns from ProseEditorModal.vue
- TypeScript/Vue 3 Composition API is used throughout
- All commits must follow conventional commit standards with DCO signoff
- All test tasks are REQUIRED and must be completed

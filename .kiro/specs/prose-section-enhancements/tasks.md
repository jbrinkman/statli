# Implementation Plan: Prose Section Enhancements

## Overview

This implementation plan converts the prose section enhancements design into actionable coding tasks. The feature adds a full-screen Monaco Editor for markdown/HTML editing, a markdown rendering pipeline with DOMPurify sanitization, and a master stylesheet editor for customizing prose section appearance.

The implementation uses TypeScript and Vue 3, with Monaco Editor for syntax highlighting, marked.js for markdown conversion, and fast-check for property-based testing.

## Tasks

- [x] 1. Install dependencies and configure build tools
  - Install monaco-editor, @guolao/vue-monaco-editor, vite-plugin-monaco-editor
  - Install marked, dompurify, @types/dompurify
  - Install fast-check for property-based testing
  - Configure vite-plugin-monaco-editor in vite.config.ts
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 5.5_

- [ ] 2. Create database migration for master_stylesheet column
  - [x] 2.1 Add master_stylesheet column to projects table
    - Create SQL migration file to add TEXT column with empty string default
    - _Requirements: 5.1, 5.2_
  
  - [x] 2.2 Apply migration to database
    - Execute migration against SQLite database
    - Verify column exists with correct type and default
    - _Requirements: 5.1, 5.2_

- [ ] 3. Implement backend API methods for stylesheet management
  - [x] 3.1 Implement GetProjectStylesheet method
    - Add Go method to App struct to retrieve master_stylesheet from projects table
    - Handle project not found error
    - Return empty string for projects without stylesheet
    - _Requirements: 5.2_
  
  - [x] 3.2 Implement UpdateProjectStylesheet method
    - Add Go method to App struct to update master_stylesheet in projects table
    - Validate project exists before update
    - Return error if update fails
    - _Requirements: 5.4_
  
  - [x] 3.3 Write unit tests for stylesheet API methods
    - Test GetProjectStylesheet with existing and non-existing projects
    - Test UpdateProjectStylesheet with valid and invalid project IDs
    - Test empty stylesheet handling
    - _Requirements: 5.2, 5.4_

- [ ] 4. Create MonacoEditor.vue reusable component
  - [x] 4.1 Implement MonacoEditor component with v-model support
    - Create component with props: modelValue, language, placeholder, readonly, theme
    - Integrate @guolao/vue-monaco-editor
    - Emit update:modelValue on content change
    - Configure editor options: line numbers, minimap, auto-indentation
    - Support markdown, html, and css language modes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.5_
  
  - [x] 4.2 Write unit tests for MonacoEditor component
    - Test component renders with correct language mode
    - Test v-model binding updates on content change
    - Test readonly mode disables editing
    - Test theme prop applies correct editor theme
    - Test placeholder display when empty
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 5. Create ProseEditorModal.vue full-screen editor
  - [x] 5.1 Implement ProseEditorModal component structure
    - Create full-screen modal overlay with dark backdrop
    - Add header with section name and action buttons (Save, Cancel)
    - Integrate MonacoEditor component with markdown language mode
    - Implement save and cancel event emitters
    - Add keyboard shortcuts: Ctrl+S to save, Escape to cancel
    - Implement unsaved changes confirmation dialog
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 5.2 Implement auto-save to localStorage
    - Save draft to localStorage every 30 seconds
    - Restore draft on editor open if available
    - Clear draft on successful save
    - Handle localStorage errors gracefully
    - _Requirements: 1.3, 6.1, 6.2_
  
  - [~] 5.3 Write unit tests for ProseEditorModal
    - Test modal renders full-screen when opened
    - Test save button emits save event with content
    - Test cancel button emits cancel event
    - Test keyboard shortcuts (Ctrl+S, Escape)
    - Test unsaved changes confirmation dialog
    - Test auto-save functionality
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [~] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Create RenderedProseSection.vue markdown renderer
  - [~] 7.1 Implement RenderedProseSection component
    - Create component with props: section, stylesheet
    - Convert markdown to HTML using marked.js with HTML passthrough enabled
    - Sanitize HTML with DOMPurify to prevent XSS
    - Apply stylesheet via scoped style injection
    - Handle empty content gracefully
    - Display error message on rendering failure
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [~] 7.2 Write property test for markdown-to-HTML conversion
    - **Property 6: Markdown-to-HTML Conversion**
    - **Validates: Requirements 4.1, 4.2**
    - Generate random valid markdown strings
    - Verify conversion produces valid HTML
    - Check output is non-empty for non-empty input
    - Run 100 iterations minimum
  
  - [~] 7.3 Write property test for HTML passthrough preservation
    - **Property 7: HTML Passthrough Preservation**
    - **Validates: Requirements 4.3**
    - Generate markdown with embedded HTML tags (div, span, a, img)
    - Verify HTML tags appear unchanged in rendered output
    - Test with various HTML elements
    - Run 100 iterations minimum
  
  - [~] 7.4 Write unit tests for RenderedProseSection
    - Test markdown renders as HTML
    - Test stylesheet is applied to rendered content
    - Test empty content handling
    - Test HTML sanitization removes script tags
    - Test error handling for malformed markdown
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 8. Create StylesheetEditor.vue CSS editor
  - [~] 8.1 Implement StylesheetEditor component
    - Create full-screen or modal editor for CSS
    - Integrate MonacoEditor component with css language mode
    - Load current stylesheet on open using GetProjectStylesheet
    - Implement save and cancel event emitters
    - Add CSS validation and error reporting
    - Provide default stylesheet template option
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6_
  
  - [~] 8.2 Write property test for CSS input acceptance
    - **Property 10: CSS Input Acceptance**
    - **Validates: Requirements 5.3**
    - Generate random valid CSS strings
    - Verify stylesheet editor accepts and stores without modification
    - Run 100 iterations minimum
  
  - [~] 8.3 Write unit tests for StylesheetEditor
    - Test editor loads current stylesheet on open
    - Test save button calls UpdateProjectStylesheet
    - Test CSS validation displays errors for invalid syntax
    - Test default template option
    - Test cancel button discards changes
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6_

- [ ] 9. Modify TaskView.vue to integrate ProseEditorModal
  - [~] 9.1 Add ProseEditorModal integration to TaskView
    - Replace inline textarea with "Edit" button for prose sections
    - Add state: showProseEditor, editingProseSection
    - Implement handleEditProseSection to open modal
    - Implement handleProseSave to update section content
    - Implement handleProseCancel to close modal
    - Refresh section list after save
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 6.1_
  
  - [~] 9.2 Write property test for markdown input acceptance
    - **Property 2: Markdown and HTML Input Acceptance**
    - **Validates: Requirements 2.1, 2.2**
    - Generate random markdown and HTML strings with special characters, unicode, long strings
    - Verify editor accepts and stores without modification
    - Run 100 iterations minimum
  
  - [~] 9.3 Write integration tests for TaskView + ProseEditorModal
    - Test opening editor loads section content
    - Test saving editor updates section in list
    - Test canceling editor discards changes
    - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2_

- [~] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Modify ReportView.vue to integrate RenderedProseSection
  - [~] 11.1 Add RenderedProseSection integration to ReportView
    - Add state: masterStylesheet
    - Implement loadMasterStylesheet method using GetProjectStylesheet
    - Replace raw markdown display with RenderedProseSection component
    - Pass stylesheet to prose section renderers
    - Load stylesheet on component mount
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.4_
  
  - [~] 11.2 Write property test for stylesheet application
    - **Property 8: Stylesheet Application to Rendered Content**
    - **Validates: Requirements 4.4**
    - Generate random CSS rules
    - Apply to rendered prose section
    - Verify styles are reflected in DOM
    - Run 100 iterations minimum
  
  - [~] 11.3 Write integration tests for ReportView + RenderedProseSection
    - Test prose sections render as HTML
    - Test stylesheet is applied to all prose sections
    - Test updating stylesheet refreshes rendered sections
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.4_

- [ ] 12. Implement stylesheet editor access point
  - [~] 12.1 Add stylesheet editor to ProjectView or create SettingsView
    - Add "Edit Stylesheet" button or menu item
    - Integrate StylesheetEditor component
    - Handle opening/closing editor
    - Refresh report view after stylesheet save
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [~] 12.2 Write property test for stylesheet updates propagation
    - **Property 11: Stylesheet Updates Propagate to Rendered Sections**
    - **Validates: Requirements 5.4**
    - Update master stylesheet
    - Verify all prose sections reflect new styles on next render
    - Run 100 iterations minimum
  
  - [~] 12.3 Write unit tests for stylesheet editor integration
    - Test opening stylesheet editor loads current CSS
    - Test saving stylesheet updates project
    - Test canceling stylesheet editor discards changes
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 13. Implement comprehensive property-based tests
  - [~] 13.1 Write property test for markdown round-trip integrity
    - **Property 14: Markdown Round-Trip Integrity**
    - **Validates: Requirements 6.1, 6.2, 6.3**
    - Generate random markdown strings (1-10000 chars)
    - Save to prose section, reload for editing
    - Verify content is identical (most critical property)
    - Run 100 iterations minimum
  
  - [~] 13.2 Write property test for full-screen editor display
    - **Property 1: Full-Screen Editor Display**
    - **Validates: Requirements 1.1, 1.2, 1.3**
    - Open editor for new and existing sections
    - Verify modal occupies full viewport
    - Verify remains full-screen until save/cancel
    - Run 100 iterations minimum
  
  - [~] 13.3 Write property test for syntax highlighting
    - **Property 3: Syntax Highlighting for Markup**
    - **Validates: Requirements 2.3, 2.4**
    - Generate markdown/HTML with various syntax tokens
    - Verify syntax highlighter applies distinct styling
    - Check headers, bold, italic, tags are differentiated from plain text
    - Run 100 iterations minimum
  
  - [~] 13.4 Write property test for real-time highlighting updates
    - **Property 4: Real-Time Highlighting Updates**
    - **Validates: Requirements 2.5**
    - Simulate text input events
    - Verify syntax highlighting updates within 100ms
    - Run 100 iterations minimum

- [ ] 14. Add error handling and edge case tests
  - [~] 14.1 Write unit tests for error conditions
    - Test failed section content load
    - Test failed section save
    - Test auto-save failure (localStorage full)
    - Test markdown parsing error
    - Test HTML sanitization removes dangerous content
    - Test stylesheet loading error
    - Test failed stylesheet save
    - Test CSS validation error
    - Test backend unavailable
    - Test database error
    - _Requirements: All_
  
  - [~] 14.2 Write unit tests for edge cases
    - Test empty markdown content
    - Test very long markdown content (> 100KB)
    - Test markdown with only whitespace
    - Test HTML with script tags (sanitization)
    - Test invalid CSS syntax
    - Test empty CSS stylesheet
    - Test special characters and unicode in markdown
    - Test malformed HTML in markdown
    - _Requirements: All_

- [~] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Property-based tests use fast-check with minimum 100 iterations
- All property tests explicitly reference design document properties
- Unit tests and property tests are complementary
- Checkpoints ensure incremental validation
- Implementation uses TypeScript and Vue 3
- Monaco Editor provides syntax highlighting for markdown, HTML, and CSS
- marked.js handles markdown-to-HTML conversion with HTML passthrough
- DOMPurify sanitizes HTML to prevent XSS attacks

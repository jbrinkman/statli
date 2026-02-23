# Requirements Document

## Introduction

The Section Editor View feature provides a full-viewport editing experience for report sections, replacing the current dialog-based interface. This feature enables users to edit section metadata and content with maximum screen space, supporting both prose sections (with Monaco Editor for markdown/HTML) and status sections (with task list interface). The view includes auto-save functionality, keyboard shortcuts, and unsaved changes protection.

## Glossary

- **Section_Editor_View**: The full-viewport component that provides the editing interface for report sections
- **Prose_Section**: A report section with type "prose" containing markdown or HTML content
- **Status_Section**: A report section with type "status" containing a task list
- **Section_Metadata**: The name and type properties of a report section
- **Content_Area**: The main editing region that displays either Monaco Editor or task list based on section type
- **Auto_Save**: Automatic periodic saving of prose content to localStorage
- **Draft**: Unsaved content stored in localStorage for recovery
- **Monaco_Editor**: The code editor component used for editing prose content
- **Task_List**: The component displaying tasks associated with a status section
- **Navigation_Guard**: Logic that prevents navigation when unsaved changes exist

## Requirements

### Requirement 1: Full-Viewport Section Editor

**User Story:** As a user, I want to edit a section in a full-screen view so I have maximum space for content editing

#### Acceptance Criteria

1. THE Section_Editor_View SHALL occupy the entire viewport (100vw x 100vh)
2. THE Section_Editor_View SHALL display section metadata at the top of the view
3. THE Section_Editor_View SHALL allocate the remaining viewport space to the Content_Area
4. WHEN a user navigates to the Section_Editor_View, THE Section_Editor_View SHALL load the selected section data
5. THE Section_Editor_View SHALL provide save and cancel actions in the header

### Requirement 2: Prose Section Editing

**User Story:** As a user, I want to edit prose section content with Monaco Editor so I get syntax highlighting for markdown/HTML

#### Acceptance Criteria

1. WHEN a Prose_Section is being edited, THE Content_Area SHALL display the Monaco_Editor component
2. THE Monaco_Editor SHALL be configured for markdown language by default
3. THE Monaco_Editor SHALL support HTML language when the content contains HTML
4. THE Monaco_Editor SHALL fill the entire Content_Area
5. WHEN content is modified in the Monaco_Editor, THE Section_Editor_View SHALL track the changes
6. FOR ALL valid prose content, editing then saving then re-opening SHALL preserve the content exactly (round-trip property)

### Requirement 3: Status Section Editing

**User Story:** As a user, I want to edit status sections with a task list interface so I can manage section tasks effectively

#### Acceptance Criteria

1. WHEN a Status_Section is being edited, THE Content_Area SHALL display the Task_List component
2. THE Task_List SHALL display all tasks associated with the section
3. THE Task_List SHALL fill the entire Content_Area
4. THE Task_List SHALL support task creation, editing, and deletion operations
5. WHEN tasks are modified, THE Section_Editor_View SHALL track the changes

### Requirement 4: Section Metadata Editing

**User Story:** As a user, I want to edit section metadata (name, type) in the same view as the content

#### Acceptance Criteria

1. THE Section_Editor_View SHALL display an editable section name field in the header
2. THE Section_Editor_View SHALL display a section type selector in the header
3. THE Section_Editor_View SHALL support changing section type between "prose" and "status"
4. WHEN section type is changed from "prose" to "status", THE Section_Editor_View SHALL switch from Monaco_Editor to Task_List
5. WHEN section type is changed from "status" to "prose", THE Section_Editor_View SHALL switch from Task_List to Monaco_Editor
6. WHEN Section_Metadata is modified, THE Section_Editor_View SHALL track the changes

### Requirement 5: Auto-Save for Prose Content

**User Story:** As a user, I want auto-save for prose content so I don't lose my work

#### Acceptance Criteria

1. WHEN a Prose_Section is being edited, THE Section_Editor_View SHALL save a Draft to localStorage every 30 seconds
2. WHEN the Section_Editor_View is opened for a Prose_Section, THE Section_Editor_View SHALL restore the Draft from localStorage if one exists
3. WHEN prose content is successfully saved, THE Section_Editor_View SHALL clear the Draft from localStorage
4. WHEN the user cancels editing, THE Section_Editor_View SHALL preserve the Draft in localStorage
5. IF localStorage is unavailable, THEN THE Section_Editor_View SHALL disable auto-save and continue functioning
6. THE Section_Editor_View SHALL generate a unique localStorage key for each section using the section ID
7. FOR ALL prose content, saving a draft then restoring SHALL preserve the content exactly (round-trip property)

### Requirement 6: Save and Cancel Operations

**User Story:** As a user, I want to save or cancel my edits with clear feedback

#### Acceptance Criteria

1. WHEN the save button is clicked, THE Section_Editor_View SHALL persist all changes to the backend
2. WHEN the cancel button is clicked, THE Section_Editor_View SHALL discard all changes
3. WHEN save is successful, THE Section_Editor_View SHALL navigate back to the previous view
4. WHEN cancel is confirmed, THE Section_Editor_View SHALL navigate back to the previous view
5. WHEN save fails, THE Section_Editor_View SHALL display an error message and remain in edit mode
6. THE Section_Editor_View SHALL disable the save button while a save operation is in progress

### Requirement 7: Keyboard Shortcuts

**User Story:** As a user, I want keyboard shortcuts for common operations (save, cancel) so I can work efficiently

#### Acceptance Criteria

1. WHEN Ctrl+S (or Cmd+S on Mac) is pressed, THE Section_Editor_View SHALL trigger the save operation
2. WHEN Escape is pressed, THE Section_Editor_View SHALL trigger the cancel operation
3. THE Section_Editor_View SHALL prevent the browser's default save behavior when Ctrl+S is pressed
4. THE Section_Editor_View SHALL register keyboard event listeners when the view is mounted
5. THE Section_Editor_View SHALL unregister keyboard event listeners when the view is unmounted

### Requirement 8: Unsaved Changes Warning

**User Story:** As a user, I want to be warned about unsaved changes when navigating away so I don't lose my work

#### Acceptance Criteria

1. WHEN the cancel button is clicked AND changes exist, THE Section_Editor_View SHALL display a confirmation dialog
2. WHEN the Escape key is pressed AND changes exist, THE Section_Editor_View SHALL display a confirmation dialog
3. WHEN the user attempts to navigate away AND changes exist, THE Navigation_Guard SHALL display a confirmation dialog
4. THE confirmation dialog SHALL offer "Discard" and "Keep Editing" options
5. WHEN "Discard" is selected, THE Section_Editor_View SHALL discard changes and navigate away
6. WHEN "Keep Editing" is selected, THE Section_Editor_View SHALL close the dialog and remain in edit mode
7. WHEN no changes exist, THE Section_Editor_View SHALL navigate away without showing a confirmation dialog
8. FOR ALL editing sessions, the change detection SHALL correctly identify when content differs from the original (invariant property)

### Requirement 9: Navigation Integration

**User Story:** As a user, I want to navigate to the section editor from the section list and return when done

#### Acceptance Criteria

1. WHEN a section edit action is triggered, THE application SHALL navigate to the Section_Editor_View with the section ID
2. THE Section_Editor_View SHALL use Vue Router for navigation
3. WHEN save or cancel is completed, THE Section_Editor_View SHALL navigate back to the previous view
4. THE Section_Editor_View SHALL support browser back button navigation with unsaved changes protection
5. THE Section_Editor_View SHALL load section data based on the route parameter

### Requirement 10: Component Reuse

**User Story:** As a developer, I want to reuse existing components to maintain consistency and reduce code duplication

#### Acceptance Criteria

1. THE Section_Editor_View SHALL use the existing MonacoEditor.vue component for prose editing
2. THE Section_Editor_View SHALL use the existing Task_List component for status section editing
3. THE Section_Editor_View SHALL reuse the auto-save logic pattern from ProseEditorModal.vue
4. THE Section_Editor_View SHALL reuse the unsaved changes confirmation pattern from ProseEditorModal.vue
5. THE Section_Editor_View SHALL maintain consistent styling with existing editor components

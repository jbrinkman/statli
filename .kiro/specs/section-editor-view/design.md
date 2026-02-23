# Design Document: Section Editor View

## Overview

The Section Editor View is a full-viewport Vue component that provides a dedicated editing interface for report sections. It replaces the current dialog-based ProseEditorModal with a full-screen experience that maximizes editing space and improves the user experience for both prose and status sections.

The view follows the same architectural pattern as TaskView.vue, occupying the entire viewport with a header containing metadata controls and actions, and a content area that adapts based on section type. For prose sections, the content area displays the Monaco Editor for markdown/HTML editing. For status sections, it displays a task list interface.

Key features include:

- Full-viewport layout with header and content area
- Section metadata editing (name, type)
- Dynamic content area based on section type
- Auto-save for prose content with localStorage drafts
- Unsaved changes protection with confirmation dialogs
- Keyboard shortcuts (Ctrl+S to save, Escape to cancel)
- Vue Router integration for navigation

## Architecture

### Component Structure

```
SectionEditorView.vue (Full-viewport view component)
├── Header Section
│   ├── Section Name Input (editable text field)
│   ├── Section Type Selector (dropdown: prose/status)
│   └── Action Buttons (Save, Cancel)
└── Content Area (dynamic based on section type)
    ├── MonacoEditor.vue (for prose sections)
    └── TaskList component (for status sections)
```

### Data Flow

1. **Route Navigation**: User navigates to `/section/:id` route
2. **Data Loading**: Component loads section data from backend via `useReports` composable
3. **Draft Restoration**: For prose sections, check localStorage for existing draft
4. **User Editing**: User modifies section metadata or content
5. **Change Tracking**: Component tracks all changes for unsaved changes detection
6. **Auto-Save**: For prose sections, save draft to localStorage every 30 seconds
7. **Save Operation**: User saves changes, persisting to backend and clearing draft
8. **Navigation**: After save/cancel, navigate back to previous view

### State Management

The component maintains the following local state:

- `section`: Current section data (ReportSection)
- `originalSection`: Original section data for change detection
- `content`: Current prose content (for prose sections)
- `originalContent`: Original prose content for change detection
- `sectionName`: Current section name
- `sectionType`: Current section type ('prose' | 'status')
- `loading`: Loading state for async operations
- `saving`: Saving state to disable save button
- `error`: Error message for display
- `showConfirmDialog`: Whether to show unsaved changes dialog
- `autoSaveIntervalId`: Timer ID for auto-save interval

## Components and Interfaces

### SectionEditorView.vue

**Props**: None (uses route parameters)

**Route Parameters**:

- `id`: Section ID (number)

**Emits**: None (uses Vue Router for navigation)

**Key Methods**:

- `loadSection(id: number)`: Load section data from backend
- `handleSave()`: Save all changes to backend
- `handleCancel()`: Cancel editing with unsaved changes check
- `handleNameChange(name: string)`: Update section name
- `handleTypeChange(type: string)`: Update section type and switch content area
- `handleContentChange(content: string)`: Update prose content
- `hasUnsavedChanges()`: Check if any changes exist
- `saveDraftToLocalStorage()`: Save prose draft to localStorage
- `restoreDraftFromLocalStorage()`: Restore prose draft from localStorage
- `clearDraftFromLocalStorage()`: Clear prose draft from localStorage
- `getLocalStorageKey()`: Generate unique localStorage key for section
- `startAutoSave()`: Start auto-save interval for prose sections
- `stopAutoSave()`: Stop auto-save interval
- `handleKeyDown(event: KeyboardEvent)`: Handle keyboard shortcuts
- `confirmDiscard()`: Confirm discarding unsaved changes

**Composables Used**:

- `useReports()`: For section CRUD operations
- `useTasks()`: For loading tasks in status sections
- `useRouter()`: For navigation
- `useRoute()`: For accessing route parameters

### MonacoEditor.vue (Existing Component)

**Props**:

- `modelValue`: string (content)
- `language`: 'markdown' | 'html' | 'css'
- `placeholder`: string (optional)
- `readonly`: boolean (optional)
- `theme`: 'vs' | 'vs-dark' | 'hc-black' (optional)

**Emits**:

- `update:modelValue`: Emitted when content changes

### TaskList Component (To Be Created or Identified)

The design assumes a TaskList component exists or will be created to display tasks for status sections. If it doesn't exist, we'll need to create a simple task list display component.

**Props**:

- `sectionId`: number
- `tasks`: Task[]

**Emits**:

- `task-created`: Emitted when a task is created
- `task-updated`: Emitted when a task is updated
- `task-deleted`: Emitted when a task is deleted

## Data Models

### ReportSection (from useReports.ts)

```typescript
interface ReportSection {
  id: number;
  project_id: number;
  name: string;
  type: string; // "prose" or "status"
  content: string;
  order: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}
```

### Task (from useTasks.ts)

```typescript
interface Task {
  id: number;
  project_id: number;
  report_section_id: number;
  name: string;
  status: string;
  expected_completion_date: string | null;
  url: string;
  notes: string;
  priority: number;
  is_deleted: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}
```

### LocalStorage Draft Format

```typescript
// Key: `section-draft-${sectionId}`
// Value: string (prose content)
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Before writing the correctness properties, let me review the prework analysis to identify and eliminate redundancy:

**Redundancy Analysis**:

1. Properties 2.1 and 3.1 (conditional rendering based on section type) can be combined into a single comprehensive property about content area rendering
2. Properties 4.4 and 4.5 (type change triggering component switch) are essentially the same bidirectional property and can be combined
3. Properties 6.1, 6.3, and 9.3 all relate to save operation behavior and navigation - these are distinct enough to keep separate
4. Properties 8.1 and 8.2 (cancel/escape with changes showing dialog) can be combined into one property about unsaved changes triggering confirmation
5. Properties 7.4 and 7.5 (listener registration/cleanup) are lifecycle examples that should remain separate

**Properties to Combine**:

- 2.1 + 3.1 → Single property: Content area displays correct component based on section type
- 4.4 + 4.5 → Single property: Type changes trigger correct component switch
- 8.1 + 8.2 → Single property: Cancel actions with changes trigger confirmation

After reflection, we'll write consolidated properties that eliminate redundancy while maintaining comprehensive coverage.

### Property 1: Section Data Loading

*For any* valid section ID in the route parameters, navigating to the Section Editor View should load and display the correct section data from the backend.

**Validates: Requirements 1.4, 9.5**

### Property 2: Content Area Component Selection

*For any* section, the content area should display the Monaco Editor when section type is "prose" and the Task List when section type is "status".

**Validates: Requirements 2.1, 3.1**

### Property 3: Section Type Change Component Switch

*For any* section being edited, changing the section type should immediately switch the content area to display the appropriate component (Monaco Editor for prose, Task List for status).

**Validates: Requirements 4.4, 4.5**

### Property 4: Prose Content Round-Trip Preservation

*For any* valid prose content, the sequence of editing → saving → re-opening the section should preserve the content exactly.

**Validates: Requirements 2.6**

### Property 5: Change Detection Accuracy

*For any* editing session, the change detection mechanism should correctly identify when current state (name, type, or content) differs from the original state.

**Validates: Requirements 2.5, 3.5, 4.6, 8.8**

### Property 6: LocalStorage Draft Round-Trip

*For any* prose content, saving a draft to localStorage then restoring it should preserve the content exactly.

**Validates: Requirements 5.7**

### Property 7: Draft Restoration on Open

*For any* prose section with an existing draft in localStorage, opening the section editor should restore the draft content instead of the saved content.

**Validates: Requirements 5.2**

### Property 8: Draft Cleanup on Save

*For any* prose section, successfully saving changes should clear the draft from localStorage.

**Validates: Requirements 5.3**

### Property 9: Draft Preservation on Cancel

*For any* prose section, canceling edits should preserve the draft in localStorage for future recovery.

**Validates: Requirements 5.4**

### Property 10: Unique LocalStorage Keys

*For any* two different sections, their localStorage draft keys should be unique and not collide.

**Validates: Requirements 5.6**

### Property 11: Save Persists All Changes

*For any* section with modified name, type, or content, clicking save should persist all changes to the backend via the update API.

**Validates: Requirements 6.1**

### Property 12: Cancel Discards Changes

*For any* section with modifications, confirming cancel should revert all changes and return to the original state.

**Validates: Requirements 6.2**

### Property 13: Successful Save Navigation

*For any* section, when save completes successfully, the view should navigate back to the previous view.

**Validates: Requirements 6.3, 9.3**

### Property 14: Confirmed Cancel Navigation

*For any* section, when cancel is confirmed (or no changes exist), the view should navigate back to the previous view.

**Validates: Requirements 6.4, 8.7**

### Property 15: Save Error Handling

*For any* section, when save fails, the view should display an error message and remain in edit mode without navigating away.

**Validates: Requirements 6.5**

### Property 16: Save Button Disabled During Save

*For any* section, while a save operation is in progress, the save button should be disabled to prevent duplicate submissions.

**Validates: Requirements 6.6**

### Property 17: Keyboard Shortcut Save

*For any* section being edited, pressing Ctrl+S (or Cmd+S on Mac) should trigger the save operation and prevent the browser's default save behavior.

**Validates: Requirements 7.1, 7.3**

### Property 18: Keyboard Shortcut Cancel

*For any* section being edited, pressing Escape should trigger the cancel operation.

**Validates: Requirements 7.2**

### Property 19: Unsaved Changes Confirmation

*For any* section with unsaved changes, attempting to cancel (via button or Escape key) should display a confirmation dialog before allowing navigation.

**Validates: Requirements 8.1, 8.2**

### Property 20: Navigation Guard Confirmation

*For any* section with unsaved changes, attempting to navigate away (including browser back button) should display a confirmation dialog.

**Validates: Requirements 8.3, 9.4**

### Property 21: Discard Confirmation Action

*For any* section with unsaved changes showing the confirmation dialog, selecting "Discard" should discard all changes and navigate away.

**Validates: Requirements 8.5**

### Property 22: Keep Editing Confirmation Action

*For any* section with unsaved changes showing the confirmation dialog, selecting "Keep Editing" should close the dialog and remain in edit mode without navigation.

**Validates: Requirements 8.6**

### Property 23: Task Display Completeness

*For any* status section, the task list should display all non-deleted tasks associated with that section.

**Validates: Requirements 3.2**

## Error Handling

### Backend API Errors

When backend API calls fail (section loading, saving), the component should:

1. Display a user-friendly error message in the UI
2. Log the detailed error to the console for debugging
3. Remain in edit mode to allow the user to retry
4. Not lose any unsaved changes

### LocalStorage Errors

When localStorage operations fail (quota exceeded, privacy mode, etc.):

1. Log a warning to the console
2. Disable auto-save functionality
3. Continue functioning normally for editing
4. Allow manual save to backend

### Navigation Errors

When navigation fails or is blocked:

1. Log the error to the console
2. Display an error message to the user
3. Remain in the current view
4. Allow the user to retry the action

### Validation Errors

When user input is invalid:

1. Display inline validation messages
2. Disable the save button until validation passes
3. Highlight invalid fields
4. Provide clear guidance on how to fix the issue

## Testing Strategy

### Unit Testing

Unit tests will verify specific behaviors and edge cases:

1. **Component Rendering**:
   - Section metadata displays correctly in header
   - Save and cancel buttons are present
   - Monaco Editor renders for prose sections
   - Task List renders for status sections

2. **User Interactions**:
   - Section name input updates state
   - Section type selector updates state and switches components
   - Save button triggers save operation
   - Cancel button triggers cancel operation with confirmation if needed

3. **LocalStorage Operations**:
   - Draft saves to localStorage with correct key
   - Draft restores from localStorage on mount
   - Draft clears after successful save
   - Draft persists after cancel
   - Graceful handling when localStorage is unavailable

4. **Keyboard Shortcuts**:
   - Ctrl+S triggers save
   - Escape triggers cancel
   - Event listeners register on mount
   - Event listeners unregister on unmount

5. **Error Handling**:
   - Save errors display message and stay in edit mode
   - Load errors display message
   - LocalStorage errors don't break functionality

### Property-Based Testing

Property-based tests will use a PBT library (fast-check for JavaScript/TypeScript) to verify universal properties across many generated inputs. Each test will run a minimum of 100 iterations.

**Test Configuration**:

- Library: fast-check
- Minimum iterations: 100 per property
- Each test tagged with: `Feature: section-editor-view, Property {number}: {property_text}`

**Property Tests to Implement**:

1. **Property 1: Section Data Loading** - Generate random section IDs and verify correct data loads
2. **Property 2: Content Area Component Selection** - Generate sections with different types and verify correct component renders
3. **Property 3: Section Type Change Component Switch** - Generate type changes and verify component switches
4. **Property 4: Prose Content Round-Trip Preservation** - Generate random prose content and verify edit-save-reload preserves it
5. **Property 5: Change Detection Accuracy** - Generate random edits and verify change detection is accurate
6. **Property 6: LocalStorage Draft Round-Trip** - Generate random content and verify localStorage round-trip
7. **Property 7: Draft Restoration on Open** - Generate drafts and verify restoration
8. **Property 8: Draft Cleanup on Save** - Verify drafts clear after save
9. **Property 9: Draft Preservation on Cancel** - Verify drafts persist after cancel
10. **Property 10: Unique LocalStorage Keys** - Generate multiple sections and verify unique keys
11. **Property 11: Save Persists All Changes** - Generate random changes and verify save persists them
12. **Property 12: Cancel Discards Changes** - Generate random changes and verify cancel discards them
13. **Property 13: Successful Save Navigation** - Verify save triggers navigation
14. **Property 14: Confirmed Cancel Navigation** - Verify cancel triggers navigation
15. **Property 15: Save Error Handling** - Generate save errors and verify error handling
16. **Property 16: Save Button Disabled During Save** - Verify button state during async save
17. **Property 17: Keyboard Shortcut Save** - Verify Ctrl+S triggers save
18. **Property 18: Keyboard Shortcut Cancel** - Verify Escape triggers cancel
19. **Property 19: Unsaved Changes Confirmation** - Generate changes and verify confirmation dialog
20. **Property 20: Navigation Guard Confirmation** - Verify navigation guard with changes
21. **Property 21: Discard Confirmation Action** - Verify discard action
22. **Property 22: Keep Editing Confirmation Action** - Verify keep editing action
23. **Property 23: Task Display Completeness** - Generate task lists and verify all display

### Integration Testing

Integration tests will verify the component works correctly with:

- Vue Router for navigation
- useReports composable for backend API calls
- useTasks composable for task data
- MonacoEditor component for prose editing
- Browser localStorage API

### Testing Balance

We'll maintain a balanced approach:

- Unit tests focus on specific examples, edge cases, and error conditions
- Property tests provide comprehensive coverage across many inputs
- Integration tests verify component interactions
- Together, they ensure both concrete correctness and general correctness

## Implementation Notes

### Vue Router Integration

The component will be registered as a route in the Vue Router configuration:

```typescript
{
  path: '/section/:id',
  name: 'SectionEditor',
  component: SectionEditorView,
  props: true
}
```

Navigation guard for unsaved changes:

```typescript
beforeRouteLeave(to, from, next) {
  if (this.hasUnsavedChanges()) {
    this.showConfirmDialog = true;
    this.pendingNavigation = next;
  } else {
    next();
  }
}
```

### Auto-Save Implementation

Auto-save will use a 30-second interval:

```typescript
startAutoSave() {
  if (this.autoSaveIntervalId) {
    clearInterval(this.autoSaveIntervalId);
  }
  
  this.autoSaveIntervalId = setInterval(() => {
    if (this.sectionType === 'prose') {
      this.saveDraftToLocalStorage();
    }
  }, 30000); // 30 seconds
}
```

### Change Detection

Change detection will compare current state with original state:

```typescript
hasUnsavedChanges(): boolean {
  if (this.sectionName !== this.originalSection.name) return true;
  if (this.sectionType !== this.originalSection.type) return true;
  if (this.sectionType === 'prose' && this.content !== this.originalContent) return true;
  return false;
}
```

### LocalStorage Key Generation

Keys will be unique per section:

```typescript
getLocalStorageKey(): string {
  return `section-draft-${this.section.id}`;
}
```

### Component Lifecycle

1. **onMounted**:
   - Load section data from route parameter
   - Restore draft from localStorage (if prose section)
   - Start auto-save (if prose section)
   - Register keyboard event listeners

2. **onUnmounted**:
   - Stop auto-save
   - Unregister keyboard event listeners

3. **beforeRouteLeave**:
   - Check for unsaved changes
   - Show confirmation dialog if needed

### Styling Approach

The component will follow the same styling patterns as TaskView.vue:

- Full viewport layout (100vw x 100vh)
- Flexbox for header and content area
- Header with fixed height, content area fills remaining space
- Consistent color scheme and typography
- Responsive design considerations

### Accessibility

The component will include:

- Proper ARIA labels for all interactive elements
- Keyboard navigation support
- Focus management for dialogs
- Screen reader announcements for state changes
- Semantic HTML structure

## Dependencies

### Existing Components

- MonacoEditor.vue (already exists)
- TaskList component (needs to be identified or created)

### Composables

- useReports (already exists)
- useTasks (already exists)
- useRouter (Vue Router)
- useRoute (Vue Router)

### External Libraries

- Vue 3
- Vue Router
- @guolao/vue-monaco-editor (already in use)
- fast-check (for property-based testing)

## Migration from ProseEditorModal

The new SectionEditorView will replace ProseEditorModal for section editing. The migration path:

1. Create SectionEditorView component with full functionality
2. Add route to Vue Router configuration
3. Update section edit triggers to navigate to new route instead of opening modal
4. Keep ProseEditorModal temporarily for backward compatibility
5. Remove ProseEditorModal after confirming new view works correctly

Key differences from ProseEditorModal:

- Full viewport instead of modal overlay
- Supports both prose and status sections
- Includes section metadata editing
- Uses Vue Router for navigation instead of modal open/close
- Same auto-save and unsaved changes patterns (reused logic)

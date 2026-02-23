# Design Document: Prose Section Enhancements

## Overview

This design enhances the prose section editing and rendering capabilities in the report system. The current implementation provides basic text editing through a simple textarea component. This enhancement introduces a full-screen markdown/HTML editor with syntax highlighting, a master stylesheet editor for consistent styling, and proper markdown rendering in the report view.

The design focuses on three main areas:

1. **Enhanced Section Editor**: A full-screen editing experience with syntax highlighting for markdown and HTML, replacing the current inline textarea
2. **Markdown Rendering Pipeline**: Converting markdown to HTML in the report view while preserving embedded HTML and applying custom styles
3. **Master Stylesheet Management**: A dedicated CSS editor for customizing the visual appearance of all rendered prose sections

### Key Design Decisions

- Use Monaco Editor for syntax highlighting (VS Code's editor, familiar UX, rich features)
- Use marked.js for markdown-to-HTML conversion (lightweight, widely adopted, supports HTML passthrough)
- Implement full-screen editor as a modal overlay to maximize editing space
- Store raw markdown in the database, render to HTML only in report view
- Apply master stylesheet via scoped CSS injection in rendered content

## Architecture

### Component Structure

```
TaskView.vue
├── ProseEditorModal.vue (new)
│   ├── MonacoEditor.vue (new)
│   └── EditorToolbar.vue (new)
└── (existing section management)

ReportView.vue
├── ReportPreview.vue (existing)
│   └── RenderedProseSection.vue (new)
└── (existing report controls)

SettingsView.vue (new) or integrated into ProjectView
└── StylesheetEditor.vue (new)
    └── MonacoEditor.vue (reused)
```

### Data Flow

1. **Editing Flow**:
   - User clicks "Edit" on prose section in TaskView
   - ProseEditorModal opens full-screen with current markdown content
   - User edits markdown/HTML with syntax highlighting
   - On save, raw markdown is stored in `report_sections.content`
   - Modal closes, section list refreshes

2. **Rendering Flow**:
   - ReportView loads report sections
   - For each prose section, RenderedProseSection component:
     - Fetches raw markdown from section.content
     - Converts markdown to HTML using marked.js
     - Fetches master stylesheet from project settings
     - Injects stylesheet and renders HTML in isolated container
   - User sees formatted content, not raw markdown

3. **Stylesheet Management Flow**:
   - User opens stylesheet editor (from project settings or dedicated view)
   - StylesheetEditor loads current CSS from project configuration
   - User edits CSS with syntax highlighting
   - On save, CSS is stored in project settings or dedicated table
   - All rendered prose sections automatically use updated stylesheet

### Database Schema Changes

No new tables required. Existing schema supports the feature:

- `report_sections.content`: Already stores text content (will store raw markdown)
- `projects` table: Can add optional `master_stylesheet` TEXT column for CSS storage
  - Alternative: Create new `project_settings` table with key-value pairs

Recommended approach: Add `master_stylesheet` column to `projects` table for simplicity.

```sql
ALTER TABLE projects ADD COLUMN master_stylesheet TEXT DEFAULT '';
```

### External Dependencies

1. **Monaco Editor** (`monaco-editor`, `@guolao/vue-monaco-editor`, `vite-plugin-monaco-editor`)
   - VS Code's editor with Vue 3 integration
   - Provides syntax highlighting for markdown, HTML, and CSS
   - Rich features: IntelliSense, multi-cursor, find/replace, minimap
   - Excellent accessibility and keyboard navigation
   - Familiar UX for developers

2. **marked.js** (`marked`)
   - Markdown-to-HTML converter
   - Supports HTML passthrough (preserves embedded HTML tags)
   - Lightweight and fast

3. **DOMPurify** (`dompurify`)
   - Sanitizes HTML to prevent XSS attacks
   - Essential for safely rendering user-provided HTML

## Components and Interfaces

### ProseEditorModal.vue (New Component)

Full-screen modal for editing prose section content with markdown/HTML syntax highlighting.

**Props:**

- `section: ReportSection` - The prose section being edited
- `isOpen: boolean` - Controls modal visibility

**Emits:**

- `save: (content: string) => void` - Emitted when user saves changes
- `cancel: () => void` - Emitted when user cancels editing

**Key Features:**

- Full viewport overlay with dark backdrop
- Header with section name and action buttons (Save, Cancel)
- Monaco editor with markdown/HTML syntax highlighting
- Keyboard shortcuts: Ctrl+S to save, Escape to cancel
- Auto-save draft to localStorage every 30 seconds

**Interface:**

```typescript
interface ProseEditorModalProps {
  section: ReportSection;
  isOpen: boolean;
}

interface ProseEditorModalEmits {
  save: (content: string) => void;
  cancel: () => void;
}
```

### MonacoEditor.vue (New Component)

Reusable wrapper for Monaco Editor with configurable language support.

**Props:**

- `modelValue: string` - Editor content (v-model support)
- `language: 'markdown' | 'html' | 'css'` - Syntax highlighting mode
- `placeholder?: string` - Placeholder text
- `readonly?: boolean` - Read-only mode
- `theme?: 'vs' | 'vs-dark' | 'hc-black'` - Editor theme (default: 'vs')

**Emits:**

- `update:modelValue: (value: string) => void` - Content change event

**Key Features:**

- Monaco Editor integration with Vue 3 reactivity via `@guolao/vue-monaco-editor`
- Configurable language modes (markdown, HTML, CSS)
- Line numbers, minimap, and syntax highlighting
- Auto-indentation, bracket matching, and multi-cursor editing
- Find/replace functionality built-in
- Accessible keyboard navigation and screen reader support
- IntelliSense for CSS (property suggestions)

**Interface:**

```typescript
interface MonacoEditorProps {
  modelValue: string;
  language: 'markdown' | 'html' | 'css';
  placeholder?: string;
  readonly?: boolean;
  theme?: 'vs' | 'vs-dark' | 'hc-black';
}

interface MonacoEditorEmits {
  'update:modelValue': (value: string) => void;
}
```

### RenderedProseSection.vue (New Component)

Renders markdown content as HTML with applied stylesheet in report view.

**Props:**

- `section: ReportSection` - The prose section to render
- `stylesheet: string` - CSS stylesheet to apply

**Key Features:**

- Converts markdown to HTML using marked.js
- Sanitizes HTML with DOMPurify to prevent XSS
- Applies master stylesheet via scoped style injection
- Preserves embedded HTML tags from markdown
- Responsive rendering with proper typography

**Interface:**

```typescript
interface RenderedProseSectionProps {
  section: ReportSection;
  stylesheet: string;
}
```

### StylesheetEditor.vue (New Component)

Dedicated editor for the master stylesheet with CSS syntax highlighting.

**Props:**

- `projectId: number` - Project to edit stylesheet for
- `isOpen: boolean` - Controls modal/dialog visibility

**Emits:**

- `save: (css: string) => void` - Emitted when user saves stylesheet
- `cancel: () => void` - Emitted when user cancels editing

**Key Features:**

- Full-screen or modal editor for CSS
- Monaco editor with CSS syntax highlighting and IntelliSense
- Live preview of rendered prose sections (optional)
- CSS validation and error reporting
- Default stylesheet template for new projects

**Interface:**

```typescript
interface StylesheetEditorProps {
  projectId: number;
  isOpen: boolean;
}

interface StylesheetEditorEmits {
  save: (css: string) => void;
  cancel: () => void;
}
```

### Modified Components

#### TaskView.vue (Modifications)

**Changes:**

- Replace inline textarea for prose sections with "Edit" button
- Add ProseEditorModal component
- Handle opening/closing editor modal
- Update section content on save

**New State:**

```typescript
const showProseEditor = ref(false);
const editingProseSection = ref<ReportSection | null>(null);
```

**New Methods:**

```typescript
const handleEditProseSection = (section: ReportSection) => {
  editingProseSection.value = section;
  showProseEditor.value = true;
};

const handleProseSave = async (content: string) => {
  if (!editingProseSection.value) return;
  
  await updateReportSection({
    ...editingProseSection.value,
    content: content
  });
  
  showProseEditor.value = false;
  editingProseSection.value = null;
  await loadReportSections(project.id);
};

const handleProseCancel = () => {
  showProseEditor.value = false;
  editingProseSection.value = null;
};
```

#### ReportView.vue (Modifications)

**Changes:**

- Replace raw markdown display with RenderedProseSection component
- Load master stylesheet from project settings
- Pass stylesheet to prose section renderers

**New State:**

```typescript
const masterStylesheet = ref<string>('');
```

**New Methods:**

```typescript
const loadMasterStylesheet = async () => {
  const app = (window as any).go?.main?.App;
  if (app && typeof app.GetProjectStylesheet === 'function') {
    masterStylesheet.value = await app.GetProjectStylesheet(project.id);
  }
};
```

#### ReportPreview.vue (Modifications)

**Changes:**

- Detect prose sections in report
- Render prose sections using RenderedProseSection component
- Pass master stylesheet to prose renderers

### Backend API Extensions

New Go methods needed in `App` struct:

```go
// GetProjectStylesheet retrieves the master stylesheet for a project
func (a *App) GetProjectStylesheet(projectID int) (string, error)

// UpdateProjectStylesheet updates the master stylesheet for a project
func (a *App) UpdateProjectStylesheet(projectID int, css string) error
```

## Data Models

### ReportSection (Existing, No Changes)

```typescript
interface ReportSection {
  id: number;
  project_id: number;
  name: string;
  type: string; // "prose" or "status"
  content: string; // Stores raw markdown for prose sections
  order: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}
```

**Usage Notes:**

- For prose sections, `content` field stores raw markdown/HTML
- Content is stored as-is, no preprocessing
- Rendering to HTML happens only in ReportView

### Project (Modified)

```typescript
interface Project {
  id: number;
  name: string;
  description: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  master_stylesheet?: string; // NEW: CSS stylesheet for prose rendering
}
```

**Database Migration:**

```sql
ALTER TABLE projects ADD COLUMN master_stylesheet TEXT DEFAULT '';
```

**Default Stylesheet:**

```css
/* Default master stylesheet for prose sections */
.prose-content {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #202124;
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.prose-content h1 {
  font-size: 2rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: #202124;
}

.prose-content h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: #202124;
}

.prose-content h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  color: #202124;
}

.prose-content p {
  margin-bottom: 1rem;
}

.prose-content ul, .prose-content ol {
  margin-bottom: 1rem;
  padding-left: 2rem;
}

.prose-content li {
  margin-bottom: 0.5rem;
}

.prose-content code {
  background-color: #f1f3f4;
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.875em;
}

.prose-content pre {
  background-color: #f1f3f4;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  margin-bottom: 1rem;
}

.prose-content pre code {
  background-color: transparent;
  padding: 0;
}

.prose-content blockquote {
  border-left: 4px solid #e0e0e0;
  padding-left: 1rem;
  margin-left: 0;
  margin-bottom: 1rem;
  color: #5f6368;
  font-style: italic;
}

.prose-content a {
  color: #1a73e8;
  text-decoration: none;
}

.prose-content a:hover {
  text-decoration: underline;
}

.prose-content table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

.prose-content th, .prose-content td {
  border: 1px solid #e0e0e0;
  padding: 0.5rem;
  text-align: left;
}

.prose-content th {
  background-color: #f8f9fa;
  font-weight: 600;
}
```

### EditorState (Local Component State)

```typescript
interface EditorState {
  content: string;
  isDirty: boolean;
  lastSaved: Date | null;
  autoSaveEnabled: boolean;
}
```

Used internally by ProseEditorModal to track editing state and auto-save.

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property Reflection

After analyzing all acceptance criteria, I identified several redundancies:

- **Properties 1.1 and 1.2** (full viewport for create vs edit): Both test the same behavior since create and edit use the same editor component. Combined into Property 1.
- **Properties 2.1 and 2.2** (accepting markdown vs HTML): Both test input acceptance. Combined into Property 2.
- **Properties 2.3 and 2.4** (syntax highlighting for markdown vs HTML): Both test syntax highlighting behavior. Combined into Property 3.
- **Properties 6.1 and 6.2** (storing markdown and loading markdown): Both are subsumed by the round-trip property 6.3, which validates the complete save-load cycle.

### Property 1: Full-Screen Editor Display

*For any* prose section (new or existing), when the section editor is opened, the editor modal SHALL occupy the full viewport and remain full-screen until the user explicitly saves or cancels.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Markdown and HTML Input Acceptance

*For any* valid markdown or HTML string, the section editor SHALL accept the input and store it without modification or rejection.

**Validates: Requirements 2.1, 2.2**

### Property 3: Syntax Highlighting for Markup

*For any* markdown or HTML syntax entered in the editor, the syntax highlighter SHALL apply distinct visual styling to markup tokens (headers, bold, italic, tags) that differentiates them from plain text content.

**Validates: Requirements 2.3, 2.4**

### Property 4: Real-Time Highlighting Updates

*For any* text input event in the editor, syntax highlighting SHALL update within 100 milliseconds to reflect the current content.

**Validates: Requirements 2.5**

### Property 5: Left-Aligned Form Labels

*For all* form labels in the section editor, the labels SHALL have left text alignment and be positioned either above or to the left of their corresponding input fields.

**Validates: Requirements 3.1, 3.2**

### Property 6: Markdown-to-HTML Conversion

*For any* prose section with markdown content displayed in Report_View, the markdown renderer SHALL convert the markdown to valid HTML and display the rendered output in the DOM.

**Validates: Requirements 4.1, 4.2**

### Property 7: HTML Passthrough Preservation

*For any* markdown content containing embedded HTML tags, the markdown renderer SHALL preserve those HTML tags unchanged in the rendered output (HTML passthrough).

**Validates: Requirements 4.3**

### Property 8: Stylesheet Application to Rendered Content

*For any* rendered prose section in Report_View, the master stylesheet SHALL be applied to the HTML content, resulting in styled elements that reflect the CSS rules.

**Validates: Requirements 4.4**

### Property 9: Stylesheet Editor Loads Current CSS

*For any* project with an existing master stylesheet, opening the stylesheet editor SHALL display the current CSS content in the editor.

**Validates: Requirements 5.2**

### Property 10: CSS Input Acceptance

*For any* valid CSS string, the stylesheet editor SHALL accept the input and allow it to be saved.

**Validates: Requirements 5.3**

### Property 11: Stylesheet Updates Propagate to Rendered Sections

*For any* project, when the master stylesheet is updated and saved, all prose sections rendered in Report_View SHALL reflect the new styles on the next render.

**Validates: Requirements 5.4**

### Property 12: CSS Syntax Highlighting

*For any* CSS syntax entered in the stylesheet editor, the syntax highlighter SHALL apply distinct visual styling to CSS tokens (selectors, properties, values) that differentiates them from plain text.

**Validates: Requirements 5.5**

### Property 13: Invalid CSS Validation

*For any* invalid CSS input in the stylesheet editor, the system SHALL detect the invalid syntax and display a validation error message to the user.

**Validates: Requirements 5.6**

### Property 14: Markdown Round-Trip Integrity

*For any* valid markdown content, saving the content to a prose section and then reopening that section for editing SHALL produce identical markdown text (round-trip property).

**Validates: Requirements 6.1, 6.2, 6.3**

## Error Handling

### Editor Errors

1. **Failed to Load Section Content**
   - Scenario: Backend fails to retrieve section data
   - Handling: Display error message in modal, disable save button, provide retry option
   - User Action: Retry loading or cancel and return to section list

2. **Failed to Save Section Content**
   - Scenario: Backend fails to persist updated content
   - Handling: Display error message, keep editor open with unsaved content, provide retry option
   - User Action: Retry save, copy content to clipboard, or cancel (with confirmation)

3. **Auto-Save Failure**
   - Scenario: localStorage is full or unavailable
   - Handling: Log warning, disable auto-save, notify user that auto-save is unavailable
   - User Action: Continue editing, manual save still available

### Rendering Errors

1. **Markdown Parsing Error**
   - Scenario: marked.js encounters malformed markdown (rare, as marked is permissive)
   - Handling: Catch exception, display raw markdown with error notice
   - User Action: Edit section to fix markdown syntax

2. **HTML Sanitization Removes Content**
   - Scenario: DOMPurify removes potentially dangerous HTML
   - Handling: Log sanitization actions, display sanitized HTML, show warning if content was modified
   - User Action: Review rendered output, edit section if needed

3. **Stylesheet Loading Error**
   - Scenario: Failed to load master stylesheet from backend
   - Handling: Use default stylesheet as fallback, log error, display warning
   - User Action: Check project settings, retry loading report

### Stylesheet Editor Errors

1. **Failed to Load Stylesheet**
   - Scenario: Backend fails to retrieve project stylesheet
   - Handling: Display error message, load empty editor with default template option
   - User Action: Retry loading or start with default template

2. **Failed to Save Stylesheet**
   - Scenario: Backend fails to persist CSS
   - Handling: Display error message, keep editor open with unsaved CSS, provide retry option
   - User Action: Retry save, copy CSS to clipboard, or cancel

3. **CSS Validation Error**
   - Scenario: User enters invalid CSS syntax
   - Handling: Display inline error messages with line numbers, prevent save until fixed
   - User Action: Fix CSS syntax errors or revert to previous valid CSS

### Network and Backend Errors

1. **Backend Unavailable**
    - Scenario: Wails runtime or Go backend is not responding
    - Handling: Display "Backend unavailable" error, disable all save operations
    - User Action: Restart application

2. **Database Error**
    - Scenario: SQLite database is locked or corrupted
    - Handling: Display database error message, suggest application restart
    - User Action: Restart application, check database file integrity

### User Input Validation

1. **Empty Content Warning**
    - Scenario: User attempts to save prose section with empty content
    - Handling: Show confirmation dialog: "Save empty section?"
    - User Action: Confirm save or cancel to continue editing

2. **Unsaved Changes Warning**
    - Scenario: User attempts to close editor with unsaved changes
    - Handling: Show confirmation dialog: "Discard unsaved changes?"
    - User Action: Confirm discard, cancel to continue editing, or save changes

### Error Recovery Strategies

- **Graceful Degradation**: If Monaco Editor fails to load, fall back to plain textarea
- **Retry Logic**: Provide explicit retry buttons for failed backend operations
- **Data Preservation**: Keep unsaved content in memory/localStorage to prevent data loss
- **User Feedback**: Always inform users of errors with clear, actionable messages
- **Logging**: Log all errors to console for debugging

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, component integration, and error conditions
- **Property-based tests**: Verify universal properties across randomized inputs

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs and validate specific scenarios, while property-based tests verify general correctness across a wide range of inputs.

### Property-Based Testing

**Library Selection**: Use **fast-check** for JavaScript/TypeScript property-based testing

- Mature, well-maintained library for JavaScript
- Excellent TypeScript support
- Integrates with Vitest (current test framework)
- Provides arbitraries for strings, objects, and custom generators

**Configuration**:

- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `Feature: prose-section-enhancements, Property {number}: {property_text}`

**Property Test Coverage**:

1. **Property 2: Markdown and HTML Input Acceptance**
   - Generate random markdown and HTML strings
   - Verify editor accepts and stores without modification
   - Test with special characters, unicode, long strings

2. **Property 6: Markdown-to-HTML Conversion**
   - Generate random valid markdown
   - Verify conversion produces valid HTML
   - Check that output is non-empty for non-empty input

3. **Property 7: HTML Passthrough Preservation**
   - Generate markdown with embedded HTML tags
   - Verify HTML tags appear unchanged in rendered output
   - Test with various HTML elements (div, span, a, img, etc.)

4. **Property 10: CSS Input Acceptance**
   - Generate random valid CSS strings
   - Verify stylesheet editor accepts and stores without modification

5. **Property 14: Markdown Round-Trip Integrity**
   - Generate random markdown strings
   - Save to section, reload for editing
   - Verify content is identical (round-trip property)
   - This is the most critical property for data integrity

**Example Property Test Structure**:

```typescript
import { test } from 'vitest';
import fc from 'fast-check';

// Feature: prose-section-enhancements, Property 14: Markdown Round-Trip Integrity
test('markdown round-trip preserves content', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 10000 }),
      async (markdown) => {
        // Save markdown to section
        const section = await saveProseSection(markdown);
        
        // Reload section for editing
        const reloaded = await loadProseSection(section.id);
        
        // Verify content is identical
        expect(reloaded.content).toBe(markdown);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing

**Component Testing**:

1. **ProseEditorModal.vue**
   - Renders full-screen when opened
   - Displays section name in header
   - Emits save event with content on save button click
   - Emits cancel event on cancel button click
   - Shows confirmation dialog when closing with unsaved changes
   - Keyboard shortcuts work (Ctrl+S, Escape)

2. **MonacoEditor.vue**
   - Renders Monaco Editor instance
   - Applies correct language mode (markdown, HTML, CSS)
   - Updates modelValue on content change
   - Responds to external modelValue changes
   - Displays placeholder when empty
   - Readonly mode disables editing
   - Theme prop applies correct editor theme

3. **RenderedProseSection.vue**
   - Converts markdown to HTML using marked.js
   - Sanitizes HTML with DOMPurify
   - Applies stylesheet to rendered content
   - Handles empty content gracefully
   - Displays error message on rendering failure

4. **StylesheetEditor.vue**
   - Loads current stylesheet on open
   - Displays CSS in CodeMirror editor
   - Validates CSS syntax
   - Shows error messages for invalid CSS
   - Emits save event with CSS on save
   - Prevents save when CSS is invalid

**Integration Testing**:

1. **TaskView + ProseEditorModal**
   - Opening editor loads section content
   - Saving editor updates section in list
   - Canceling editor discards changes

2. **ReportView + RenderedProseSection**
   - Prose sections render as HTML
   - Stylesheet is applied to all prose sections
   - Updating stylesheet refreshes rendered sections

3. **Backend Integration**
   - GetProjectStylesheet returns correct CSS
   - UpdateProjectStylesheet persists CSS
   - UpdateReportSection saves markdown content
   - GetReportSection retrieves markdown content

**Edge Cases and Error Conditions**:

1. Empty markdown content
2. Very long markdown content (> 100KB)
3. Markdown with only whitespace
4. HTML with script tags (should be sanitized)
5. Invalid CSS syntax
6. Empty CSS stylesheet
7. Backend unavailable during save
8. Concurrent edits to same section
9. Special characters and unicode in markdown
10. Malformed HTML in markdown

**Test Organization**:

```
src/frontend/src/
├── components/
│   ├── ProseEditorModal.test.ts
│   ├── MonacoEditor.test.ts
│   ├── RenderedProseSection.test.ts
│   └── StylesheetEditor.test.ts
├── composables/
│   └── useReports.test.ts (add stylesheet methods)
└── views/
    ├── TaskView.test.ts (add prose editor tests)
    └── ReportView.test.ts (add rendering tests)
```

**Test Execution**:

- Run tests with: `npm run test` or `vitest --run`
- Property tests run with 100 iterations minimum
- All tests must pass before marking tasks complete
- Use `vitest --coverage` to ensure adequate coverage

### Manual Testing Checklist

1. Create new prose section and verify full-screen editor
2. Edit existing prose section and verify content loads
3. Type markdown with syntax highlighting
4. Type HTML with syntax highlighting
5. Save section and verify content persists
6. View report and verify markdown renders as HTML
7. Edit master stylesheet with CSS syntax highlighting
8. Save stylesheet and verify styles apply to prose sections
9. Test round-trip: save markdown, reload, verify unchanged
10. Test error handling: invalid CSS, backend errors, empty content

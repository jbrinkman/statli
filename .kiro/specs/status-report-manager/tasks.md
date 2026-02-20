# Implementation Plan: Status Report Manager

## Overview

This implementation plan breaks down the Status Report Manager into incremental, testable steps. The approach follows a bottom-up strategy: database → backend services → frontend UI → integration. Each task builds on previous work and includes validation through code execution.

## Tasks

- [x] 1. Initialize project structure and dependencies
  - Create Wails project with Go backend and Vue 3 frontend
  - Configure UnoCSS and Vite for frontend
  - Set up SQLite database connection
  - Initialize zap structured logging
  - Create directory structure (models, services, repository, components, views)
  - _Requirements: 9.1, 9.2, 10.1, 10.2, 10.7_

- [x] 2. Implement database schema and migrations
  - [x] 2.1 Create SQLite schema with all tables
    - Implement projects, report_sections, status_definitions, tasks, subtasks, report_snapshots, task_history tables
    - Add indexes for performance
    - Add foreign key constraints
    - _Requirements: 9.3, 9.4, 9.6_
  
  - [x] 2.2 Write property test for database schema integrity
    - **Property 21: Referential Integrity on Finalization**
    - **Validates: Requirements 8.13**

- [x] 3. Implement core data models
  - [x] 3.1 Create Go structs for all entities
    - Project, Task, Subtask, ReportSection, StatusDefinition, TaskHistory, ReportSnapshot models
    - Add JSON tags for Wails bindings
    - _Requirements: 9.6_
  
  - [x] 3.2 Write unit tests for model validation
    - Test struct creation and field validation
    - _Requirements: 9.6_

- [x] 4. Implement repository layer
  - [x] 4.1 Create database connection and initialization
    - Implement db.go with SQLite connection pooling
    - Add database initialization on first launch
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 4.2 Implement ProjectRepository
    - CRUD operations for projects
    - List active and archived projects
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4_
  
  - [x] 4.3 Implement TaskRepository
    - CRUD operations for tasks and subtasks
    - List tasks by section with ordering
    - Soft delete and restore operations
    - _Requirements: 3.1, 3.2, 3.18, 3.19, 3.20, 3.21, 3.22_
  
  - [x] 4.4 Implement ReportRepository
    - CRUD operations for report sections and status definitions
    - CRUD operations for report snapshots and task history
    - Query task history by snapshot
    - _Requirements: 4.6, 6.1, 6.2, 8.10, 8.11_
  
  - [x] 4.5 Write unit tests for repository operations
    - Test CRUD operations with in-memory SQLite
    - Test query methods
    - _Requirements: 9.1, 9.2_

- [x] 5. Implement template processing service
  - [x] 5.1 Create template variable replacement logic
    - Implement RenderFilename and RenderReportTitle functions
    - Support all template variables: {project-name}, {YYYY-MM-DD}, {YYYY}, {MM}, {DD}
    - _Requirements: 1.2, 1.3, 1.7, 1.8, 1.9_
  
  - [x] 5.2 Implement filename format validation
    - Validate against invalid filesystem characters
    - _Requirements: 1.10_
  
  - [x] 5.3 Write property test for template variable replacement
    - **Property 3: Template Variable Replacement Completeness**
    - **Validates: Requirements 1.7, 1.8, 1.9**
  
  - [x] 5.4 Write property test for filename validation
    - **Property 4: Filename Format Validation**
    - **Validates: Requirements 1.10**
  
  - [x] 5.5 Write unit tests for template edge cases
    - Test with missing variables, special characters, empty templates
    - _Requirements: 1.7, 1.8, 1.9, 1.10_

- [ ] 6. Implement ProjectService
  - [x] 6.1 Implement project CRUD operations
    - CreateProject, UpdateProject, GetProject
    - ListActiveProjects, ListArchivedProjects, ArchiveProject
    - Integrate template rendering and validation
    - Add structured logging with zap
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.11, 2.1, 2.2, 2.3, 2.4_
  
  - [x] 6.2 Write property test for project name validation
    - **Property 1: Project Name Validation**
    - **Validates: Requirements 1.1**
  
  - [x] 6.3 Write property test for year subfolder path construction
    - **Property 2: Year Subfolder Path Construction**
    - **Validates: Requirements 1.6**
  
  - [x] 6.4 Write unit tests for project service
    - Test project creation, archiving, listing
    - Test error handling
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement TaskService
  - [x] 8.1 Implement task CRUD operations
    - CreateTask, UpdateTask, GetTask
    - ListTasksBySection, MoveTaskToSection, ReorderTasks
    - SoftDeleteTask, RestoreTask, ArchiveTask
    - Add structured logging with zap
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.18, 3.21, 3.23_
  
  - [x] 8.2 Implement subtask CRUD operations
    - CreateSubtask, UpdateSubtask, GetSubtask
    - ListSubtasksByTask
    - SoftDeleteSubtask, SoftDeleteAllSubtasks, RestoreSubtask
    - Add structured logging with zap
    - _Requirements: 3.10, 3.11, 3.12, 3.13, 3.14, 3.15, 3.16, 3.17, 3.19, 3.20, 3.22_
  
  - [x] 8.3 Write property test for task name validation
    - **Property 5: Task Name Validation**
    - **Validates: Requirements 3.1**
  
  - [x] 8.4 Write property test for task section assignment validation
    - **Property 6: Task Section Assignment Validation**
    - **Validates: Requirements 3.2**
  
  - [x] 8.5 Write property test for soft delete and restore round-trip
    - **Property 7: Soft Delete and Restore Round-Trip**
    - **Validates: Requirements 3.18, 3.19, 3.21, 3.22**
  
  - [x] 8.6 Write unit tests for task service
    - Test task and subtask operations
    - Test move and reorder operations
    - Test error handling
    - _Requirements: 3.1, 3.2, 3.18, 3.19, 3.20, 3.21, 3.22_

- [x] 9. Implement ReportService - Part 1: Configuration
  - [x] 9.1 Implement report section CRUD operations
    - CreateReportSection, UpdateReportSection, GetReportSection
    - ListReportSections, ReorderSections
    - Add structured logging with zap
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.9_
  
  - [x] 9.2 Implement status definition CRUD operations
    - CreateStatusDefinition, UpdateStatusDefinition
    - ListStatusDefinitions
    - Add structured logging with zap
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [x] 9.3 Write unit tests for report configuration
    - Test section and status definition operations
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4_

- [x] 10. Implement ReportService - Part 2: Generation
  - [x] 10.1 Implement change detection algorithm
    - Implement detectChanges function
    - Compare current task state with last Task_History entry
    - Detect status and ECD changes only
    - _Requirements: 4.9, 7.10, 8.15_
  
  - [x] 10.2 Implement markdown rendering for tasks
    - Implement renderTasksAsMarkdown function
    - Render task name, URL, status badges, ECD
    - Render status and ECD change indicators
    - Render subtasks with proper indentation
    - _Requirements: 7.7, 7.8, 7.9_
  
  - [x] 10.3 Implement status section rendering
    - Implement renderStatusSection function
    - Filter tasks by section
    - Apply change detection
    - Render as markdown
    - _Requirements: 7.6_
  
  - [x] 10.4 Implement report generation
    - Implement GenerateReport function
    - Build recipients block, title, CSS, sections
    - Order sections by configured sequence
    - Do not create Task_History or Report_Snapshot
    - Add structured logging with zap
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.12, 8.1_
  
  - [x] 10.5 Write property test for change detection accuracy
    - **Property 10: Change Detection Accuracy**
    - **Validates: Requirements 4.9, 7.10, 8.15**
  
  - [x] 10.6 Write property test for no change highlighting on non-tracked fields
    - **Property 11: No Change Highlighting for Non-Tracked Fields**
    - **Validates: Requirements 4.10, 7.11**
  
  - [x] 10.7 Write property test for report structure completeness
    - **Property 12: Report Structure Completeness**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5**
  
  - [x] 10.8 Write property test for status section task filtering
    - **Property 13: Status Section Task Filtering**
    - **Validates: Requirements 7.6**
  
  - [x] 10.9 Write property test for status badge HTML format
    - **Property 14: Status Badge HTML Format**
    - **Validates: Requirements 7.7**
  
  - [x] 10.10 Write property test for status change rendering
    - **Property 15: Status Change Rendering**
    - **Validates: Requirements 7.8**
  
  - [x] 10.11 Write property test for ECD change rendering
    - **Property 16: ECD Change Rendering**
    - **Validates: Requirements 7.9**
  
  - [x] 10.12 Write property test for report section ordering
    - **Property 17: Report Section Ordering**
    - **Validates: Requirements 7.12**
  
  - [x] 10.13 Write property test for preview generation does not create history
    - **Property 18: Preview Generation Does Not Create History**
    - **Validates: Requirements 8.1**
  
  - [x] 10.14 Write unit tests for report generation
    - Test with various project configurations
    - Test with and without previous snapshots
    - Test edge cases (empty sections, no tasks)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12_

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement ReportService - Part 3: Finalization
  - [x] 12.1 Implement report finalization
    - Implement FinalizeReport function
    - Create Report_Snapshot with markdown content and timestamp
    - Capture Task_History for all non-deleted, non-archived tasks and subtasks
    - Link all records to project and snapshot
    - Add structured logging with zap
    - _Requirements: 4.6, 4.7, 4.8, 8.10, 8.11, 8.12, 8.13_
  
  - [x] 12.2 Implement snapshot retrieval
    - GetReportSnapshot, ListReportSnapshots
    - _Requirements: 8.14_
  
  - [x] 12.3 Write property test for task history capture completeness
    - **Property 8: Task History Capture Completeness**
    - **Validates: Requirements 4.6, 4.8, 8.11**
  
  - [x] 12.4 Write property test for task history timestamp presence
    - **Property 9: Task History Timestamp Presence**
    - **Validates: Requirements 4.7, 8.12**
  
  - [x] 12.5 Write property test for snapshot creation on finalization
    - **Property 20: Snapshot Creation on Finalization**
    - **Validates: Requirements 8.10**
  
  - [~] 12.6 Write unit tests for report finalization
    - Test snapshot creation
    - Test task history capture
    - Test with various project states
    - _Requirements: 4.6, 4.7, 4.8, 8.10, 8.11, 8.12, 8.13_

- [ ] 13. Implement ExportService
  - [~] 13.1 Implement file export functionality
    - Implement ExportToFile function
    - Handle file path creation (including year subfolders)
    - Write markdown content to file
    - Add structured logging with zap
    - _Requirements: 8.2, 8.4, 8.5, 8.6_
  
  - [~] 13.2 Implement suggested filepath generation
    - Implement GetSuggestedFilepath function
    - Use project's filename format template
    - Apply year subfolder logic if enabled
    - _Requirements: 1.6, 8.3, 8.4_
  
  - [~] 13.3 Implement clipboard functionality
    - Implement CopyToClipboard function
    - _Requirements: 12.11_
  
  - [~] 13.4 Write property test for file export round-trip
    - **Property 19: File Export Round-Trip**
    - **Validates: Requirements 8.6**
  
  - [~] 13.5 Write unit tests for export service
    - Test file export to various paths
    - Test year subfolder creation
    - Test clipboard operations
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 12.11_

- [ ] 14. Implement Wails application bindings
  - [~] 14.1 Create Wails app struct and bindings
    - Expose ProjectService, TaskService, ReportService, ExportService to frontend
    - Initialize services with dependencies
    - Set up structured logging
    - _Requirements: 10.4_
  
  - [~] 14.2 Write integration tests for Wails bindings
    - Test frontend-backend communication
    - Test error propagation
    - _Requirements: 10.4_

- [~] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Implement frontend composables
  - [~] 16.1 Create useProjects composable
    - Implement project CRUD operations
    - Handle loading states and errors
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4_
  
  - [~] 16.2 Create useTasks composable
    - Implement task and subtask CRUD operations
    - Handle move, reorder, soft delete, restore operations
    - Handle loading states and errors
    - _Requirements: 3.1, 3.2, 3.18, 3.19, 3.20, 3.21, 3.22_
  
  - [~] 16.3 Create useReports composable
    - Implement report generation, export, finalization
    - Handle report section and status definition operations
    - Handle loading states and errors
    - _Requirements: 6.1, 6.2, 7.1, 8.1, 8.2, 8.10_
  
  - [~] 16.4 Write unit tests for composables
    - Test with mocked backend calls
    - Test error handling
    - _Requirements: 1.1, 2.1, 3.1, 6.1, 7.1, 8.1_

- [ ] 17. Implement core UI components
  - [~] 17.1 Create ProjectList component
    - Display active and archived projects
    - Handle project selection
    - Show create project button
    - _Requirements: 12.1, 12.2_
  
  - [~] 17.2 Create ProjectForm component
    - Form for creating/editing projects
    - Include all configuration fields (name, formats, directory, year subfolders, recipients)
    - Validate inputs
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 12.3_
  
  - [~] 17.3 Create TaskList component
    - Display tasks organized by status sections
    - Show task details (name, status, ECD, notes)
    - Show subtasks with indentation
    - Handle task selection
    - Support drag-and-drop reordering
    - _Requirements: 12.2, 12.3_
  
  - [~] 17.4 Create TaskForm component
    - Form for creating/editing tasks
    - Include all fields (name, section, status, ECD, URL, notes)
    - Auto-resize notes field
    - Validate inputs
    - _Requirements: 3.1, 3.2, 12.3, 12.12, 12.13, 12.14_
  
  - [~] 17.5 Create SubtaskForm component
    - Form for creating/editing subtasks
    - Include all fields (name, status, ECD, URL, notes)
    - Auto-resize notes field
    - Validate inputs
    - _Requirements: 3.10, 3.11, 12.3, 12.12, 12.13, 12.14_
  
  - [~] 17.6 Create MarkdownEditor component
    - Textarea with markdown support
    - Auto-resize to fit content
    - For prose section editing
    - _Requirements: 6.6, 12.12, 12.13, 12.14_
  
  - [~] 17.7 Create ReportPreview component
    - Display rendered markdown report
    - Show recipients, title, sections
    - Render status badges with CSS
    - _Requirements: 7.13, 12.6_
  
  - [~] 17.8 Write unit tests for components
    - Test rendering with sample data
    - Test user interactions
    - _Requirements: 12.1, 12.2, 12.3, 12.6_

- [ ] 18. Implement main views
  - [~] 18.1 Create ProjectView
    - Show project list
    - Handle project creation and selection
    - Navigate to TaskView on selection
    - _Requirements: 12.1, 12.2_
  
  - [~] 18.2 Create TaskView
    - Show task list for selected project
    - Handle task and subtask CRUD operations
    - Show project configuration button
    - Show generate report button
    - _Requirements: 12.2, 12.3_
  
  - [~] 18.3 Create ReportView
    - Show report generation interface
    - Display section toggles
    - Show report preview
    - Handle export and finalize actions
    - Show loading states
    - _Requirements: 12.5, 12.6, 12.7, 12.8_
  
  - [~] 18.4 Write unit tests for views
    - Test navigation
    - Test data flow
    - _Requirements: 12.1, 12.2, 12.5, 12.6_

- [ ] 19. Implement report configuration UI
  - [~] 19.1 Create ReportSectionList component
    - Display report sections with order
    - Handle section creation, editing, deletion
    - Support drag-and-drop reordering
    - Show enable/disable toggles
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.9, 12.4_
  
  - [~] 19.2 Create StatusDefinitionList component
    - Display status definitions with styles
    - Handle status creation, editing, deletion
    - Show style preview (color badges)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 12.4_
  
  - [~] 19.3 Write unit tests for configuration components
    - Test CRUD operations
    - Test reordering
    - _Requirements: 5.1, 6.1, 12.4_

- [ ] 20. Implement styling with UnoCSS
  - [~] 20.1 Configure UnoCSS with design tokens
    - Set up colors, spacing, typography
    - Configure responsive breakpoints
    - _Requirements: 10.6, 12.9_
  
  - [~] 20.2 Style all components
    - Apply consistent styling across application
    - Implement responsive layouts
    - Add loading states and error displays
    - _Requirements: 12.9, 12.10_
  
  - [~] 20.3 Implement status badge CSS
    - Create CSS classes for all status styles
    - Match design document specifications
    - _Requirements: 7.4, 7.7_

- [~] 21. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Integration and polish
  - [~] 22.1 Wire all components together
    - Connect views with routing
    - Ensure data flows correctly
    - Handle navigation between views
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_
  
  - [~] 22.2 Implement error handling and user feedback
    - Show error messages for failed operations
    - Show success messages for completed operations
    - Add loading spinners
    - _Requirements: 12.10_
  
  - [~] 22.3 Add keyboard shortcuts and accessibility
    - Implement common shortcuts (Ctrl+S, Ctrl+N, etc.)
    - Add ARIA labels
    - Ensure keyboard navigation works
    - _Requirements: 12.9_
  
  - [~] 22.4 Write integration tests
    - Test end-to-end workflows
    - Test error scenarios
    - _Requirements: 1.1, 2.1, 3.1, 6.1, 7.1, 8.1, 8.10_

- [ ] 23. Build and deployment
  - [~] 23.1 Configure Wails build
    - Set up build configuration for Windows and macOS
    - Configure application metadata (name, version, icon)
    - _Requirements: 11.1, 11.2_
  
  - [~] 23.2 Test builds on both platforms
    - Build for Windows
    - Build for macOS
    - Verify binary size < 50MB
    - Test on target platforms
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [~] 23.3 Create README and documentation
    - Installation instructions
    - Usage guide
    - Development setup
    - _Requirements: 11.1, 11.2, 11.5_

- [ ] 24. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: database → services → UI
- All business logic is in the Go backend; frontend is UI-only
- Structured logging with zap is integrated throughout the backend
- All tests are required and must pass before proceeding

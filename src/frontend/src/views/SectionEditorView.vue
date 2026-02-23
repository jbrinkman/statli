<template>
    <div class="section-editor-view" role="region" aria-label="Section editor view">
        <!-- Header with section metadata and actions -->
        <div class="header">
            <div class="header-left">
                <button @click="handleCancel" class="btn-back" aria-label="Navigate back">
                    ← Back
                </button>
                <input v-model="sectionName" type="text" class="section-name-input" placeholder="Section name"
                    aria-label="Section name" />
                <select v-model="sectionType" class="section-type-selector" aria-label="Section type">
                    <option value="prose">Prose</option>
                    <option value="status">Status</option>
                </select>
            </div>
            <div class="header-right">
                <button @click="handleCancel" class="btn-cancel" aria-label="Cancel editing">
                    Cancel
                </button>
                <button @click="handleSave" class="btn-save" :disabled="saving" aria-label="Save changes">
                    {{ saving ? 'Saving...' : 'Save' }}
                </button>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading" role="status" aria-live="polite">
            Loading section data...
        </div>

        <!-- Error State -->
        <div v-if="error" class="error" role="alert" aria-live="assertive">
            {{ error }}
        </div>

        <!-- Content Area -->
        <div v-if="(!loading && section) || (section && error)" class="content-area">
            <!-- Monaco Editor for prose sections -->
            <MonacoEditor v-if="sectionType === 'prose'" v-model="content" language="markdown"
                :placeholder="'Enter section content...'" @update:modelValue="handleContentChange" />

            <!-- Task List for status sections -->
            <TaskList v-else-if="sectionType === 'status'" :tasks="tasksRef" :subtasks="subtasksRef"
                :sections="sectionsForTaskList" :status-definitions="statusDefinitions" :loading="tasksLoadingRef"
                :error="tasksErrorRef" @create-task="handleCreateTask" @edit-task="handleEditTask"
                @delete-task="handleDeleteTask" @create-subtask="handleCreateSubtask" @edit-subtask="handleEditSubtask"
                @delete-subtask="handleDeleteSubtask" @select-task="handleSelectTask"
                @select-subtask="handleSelectSubtask" />
        </div>

        <!-- Unsaved Changes Confirmation Dialog -->
        <div v-if="showConfirmDialog" class="dialog-overlay" role="dialog" aria-modal="true"
            aria-labelledby="confirm-dialog-title">
            <div class="dialog-container">
                <h2 id="confirm-dialog-title">Unsaved Changes</h2>
                <p>You have unsaved changes. Do you want to discard them?</p>
                <div class="dialog-actions">
                    <button @click="confirmDiscard" class="btn-discard">
                        Discard
                    </button>
                    <button @click="showConfirmDialog = false" class="btn-keep-editing">
                        Keep Editing
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import MonacoEditor from '../components/MonacoEditor.vue';
import TaskList from '../components/TaskList.vue';
import { useReports, type ReportSection, type StatusDefinition } from '../composables/useReports';
import { useTasks, type Task, type Subtask } from '../composables/useTasks';

// Props
interface Props {
    sectionId: number;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
    'navigate-back': [];
}>();

// Use composables
const { getReportSection, updateReportSection, loadStatusDefinitions, statusDefinitions: statusDefs } = useReports();
const {
    tasks: tasksRef,
    subtasks: subtasksRef,
    loadTasksBySection,
    createTask,
    updateTask,
    softDeleteTask,
    createSubtask,
    updateSubtask,
    softDeleteSubtask,
    loading: tasksLoadingRef,
    error: tasksErrorRef
} = useTasks();

// Local state
const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const showConfirmDialog = ref(false);

// Section data
const section = ref<ReportSection | null>(null);
const originalSection = ref<ReportSection | null>(null);
const sectionName = ref('');
const sectionType = ref<'prose' | 'status'>('prose');
const content = ref('');
const originalContent = ref('');

// Status section data
const statusDefinitions = ref<StatusDefinition[]>([]);

// Auto-save state
const autoSaveIntervalId = ref<number | null>(null);

// Computed property to wrap the current section in an array for TaskList
const sectionsForTaskList = computed(() => {
    if (!section.value) return [];
    return [section.value];
});

// Load section data
const loadSection = async (id: number) => {
    loading.value = true;
    error.value = null;

    try {
        // Use the useReports composable to load section data
        const sectionData = await getReportSection(id);
        if (!sectionData) {
            throw new Error('Section not found');
        }

        section.value = sectionData;
        originalSection.value = { ...sectionData };
        sectionName.value = sectionData.name;
        sectionType.value = sectionData.type as 'prose' | 'status';
        content.value = sectionData.content || '';
        originalContent.value = sectionData.content || '';

        // Load status definitions for task list
        await loadStatusDefinitions(sectionData.project_id);
        statusDefinitions.value = statusDefs.value;

        // Load tasks if this is a status section
        if (sectionType.value === 'status') {
            await loadTasksBySection(id);
        }

        // Restore draft from localStorage if exists (for prose sections)
        if (sectionType.value === 'prose') {
            restoreDraftFromLocalStorage();
            startAutoSave();
        }
    } catch (err: any) {
        error.value = err.message || 'Failed to load section';
        console.error('Failed to load section:', err);
    } finally {
        loading.value = false;
    }
};

// Check for unsaved changes
const hasUnsavedChanges = (): boolean => {
    if (!originalSection.value) return false;
    if (sectionName.value !== originalSection.value.name) return true;
    if (sectionType.value !== originalSection.value.type) return true;
    if (sectionType.value === 'prose' && content.value !== originalContent.value) return true;
    return false;
};

// Save changes
const handleSave = async () => {
    if (!section.value) return;

    saving.value = true;
    error.value = null;

    try {
        await updateReportSection({
            ...section.value,
            name: sectionName.value,
            type: sectionType.value,
            content: sectionType.value === 'prose' ? content.value : section.value.content,
        });

        // Clear draft from localStorage on successful save
        if (sectionType.value === 'prose') {
            clearDraftFromLocalStorage();
        }

        // Navigate back
        emit('navigate-back');
    } catch (err: any) {
        // Set error message - use a default if the error message is empty or whitespace
        const errorMessage = err.message || 'Failed to save section';
        // Only use fallback if the trimmed message is empty, but preserve original whitespace
        error.value = errorMessage.trim().length > 0 ? errorMessage : 'Failed to save section';
        console.error('Failed to save section:', err);
    } finally {
        saving.value = false;
    }
};

// Cancel editing
const handleCancel = () => {
    if (hasUnsavedChanges()) {
        showConfirmDialog.value = true;
    } else {
        emit('navigate-back');
    }
};

// Confirm discard changes
const confirmDiscard = () => {
    showConfirmDialog.value = false;
    emit('navigate-back');
};

// Handle content change from MonacoEditor
const handleContentChange = (newContent: string) => {
    content.value = newContent;
    // Content change tracking is automatically handled by the reactive ref
    // The hasUnsavedChanges() method will detect changes by comparing
    // content.value with originalContent.value
};

// LocalStorage methods
const getLocalStorageKey = (): string => {
    return `section-draft-${props.sectionId}`;
};

const saveDraftToLocalStorage = () => {
    if (sectionType.value !== 'prose') return;

    try {
        const key = getLocalStorageKey();
        localStorage.setItem(key, content.value);
    } catch (err) {
        console.warn('Failed to save draft to localStorage:', err);
    }
};

const restoreDraftFromLocalStorage = () => {
    if (sectionType.value !== 'prose') return;

    try {
        const key = getLocalStorageKey();
        const draft = localStorage.getItem(key);
        if (draft !== null) {
            content.value = draft;
        }
    } catch (err) {
        console.warn('Failed to restore draft from localStorage:', err);
    }
};

const clearDraftFromLocalStorage = () => {
    try {
        const key = getLocalStorageKey();
        localStorage.removeItem(key);
    } catch (err) {
        console.warn('Failed to clear draft from localStorage:', err);
    }
};

// Auto-save
const startAutoSave = () => {
    if (autoSaveIntervalId.value) {
        clearInterval(autoSaveIntervalId.value);
    }

    autoSaveIntervalId.value = window.setInterval(() => {
        if (sectionType.value === 'prose') {
            saveDraftToLocalStorage();
        }
    }, 30000); // 30 seconds
};

const stopAutoSave = () => {
    if (autoSaveIntervalId.value) {
        clearInterval(autoSaveIntervalId.value);
        autoSaveIntervalId.value = null;
    }
};

// Keyboard shortcuts
const handleKeyDown = (event: KeyboardEvent) => {
    // Ctrl+S or Cmd+S to save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
    }
    // Escape to cancel
    else if (event.key === 'Escape') {
        handleCancel();
    }
};

// Watch for section type changes to manage auto-save
watch(sectionType, async (newType, oldType) => {
    // Stop auto-save when switching away from prose
    if (oldType === 'prose' && newType === 'status') {
        stopAutoSave();
        // Load tasks when switching to status
        if (section.value) {
            await loadTasksBySection(section.value.id);
        }
    }
    // Start auto-save when switching to prose
    else if (oldType === 'status' && newType === 'prose') {
        startAutoSave();
    }
});

// Task event handlers
const handleCreateTask = async () => {
    if (!section.value) return;

    // For now, create a basic task - in a real app, you'd show a modal/form
    const newTask = {
        project_id: section.value.project_id,
        report_section_id: section.value.id,
        name: 'New Task',
        status: 'Not Started',
        expected_completion_date: null,
        url: '',
        notes: '',
        priority: tasksRef.value.length + 1,
        is_deleted: false,
        is_archived: false,
    };

    try {
        await createTask(newTask);
    } catch (err) {
        console.error('Failed to create task:', err);
    }
};

const handleEditTask = async (task: Task) => {
    // For now, just log - in a real app, you'd show an edit modal
    console.log('Edit task:', task);
};

const handleDeleteTask = async (taskId: number) => {
    try {
        await softDeleteTask(taskId);
    } catch (err) {
        console.error('Failed to delete task:', err);
    }
};

const handleCreateSubtask = async (task: Task) => {
    // For now, create a basic subtask - in a real app, you'd show a modal/form
    const newSubtask = {
        task_id: task.id,
        name: 'New Subtask',
        status: 'Not Started',
        expected_completion_date: null,
        url: '',
        notes: '',
        is_deleted: false,
    };

    try {
        await createSubtask(newSubtask);
    } catch (err) {
        console.error('Failed to create subtask:', err);
    }
};

const handleEditSubtask = async (subtask: Subtask) => {
    // For now, just log - in a real app, you'd show an edit modal
    console.log('Edit subtask:', subtask);
};

const handleDeleteSubtask = async (subtaskId: number) => {
    try {
        await softDeleteSubtask(subtaskId);
    } catch (err) {
        console.error('Failed to delete subtask:', err);
    }
};

const handleSelectTask = (task: Task) => {
    console.log('Selected task:', task);
};

const handleSelectSubtask = (subtask: Subtask) => {
    console.log('Selected subtask:', subtask);
};

// Lifecycle hooks
onMounted(async () => {
    await loadSection(props.sectionId);
    window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    stopAutoSave();
    window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.section-editor-view {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background-color: #ffffff;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 2px solid #e0e0e0;
    background-color: #f8f9fa;
    flex-shrink: 0;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
}

.btn-back {
    padding: 0.5rem 1rem;
    background-color: transparent;
    color: #5f6368;
    border: 1px solid #dadce0;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-back:hover {
    background-color: #e0e0e0;
    color: #202124;
}

.section-name-input {
    flex: 1;
    max-width: 400px;
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    font-weight: 500;
    border: 1px solid #dadce0;
    border-radius: 4px;
    background-color: #ffffff;
    color: #202124;
    transition: border-color 0.2s;
}

.section-name-input:focus {
    outline: none;
    border-color: #1a73e8;
}

.section-type-selector {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    border: 1px solid #dadce0;
    border-radius: 4px;
    background-color: #ffffff;
    color: #202124;
    cursor: pointer;
    transition: border-color 0.2s;
}

.section-type-selector:focus {
    outline: none;
    border-color: #1a73e8;
}

.header-right {
    display: flex;
    gap: 0.75rem;
}

.btn-cancel {
    padding: 0.5rem 1rem;
    background-color: transparent;
    color: #5f6368;
    border: 1px solid #dadce0;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-cancel:hover {
    background-color: #e0e0e0;
    color: #202124;
}

.btn-save {
    padding: 0.5rem 1rem;
    background-color: #1a73e8;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
}

.btn-save:hover:not(:disabled) {
    background-color: #1557b0;
}

.btn-save:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.loading,
.error {
    padding: 2rem;
    text-align: center;
    color: #5f6368;
}

.error {
    color: #c00;
    background-color: #fee;
    border-radius: 4px;
    margin: 1rem;
}

.content-area {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.task-list-container {
    flex: 1;
    padding: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #5f6368;
    font-style: italic;
}

/* Confirmation Dialog */
.dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.dialog-container {
    background-color: white;
    border-radius: 8px;
    padding: 2rem;
    max-width: 400px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.dialog-container h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #202124;
    margin-bottom: 1rem;
}

.dialog-container p {
    font-size: 0.875rem;
    color: #5f6368;
    margin-bottom: 1.5rem;
}

.dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
}

.btn-discard {
    padding: 0.5rem 1rem;
    background-color: #c00;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
}

.btn-discard:hover {
    background-color: #a00;
}

.btn-keep-editing {
    padding: 0.5rem 1rem;
    background-color: #1a73e8;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
}

.btn-keep-editing:hover {
    background-color: #1557b0;
}
</style>

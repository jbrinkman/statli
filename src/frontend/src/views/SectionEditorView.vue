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
        <div v-if="!loading && !error" class="content-area">
            <!-- Monaco Editor for prose sections -->
            <MonacoEditor v-if="sectionType === 'prose'" v-model="content" language="markdown"
                :placeholder="'Enter section content...'" />

            <!-- Task List for status sections -->
            <div v-else-if="sectionType === 'status'" class="task-list-container">
                <p>Task list interface will be implemented in a future task</p>
            </div>
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
import { ref, watch, onMounted, onUnmounted } from 'vue';
import MonacoEditor from '../components/MonacoEditor.vue';
import { useReports, type ReportSection } from '../composables/useReports';

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
const { getReportSection, updateReportSection } = useReports();

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

// Auto-save state
const autoSaveIntervalId = ref<number | null>(null);

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
        error.value = err.message || 'Failed to save section';
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
watch(sectionType, (newType, oldType) => {
    // Stop auto-save when switching away from prose
    if (oldType === 'prose' && newType === 'status') {
        stopAutoSave();
    }
    // Start auto-save when switching to prose
    else if (oldType === 'status' && newType === 'prose') {
        startAutoSave();
    }
});

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

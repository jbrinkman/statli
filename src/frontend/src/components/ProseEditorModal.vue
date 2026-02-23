<template>
    <div v-if="isOpen" class="prose-editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <!-- Dark backdrop -->
        <div class="modal-backdrop" @click="handleCancel"></div>

        <!-- Modal content -->
        <div class="modal-content">
            <!-- Header -->
            <div class="modal-header">
                <h2 id="editor-title" class="section-name">{{ section.name }}</h2>
                <div class="header-actions">
                    <button @click="handleSave" class="btn-save" aria-label="Save changes (Ctrl+S)">
                        Save
                    </button>
                    <button @click="handleCancel" class="btn-cancel" aria-label="Cancel editing (Escape)">
                        Cancel
                    </button>
                </div>
            </div>

            <!-- Editor -->
            <div class="editor-container">
                <MonacoEditor v-model="content" language="markdown" :theme="'vs'" />
            </div>
        </div>

        <!-- Unsaved changes confirmation dialog -->
        <div v-if="showConfirmDialog" class="confirm-dialog-overlay" @click.self="showConfirmDialog = false">
            <div class="confirm-dialog" role="alertdialog" aria-labelledby="confirm-title"
                aria-describedby="confirm-message">
                <h3 id="confirm-title">Unsaved Changes</h3>
                <p id="confirm-message">You have unsaved changes. Are you sure you want to discard them?</p>
                <div class="confirm-actions">
                    <button @click="confirmDiscard" class="btn-confirm-discard">
                        Discard
                    </button>
                    <button @click="showConfirmDialog = false" class="btn-confirm-cancel">
                        Keep Editing
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import MonacoEditor from './MonacoEditor.vue';
import type { ReportSection } from '../composables/useReports';

interface Props {
    section: ReportSection;
    isOpen: boolean;
}

interface Emits {
    (e: 'save', content: string): void;
    (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const content = ref(props.section.content || '');
const originalContent = ref(props.section.content || '');
const showConfirmDialog = ref(false);
const autoSaveIntervalId = ref<number | null>(null);

// Generate localStorage key for this section
const getLocalStorageKey = () => {
    return `prose-draft-${props.section.id}`;
};

// Save draft to localStorage
const saveDraftToLocalStorage = () => {
    try {
        const key = getLocalStorageKey();
        localStorage.setItem(key, content.value);
    } catch (error) {
        console.warn('Failed to save draft to localStorage:', error);
        // Disable auto-save if localStorage is unavailable
        if (autoSaveIntervalId.value !== null) {
            clearInterval(autoSaveIntervalId.value);
            autoSaveIntervalId.value = null;
        }
    }
};

// Restore draft from localStorage
const restoreDraftFromLocalStorage = () => {
    try {
        const key = getLocalStorageKey();
        const draft = localStorage.getItem(key);
        if (draft !== null) {
            content.value = draft;
        }
    } catch (error) {
        console.warn('Failed to restore draft from localStorage:', error);
    }
};

// Clear draft from localStorage
const clearDraftFromLocalStorage = () => {
    try {
        const key = getLocalStorageKey();
        localStorage.removeItem(key);
    } catch (error) {
        console.warn('Failed to clear draft from localStorage:', error);
    }
};

// Start auto-save interval
const startAutoSave = () => {
    // Clear any existing interval
    if (autoSaveIntervalId.value !== null) {
        clearInterval(autoSaveIntervalId.value);
    }

    // Save every 30 seconds (30000 milliseconds)
    autoSaveIntervalId.value = window.setInterval(() => {
        saveDraftToLocalStorage();
    }, 30000);
};

// Stop auto-save interval
const stopAutoSave = () => {
    if (autoSaveIntervalId.value !== null) {
        clearInterval(autoSaveIntervalId.value);
        autoSaveIntervalId.value = null;
    }
};

// Initialize content when modal opens or section changes
watch(() => props.isOpen, (isOpen) => {
    if (isOpen) {
        // First, set the original content
        originalContent.value = props.section.content || '';

        // Try to restore from localStorage
        try {
            const key = getLocalStorageKey();
            const draft = localStorage.getItem(key);
            if (draft !== null) {
                content.value = draft;
            } else {
                content.value = props.section.content || '';
            }
        } catch (error) {
            console.warn('Failed to restore draft from localStorage:', error);
            content.value = props.section.content || '';
        }

        // Start auto-save
        startAutoSave();
    } else {
        // Stop auto-save when modal closes
        stopAutoSave();
    }
});

// Update content when section changes
watch(() => props.section.content, (newContent) => {
    if (props.isOpen) {
        content.value = newContent || '';
        originalContent.value = newContent || '';
    }
});

// Check if content has changed
const hasUnsavedChanges = () => {
    return content.value !== originalContent.value;
};

// Handle save
const handleSave = () => {
    emit('save', content.value);
    originalContent.value = content.value;

    // Clear draft from localStorage on successful save
    clearDraftFromLocalStorage();
};

// Handle cancel
const handleCancel = () => {
    if (hasUnsavedChanges()) {
        showConfirmDialog.value = true;
    } else {
        emit('cancel');
    }
};

// Confirm discard changes
const confirmDiscard = () => {
    showConfirmDialog.value = false;
    emit('cancel');
};

// Keyboard shortcuts
const handleKeyDown = (event: KeyboardEvent) => {
    if (!props.isOpen) return;

    // Ctrl+S to save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
    }
    // Escape to cancel
    if (event.key === 'Escape' && !showConfirmDialog.value) {
        event.preventDefault();
        handleCancel();
    }
};

// Add keyboard event listener when modal is open
watch(() => props.isOpen, (isOpen) => {
    if (isOpen) {
        window.addEventListener('keydown', handleKeyDown);
    } else {
        window.removeEventListener('keydown', handleKeyDown);
    }
});

// Setup keyboard listener on mount if already open
onMounted(() => {
    if (props.isOpen) {
        window.addEventListener('keydown', handleKeyDown);

        // Initialize content if modal is already open on mount
        originalContent.value = props.section.content || '';

        // Try to restore from localStorage
        try {
            const key = getLocalStorageKey();
            const draft = localStorage.getItem(key);
            if (draft !== null) {
                content.value = draft;
            } else {
                content.value = props.section.content || '';
            }
        } catch (error) {
            console.warn('Failed to restore draft from localStorage:', error);
            content.value = props.section.content || '';
        }

        // Start auto-save
        startAutoSave();
    }
});

// Cleanup on unmount
onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
    stopAutoSave();
});
</script>

<style scoped>
.prose-editor-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
}

.modal-content {
    position: relative;
    width: 100vw;
    height: 100vh;
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
    z-index: 1;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e0e0e0;
    background-color: #f8f9fa;
    flex-shrink: 0;
}

.section-name {
    font-size: 1.25rem;
    font-weight: 600;
    color: #202124;
    margin: 0;
}

.header-actions {
    display: flex;
    gap: 0.75rem;
}

.btn-save,
.btn-cancel {
    padding: 0.5rem 1.25rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
}

.btn-save {
    background-color: #1a73e8;
    color: white;
}

.btn-save:hover {
    background-color: #1557b0;
}

.btn-cancel {
    background-color: transparent;
    color: #5f6368;
    border: 1px solid #dadce0;
}

.btn-cancel:hover {
    background-color: #e0e0e0;
    color: #202124;
}

.editor-container {
    flex: 1;
    overflow: hidden;
    padding: 0;
}

/* Confirmation dialog */
.confirm-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.confirm-dialog {
    background-color: white;
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 400px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.confirm-dialog h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #202124;
    margin: 0 0 0.75rem 0;
}

.confirm-dialog p {
    font-size: 0.875rem;
    color: #5f6368;
    margin: 0 0 1.5rem 0;
    line-height: 1.5;
}

.confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
}

.btn-confirm-discard,
.btn-confirm-cancel {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-confirm-discard {
    background-color: #d93025;
    color: white;
    border: none;
}

.btn-confirm-discard:hover {
    background-color: #b31412;
}

.btn-confirm-cancel {
    background-color: transparent;
    color: #5f6368;
    border: 1px solid #dadce0;
}

.btn-confirm-cancel:hover {
    background-color: #e0e0e0;
    color: #202124;
}
</style>

<template>
    <div v-if="isOpen" class="stylesheet-editor-modal" role="dialog" aria-modal="true"
        aria-labelledby="stylesheet-editor-title">
        <!-- Dark backdrop -->
        <div class="modal-backdrop" @click="handleCancel"></div>

        <!-- Modal content -->
        <div class="modal-content">
            <!-- Header -->
            <div class="modal-header">
                <h2 id="stylesheet-editor-title" class="editor-title">Master Stylesheet Editor</h2>
                <div class="header-actions">
                    <button @click="loadDefaultTemplate" class="btn-template" aria-label="Load default template">
                        Load Default Template
                    </button>
                    <button @click="handleSave" class="btn-save" :disabled="hasValidationErrors"
                        aria-label="Save stylesheet (Ctrl+S)">
                        Save
                    </button>
                    <button @click="handleCancel" class="btn-cancel" aria-label="Cancel editing (Escape)">
                        Cancel
                    </button>
                </div>
            </div>

            <!-- Validation errors -->
            <div v-if="hasValidationErrors" class="validation-errors" role="alert">
                <span class="error-icon">⚠️</span>
                <span class="error-message">{{ validationError }}</span>
            </div>

            <!-- Editor -->
            <div class="editor-container">
                <MonacoEditor v-model="cssContent" language="css" :theme="'vs'" @update:modelValue="validateCSS" />
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

interface Props {
    projectId: number;
    isOpen: boolean;
}

interface Emits {
    (e: 'save', css: string): void;
    (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const cssContent = ref('');
const originalContent = ref('');
const showConfirmDialog = ref(false);
const validationError = ref('');
const hasValidationErrors = ref(false);

// Default stylesheet template
const DEFAULT_STYLESHEET = `/* Default master stylesheet for prose sections */
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
}`;

// Load current stylesheet from backend
const loadStylesheet = async () => {
    try {
        const app = (window as any).go?.main?.App;
        if (app && typeof app.GetProjectStylesheet === 'function') {
            const stylesheet = await app.GetProjectStylesheet(props.projectId);
            cssContent.value = stylesheet || '';
            originalContent.value = stylesheet || '';
            validationError.value = '';
            hasValidationErrors.value = false;
        }
    } catch (error) {
        console.error('Failed to load stylesheet:', error);
        validationError.value = 'Failed to load stylesheet from backend';
        hasValidationErrors.value = true;
    }
};

// Load default template
const loadDefaultTemplate = () => {
    cssContent.value = DEFAULT_STYLESHEET;
    validationError.value = '';
    hasValidationErrors.value = false;
};

// Basic CSS validation
const validateCSS = (css: string) => {
    // Reset validation state
    validationError.value = '';
    hasValidationErrors.value = false;

    // Empty CSS is valid
    if (!css.trim()) {
        return;
    }

    // Basic CSS syntax validation
    // Check for balanced braces
    const openBraces = (css.match(/{/g) || []).length;
    const closeBraces = (css.match(/}/g) || []).length;

    if (openBraces !== closeBraces) {
        validationError.value = 'CSS syntax error: Unbalanced braces';
        hasValidationErrors.value = true;
        return;
    }

    // Check for basic CSS structure (selector { property: value; })
    // This is a simple check and won't catch all errors
    const cssRulePattern = /[^{}]+\{[^{}]*\}/g;
    const rules = css.match(cssRulePattern);

    if (!rules && css.trim()) {
        // If there's content but no valid rules, it might be invalid
        // However, we'll be lenient and only check for obvious errors
        if (css.includes('{') || css.includes('}')) {
            validationError.value = 'CSS syntax error: Invalid CSS structure';
            hasValidationErrors.value = true;
        }
    }
};

// Check if content has changed
const hasUnsavedChanges = () => {
    return cssContent.value !== originalContent.value;
};

// Handle save
const handleSave = async () => {
    if (hasValidationErrors.value) {
        return;
    }

    try {
        const app = (window as any).go?.main?.App;
        if (app && typeof app.UpdateProjectStylesheet === 'function') {
            await app.UpdateProjectStylesheet(props.projectId, cssContent.value);
            originalContent.value = cssContent.value;
            emit('save', cssContent.value);
        }
    } catch (error) {
        console.error('Failed to save stylesheet:', error);
        validationError.value = 'Failed to save stylesheet to backend';
        hasValidationErrors.value = true;
    }
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
    cssContent.value = originalContent.value;
    emit('cancel');
};

// Keyboard shortcuts
const handleKeyDown = (event: KeyboardEvent) => {
    if (!props.isOpen) return;

    // Ctrl+S to save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (!hasValidationErrors.value) {
            handleSave();
        }
    }
    // Escape to cancel
    if (event.key === 'Escape' && !showConfirmDialog.value) {
        event.preventDefault();
        handleCancel();
    }
};

// Watch for modal open/close
watch(() => props.isOpen, (isOpen) => {
    if (isOpen) {
        loadStylesheet();
        window.addEventListener('keydown', handleKeyDown);
    } else {
        window.removeEventListener('keydown', handleKeyDown);
    }
});

// Setup on mount
onMounted(() => {
    if (props.isOpen) {
        loadStylesheet();
        window.addEventListener('keydown', handleKeyDown);
    }
});

// Cleanup on unmount
onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.stylesheet-editor-modal {
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

.editor-title {
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
.btn-cancel,
.btn-template {
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

.btn-save:hover:not(:disabled) {
    background-color: #1557b0;
}

.btn-save:disabled {
    background-color: #dadce0;
    color: #80868b;
    cursor: not-allowed;
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

.btn-template {
    background-color: #34a853;
    color: white;
}

.btn-template:hover {
    background-color: #2d8e47;
}

.validation-errors {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background-color: #fef7e0;
    border-bottom: 1px solid #f9ab00;
    color: #b06000;
    font-size: 0.875rem;
}

.error-icon {
    font-size: 1rem;
}

.error-message {
    flex: 1;
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

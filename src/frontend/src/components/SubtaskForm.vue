<template>
  <div class="subtask-form">
    <!-- Header -->
    <div class="header">
      <h2 class="title">{{ isEdit ? 'Edit Subtask' : 'Create Subtask' }}</h2>
      <button @click="$emit('cancel')" class="btn-close">×</button>
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSubmit" class="form">
      <!-- Subtask Name -->
      <div class="form-group">
        <label for="name" class="label required">Subtask Name</label>
        <input
          id="name"
          v-model="formData.name"
          type="text"
          class="input"
          :class="{ error: errors.name }"
          placeholder="Enter subtask name"
          required
        />
        <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
      </div>

      <!-- Status -->
      <div class="form-group">
        <label for="status" class="label required">Status</label>
        <select
          id="status"
          v-model="formData.status"
          class="input"
          :class="{ error: errors.status }"
          required
        >
          <option value="">Select a status</option>
          <option
            v-for="statusDef in statusDefinitions"
            :key="statusDef.id"
            :value="statusDef.name"
          >
            {{ statusDef.name }}
          </option>
        </select>
        <span v-if="errors.status" class="error-message">{{ errors.status }}</span>
      </div>

      <!-- Expected Completion Date -->
      <div class="form-group">
        <label for="expected_completion_date" class="label">Expected Completion Date</label>
        <input
          id="expected_completion_date"
          v-model="formData.expected_completion_date"
          type="date"
          class="input"
        />
        <span class="help-text">
          Optional target completion date
        </span>
      </div>

      <!-- URL -->
      <div class="form-group">
        <label for="url" class="label">URL</label>
        <input
          id="url"
          v-model="formData.url"
          type="url"
          class="input"
          placeholder="https://example.com/subtask"
        />
        <span class="help-text">
          Optional link to external resource
        </span>
      </div>

      <!-- Notes -->
      <div class="form-group">
        <label for="notes" class="label">Notes</label>
        <textarea
          id="notes"
          ref="notesTextarea"
          v-model="formData.notes"
          class="textarea"
          placeholder="Enter subtask notes (markdown supported)"
          rows="3"
        ></textarea>
        <span class="help-text">
          Markdown formatting supported
        </span>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" @click="$emit('cancel')" class="btn-cancel">
          Cancel
        </button>
        <button type="submit" class="btn-submit" :disabled="submitting">
          {{ submitting ? 'Saving...' : (isEdit ? 'Update Subtask' : 'Create Subtask') }}
        </button>
      </div>

      <!-- Error Display -->
      <div v-if="formError" class="form-error">
        {{ formError }}
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick, onMounted } from 'vue';
import type { Subtask } from '../composables/useTasks';
import type { StatusDefinition } from '../composables/useReports';

// Props
interface Props {
  subtask?: Subtask | null;
  statusDefinitions: StatusDefinition[];
  taskId: number;
}

const props = withDefaults(defineProps<Props>(), {
  subtask: null,
});

// Emits
const emit = defineEmits<{
  submit: [subtask: Omit<Subtask, 'id' | 'created_at' | 'updated_at'> | Subtask];
  cancel: [];
}>();

// Computed
const isEdit = ref(!!props.subtask);

// Form data
const formData = reactive({
  name: '',
  status: '',
  expected_completion_date: null as string | null,
  url: '',
  notes: '',
  is_deleted: false,
});

// Form state
const errors = reactive<Record<string, string>>({});
const formError = ref<string | null>(null);
const submitting = ref(false);
const notesTextarea = ref<HTMLTextAreaElement | null>(null);

// Initialize form data from subtask prop
const initializeForm = () => {
  if (props.subtask) {
    formData.name = props.subtask.name;
    formData.status = props.subtask.status;
    formData.expected_completion_date = props.subtask.expected_completion_date;
    formData.url = props.subtask.url;
    formData.notes = props.subtask.notes;
    formData.is_deleted = props.subtask.is_deleted;
    isEdit.value = true;
  } else {
    // Reset form for new subtask
    formData.name = '';
    formData.status = '';
    formData.expected_completion_date = null;
    formData.url = '';
    formData.notes = '';
    formData.is_deleted = false;
    isEdit.value = false;
  }
  
  // Auto-resize textarea after initialization
  nextTick(() => {
    autoResizeTextarea();
  });
};

// Watch for subtask changes
watch(() => props.subtask, () => {
  initializeForm();
}, { immediate: true });

// Watch for notes changes to auto-resize
watch(() => formData.notes, () => {
  nextTick(() => {
    autoResizeTextarea();
  });
});

// Auto-resize textarea to fit content
const autoResizeTextarea = () => {
  if (notesTextarea.value) {
    // Reset height to auto to get the correct scrollHeight
    notesTextarea.value.style.height = 'auto';
    // Set height to scrollHeight to fit content
    notesTextarea.value.style.height = `${notesTextarea.value.scrollHeight}px`;
  }
};

// Validation
const validateForm = (): boolean => {
  // Clear previous errors
  Object.keys(errors).forEach(key => delete errors[key]);
  formError.value = null;

  let isValid = true;

  // Validate subtask name
  if (!formData.name || formData.name.trim() === '') {
    errors.name = 'Subtask name is required';
    isValid = false;
  }

  // Validate status
  if (!formData.status || formData.status.trim() === '') {
    errors.status = 'Status is required';
    isValid = false;
  }

  return isValid;
};

// Handle form submission
const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  submitting.value = true;
  formError.value = null;

  try {
    const subtaskData = {
      task_id: props.taskId,
      name: formData.name.trim(),
      status: formData.status.trim(),
      expected_completion_date: formData.expected_completion_date || null,
      url: formData.url.trim(),
      notes: formData.notes.trim(),
      is_deleted: formData.is_deleted,
    };

    // If editing, include the subtask ID
    if (isEdit.value && props.subtask) {
      emit('submit', {
        ...subtaskData,
        id: props.subtask.id,
        created_at: props.subtask.created_at,
        updated_at: props.subtask.updated_at,
      } as Subtask);
    } else {
      emit('submit', subtaskData);
    }
  } catch (err: any) {
    formError.value = err.message || 'Failed to save subtask';
  } finally {
    submitting.value = false;
  }
};

// Initialize on mount
onMounted(() => {
  autoResizeTextarea();
});
</script>

<style scoped>
.subtask-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff;
  border-radius: 0;
  overflow: hidden;
}

@media (min-width: 768px) {
  .subtask-form {
    border-radius: 0.5rem;
    margin: 1rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background-color: #f9fafb;
  flex-shrink: 0;
}

.title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

@media (min-width: 768px) {
  .title {
    font-size: 1.25rem;
  }
}

.btn-close {
  width: 2rem;
  height: 2rem;
  padding: 0;
  background-color: transparent;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: #6b7280;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  background-color: #e5e7eb;
  color: #111827;
}

.form {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

@media (min-width: 768px) {
  .form {
    padding: 1.5rem;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.label.required::after {
  content: ' *';
  color: #c00;
}

.input,
.textarea {
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #111827;
  background-color: #ffffff;
  transition: all 0.2s;
  font-family: inherit;
}

.input:focus,
.textarea:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
}

.input.error,
.textarea.error {
  border-color: #c00;
}

.input.error:focus,
.textarea.error:focus {
  box-shadow: 0 0 0 3px rgba(204, 0, 0, 0.1);
}

.textarea {
  resize: vertical;
  min-height: 5rem;
  max-height: 20rem;
  overflow-y: auto;
  line-height: 1.5;
}

.help-text {
  font-size: 0.75rem;
  color: #6b7280;
  font-style: italic;
  line-height: 1.4;
}

.error-message {
  font-size: 0.75rem;
  color: #c00;
  font-weight: 500;
}

.form-actions {
  display: flex;
  flex-direction: column-reverse;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  margin-top: auto;
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .form-actions {
    flex-direction: row;
    justify-content: flex-end;
  }
}

.btn-cancel {
  padding: 0.625rem 1.25rem;
  background-color: #ffffff;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

.btn-cancel:active {
  transform: scale(0.98);
}

.btn-submit {
  padding: 0.625rem 1.25rem;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit:hover:not(:disabled) {
  background-color: #1557b0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.btn-submit:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-error {
  padding: 0.75rem 1rem;
  background-color: #fee;
  color: #c00;
  border-radius: 0.375rem;
  border: 1px solid #fcc;
  font-size: 0.875rem;
  text-align: center;
  line-height: 1.5;
}
</style>

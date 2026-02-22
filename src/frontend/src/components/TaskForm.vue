<template>
  <div class="task-form">
    <!-- Header -->
    <div class="header">
      <h2 class="title">{{ isEdit ? 'Edit Task' : 'Create Task' }}</h2>
      <button @click="$emit('cancel')" class="btn-close">×</button>
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSubmit" class="form">
      <!-- Task Name -->
      <div class="form-group">
        <label for="name" class="label required">Task Name</label>
        <input
          id="name"
          v-model="formData.name"
          type="text"
          class="input"
          :class="{ error: errors.name }"
          placeholder="Enter task name"
          required
        />
        <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
      </div>

      <!-- Report Section -->
      <div class="form-group">
        <label for="report_section_id" class="label required">Section</label>
        <select
          id="report_section_id"
          v-model="formData.report_section_id"
          class="input"
          :class="{ error: errors.report_section_id }"
          required
        >
          <option value="">Select a section</option>
          <option
            v-for="section in statusSections"
            :key="section.id"
            :value="section.id"
          >
            {{ section.name }}
          </option>
        </select>
        <span v-if="errors.report_section_id" class="error-message">{{ errors.report_section_id }}</span>
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
          placeholder="https://example.com/task"
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
          placeholder="Enter task notes (markdown supported)"
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
          {{ submitting ? 'Saving...' : (isEdit ? 'Update Task' : 'Create Task') }}
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
import type { Task } from '../composables/useTasks';
import type { ReportSection, StatusDefinition } from '../composables/useReports';

// Props
interface Props {
  task?: Task | null;
  sections: ReportSection[];
  statusDefinitions: StatusDefinition[];
  projectId: number;
}

const props = withDefaults(defineProps<Props>(), {
  task: null,
});

// Emits
const emit = defineEmits<{
  submit: [task: Omit<Task, 'id' | 'created_at' | 'updated_at'> | Task];
  cancel: [];
}>();

// Computed
const isEdit = ref(!!props.task);

// Filter status sections only
const statusSections = ref<ReportSection[]>([]);

// Form data
const formData = reactive({
  name: '',
  report_section_id: '' as number | '',
  status: '',
  expected_completion_date: null as string | null,
  url: '',
  notes: '',
  priority: 0,
  is_deleted: false,
  is_archived: false,
});

// Form state
const errors = reactive<Record<string, string>>({});
const formError = ref<string | null>(null);
const submitting = ref(false);
const notesTextarea = ref<HTMLTextAreaElement | null>(null);

// Initialize form data from task prop
const initializeForm = () => {
  if (props.task) {
    formData.name = props.task.name;
    formData.report_section_id = props.task.report_section_id;
    formData.status = props.task.status;
    formData.expected_completion_date = props.task.expected_completion_date;
    formData.url = props.task.url;
    formData.notes = props.task.notes;
    formData.priority = props.task.priority;
    formData.is_deleted = props.task.is_deleted;
    formData.is_archived = props.task.is_archived;
    isEdit.value = true;
  } else {
    // Reset form for new task
    formData.name = '';
    formData.report_section_id = '';
    formData.status = '';
    formData.expected_completion_date = null;
    formData.url = '';
    formData.notes = '';
    formData.priority = 0;
    formData.is_deleted = false;
    formData.is_archived = false;
    isEdit.value = false;
  }
  
  // Auto-resize textarea after initialization
  nextTick(() => {
    autoResizeTextarea();
  });
};

// Filter status sections
const updateStatusSections = () => {
  statusSections.value = props.sections
    .filter(section => section.type === 'status')
    .sort((a, b) => a.order - b.order);
};

// Watch for task changes
watch(() => props.task, () => {
  initializeForm();
}, { immediate: true });

// Watch for sections changes
watch(() => props.sections, () => {
  updateStatusSections();
}, { immediate: true, deep: true });

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

  // Validate task name
  if (!formData.name || formData.name.trim() === '') {
    errors.name = 'Task name is required';
    isValid = false;
  }

  // Validate report section
  if (!formData.report_section_id) {
    errors.report_section_id = 'Section is required';
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
    const taskData = {
      project_id: props.projectId,
      name: formData.name.trim(),
      report_section_id: formData.report_section_id as number,
      status: formData.status.trim(),
      expected_completion_date: formData.expected_completion_date || null,
      url: formData.url.trim(),
      notes: formData.notes.trim(),
      priority: formData.priority,
      is_deleted: formData.is_deleted,
      is_archived: formData.is_archived,
    };

    // If editing, include the task ID
    if (isEdit.value && props.task) {
      emit('submit', {
        ...taskData,
        id: props.task.id,
        created_at: props.task.created_at,
        updated_at: props.task.updated_at,
      } as Task);
    } else {
      emit('submit', taskData);
    }
  } catch (err: any) {
    formError.value = err.message || 'Failed to save task';
  } finally {
    submitting.value = false;
  }
};

// Initialize on mount
onMounted(() => {
  updateStatusSections();
  autoResizeTextarea();
});
</script>

<style scoped>
.task-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff;
  border-radius: 0;
  overflow: hidden;
}

@media (min-width: 768px) {
  .task-form {
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

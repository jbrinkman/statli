<template>
  <div class="project-form">
    <!-- Header -->
    <div class="header">
      <h2 class="title">{{ isEdit ? 'Edit Project' : 'Create Project' }}</h2>
      <button @click="$emit('cancel')" class="btn-close">×</button>
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSubmit" class="form">
      <!-- Project Name -->
      <div class="form-group">
        <label for="name" class="label required">Project Name</label>
        <input
          id="name"
          v-model="formData.name"
          type="text"
          class="input"
          :class="{ error: errors.name }"
          placeholder="Enter project name"
          required
        />
        <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
      </div>

      <!-- Filename Format -->
      <div class="form-group">
        <label for="filename_format" class="label required">Filename Format</label>
        <input
          id="filename_format"
          v-model="formData.filename_format"
          type="text"
          class="input"
          :class="{ error: errors.filename_format }"
          placeholder="{project-name}-status-{YYYY-MM-DD}.md"
          required
        />
        <span class="help-text">
          Variables: {project-name}, {YYYY-MM-DD}, {YYYY}, {MM}, {DD}
        </span>
        <span v-if="errors.filename_format" class="error-message">{{ errors.filename_format }}</span>
      </div>

      <!-- Report Title Format -->
      <div class="form-group">
        <label for="report_title_format" class="label required">Report Title Format</label>
        <input
          id="report_title_format"
          v-model="formData.report_title_format"
          type="text"
          class="input"
          :class="{ error: errors.report_title_format }"
          placeholder="{project-name} Status Report - {YYYY-MM-DD}"
          required
        />
        <span class="help-text">
          Variables: {project-name}, {YYYY-MM-DD}, {YYYY}, {MM}, {DD}
        </span>
        <span v-if="errors.report_title_format" class="error-message">{{ errors.report_title_format }}</span>
      </div>

      <!-- Default Directory -->
      <div class="form-group">
        <label for="default_directory" class="label required">Default Directory</label>
        <input
          id="default_directory"
          v-model="formData.default_directory"
          type="text"
          class="input"
          :class="{ error: errors.default_directory }"
          placeholder="/path/to/reports"
          required
        />
        <span class="help-text">
          Directory where reports will be saved
        </span>
        <span v-if="errors.default_directory" class="error-message">{{ errors.default_directory }}</span>
      </div>

      <!-- Year Subfolders -->
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            id="use_year_subfolders"
            v-model="formData.use_year_subfolders"
            type="checkbox"
            class="checkbox"
          />
          <span>Use year-based subfolders (YYYY)</span>
        </label>
        <span class="help-text">
          When enabled, reports will be saved in year subdirectories
        </span>
      </div>

      <!-- Recipients Section -->
      <div class="recipients-section">
        <h3 class="section-title">Email Recipients</h3>

        <!-- To -->
        <div class="form-group">
          <label for="recipients_to" class="label">To</label>
          <input
            id="recipients_to"
            v-model="formData.recipients_to"
            type="text"
            class="input"
            placeholder="recipient1@example.com, recipient2@example.com"
          />
          <span class="help-text">
            Comma-separated email addresses
          </span>
        </div>

        <!-- CC -->
        <div class="form-group">
          <label for="recipients_cc" class="label">CC</label>
          <input
            id="recipients_cc"
            v-model="formData.recipients_cc"
            type="text"
            class="input"
            placeholder="cc@example.com"
          />
          <span class="help-text">
            Comma-separated email addresses
          </span>
        </div>

        <!-- BCC -->
        <div class="form-group">
          <label for="recipients_bcc" class="label">BCC</label>
          <input
            id="recipients_bcc"
            v-model="formData.recipients_bcc"
            type="text"
            class="input"
            placeholder="bcc@example.com"
          />
          <span class="help-text">
            Comma-separated email addresses
          </span>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" @click="$emit('cancel')" class="btn-cancel">
          Cancel
        </button>
        <button type="submit" class="btn-submit" :disabled="submitting">
          {{ submitting ? 'Saving...' : (isEdit ? 'Update Project' : 'Create Project') }}
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
import { ref, reactive, watch } from 'vue';
import type { Project } from '../composables/useProjects';

// Props
interface Props {
  project?: Project | null;
}

const props = withDefaults(defineProps<Props>(), {
  project: null,
});

// Emits
const emit = defineEmits<{
  submit: [project: Omit<Project, 'id' | 'created_at' | 'updated_at'> | Project];
  cancel: [];
}>();

// Computed
const isEdit = ref(!!props.project);

// Form data
const formData = reactive({
  name: '',
  filename_format: '{project-name}-status-{YYYY-MM-DD}.md',
  report_title_format: '{project-name} Status Report - {YYYY-MM-DD}',
  default_directory: '',
  use_year_subfolders: false,
  recipients_to: '',
  recipients_cc: '',
  recipients_bcc: '',
  is_archived: false,
});

// Form state
const errors = reactive<Record<string, string>>({});
const formError = ref<string | null>(null);
const submitting = ref(false);

// Initialize form data from project prop
const initializeForm = () => {
  if (props.project) {
    formData.name = props.project.name;
    formData.filename_format = props.project.filename_format;
    formData.report_title_format = props.project.report_title_format;
    formData.default_directory = props.project.default_directory;
    formData.use_year_subfolders = props.project.use_year_subfolders;
    formData.recipients_to = props.project.recipients_to;
    formData.recipients_cc = props.project.recipients_cc;
    formData.recipients_bcc = props.project.recipients_bcc;
    formData.is_archived = props.project.is_archived;
    isEdit.value = true;
  }
};

// Watch for project changes
watch(() => props.project, () => {
  initializeForm();
}, { immediate: true });

// Validation
const validateForm = (): boolean => {
  // Clear previous errors
  Object.keys(errors).forEach(key => delete errors[key]);
  formError.value = null;

  let isValid = true;

  // Validate project name
  if (!formData.name || formData.name.trim() === '') {
    errors.name = 'Project name is required';
    isValid = false;
  }

  // Validate filename format
  if (!formData.filename_format || formData.filename_format.trim() === '') {
    errors.filename_format = 'Filename format is required';
    isValid = false;
  } else if (containsInvalidFilenameChars(formData.filename_format)) {
    errors.filename_format = 'Filename format contains invalid characters: / \\ : * ? " < > |';
    isValid = false;
  }

  // Validate report title format
  if (!formData.report_title_format || formData.report_title_format.trim() === '') {
    errors.report_title_format = 'Report title format is required';
    isValid = false;
  }

  // Validate default directory
  if (!formData.default_directory || formData.default_directory.trim() === '') {
    errors.default_directory = 'Default directory is required';
    isValid = false;
  }

  return isValid;
};

// Check for invalid filename characters
const containsInvalidFilenameChars = (filename: string): boolean => {
  const invalidChars = /[\/\\:*?"<>|]/;
  return invalidChars.test(filename);
};

// Handle form submission
const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  submitting.value = true;
  formError.value = null;

  try {
    const projectData = {
      name: formData.name.trim(),
      filename_format: formData.filename_format.trim(),
      report_title_format: formData.report_title_format.trim(),
      default_directory: formData.default_directory.trim(),
      use_year_subfolders: formData.use_year_subfolders,
      recipients_to: formData.recipients_to.trim(),
      recipients_cc: formData.recipients_cc.trim(),
      recipients_bcc: formData.recipients_bcc.trim(),
      is_archived: formData.is_archived,
    };

    // If editing, include the project ID
    if (isEdit.value && props.project) {
      emit('submit', {
        ...projectData,
        id: props.project.id,
        created_at: props.project.created_at,
        updated_at: props.project.updated_at,
      } as Project);
    } else {
      emit('submit', projectData);
    }
  } catch (err: any) {
    formError.value = err.message || 'Failed to save project';
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.project-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff;
  border-radius: 0;
  overflow: hidden;
}

@media (min-width: 768px) {
  .project-form {
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

.input {
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #111827;
  background-color: #ffffff;
  transition: all 0.2s;
}

.input:focus {
  outline: none;
  border-color: #1a73e8;
  ring: 2px;
  ring-color: rgba(26, 115, 232, 0.1);
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
}

.input.error {
  border-color: #c00;
}

.input.error:focus {
  ring-color: rgba(204, 0, 0, 0.1);
  box-shadow: 0 0 0 3px rgba(204, 0, 0, 0.1);
}

.checkbox-group {
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
}

.checkbox {
  width: 1.125rem;
  height: 1.125rem;
  cursor: pointer;
  accent-color: #1a73e8;
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

.recipients-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.section-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
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
  position: relative;
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

<template>
  <div 
    v-if="isOpen" 
    class="shortcuts-overlay" 
    @click="close"
    role="dialog"
    aria-modal="true"
    aria-labelledby="shortcuts-title"
  >
    <div class="shortcuts-dialog" @click.stop>
      <div class="shortcuts-header">
        <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
        <button 
          @click="close" 
          class="btn-close"
          aria-label="Close keyboard shortcuts dialog"
        >
          ✕
        </button>
      </div>
      
      <div class="shortcuts-content">
        <section class="shortcuts-section">
          <h3>Global</h3>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>H</kbd>
            <span>Go to home/projects view</span>
          </div>
          <div class="shortcut-item">
            <kbd>Esc</kbd>
            <span>Go back / Close dialog</span>
          </div>
          <div class="shortcut-item">
            <kbd>?</kbd>
            <span>Show this help dialog</span>
          </div>
        </section>

        <section class="shortcuts-section">
          <h3>Projects View</h3>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>N</kbd>
            <span>Create new project</span>
          </div>
        </section>

        <section class="shortcuts-section">
          <h3>Tasks View</h3>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>N</kbd>
            <span>Create new task</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>G</kbd>
            <span>Generate report</span>
          </div>
        </section>

        <section class="shortcuts-section">
          <h3>Report View</h3>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>G</kbd>
            <span>Generate report preview</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>S</kbd>
            <span>Export report to file</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd>
            <span>Copy report to clipboard</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>F</kbd>
            <span>Finalize report</span>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const isOpen = ref(props.modelValue);

watch(() => props.modelValue, (newValue) => {
  isOpen.value = newValue;
});

const close = () => {
  isOpen.value = false;
  emit('update:modelValue', false);
};
</script>

<style scoped>
.shortcuts-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 1rem;
}

.shortcuts-dialog {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.shortcuts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.shortcuts-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  transition: color 0.2s;
}

.btn-close:hover {
  color: #111827;
}

.shortcuts-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.shortcuts-section h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  gap: 1rem;
}

.shortcut-item span {
  flex: 1;
  color: #374151;
}

kbd {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-family: monospace;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  color: #111827;
}

@media (max-width: 640px) {
  .shortcuts-dialog {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
  
  .shortcut-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>

<template>
  <div :class="['spinner-container', { inline, overlay }]">
    <div :class="['spinner', sizeClass]">
      <div class="spinner-circle"></div>
    </div>
    <span v-if="message" class="spinner-message">{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  inline?: boolean;
  overlay?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  message: '',
  inline: false,
  overlay: false,
});

const sizeClass = computed(() => `spinner-${props.size}`);
</script>

<style scoped>
.spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.spinner-container.inline {
  display: inline-flex;
  flex-direction: row;
  gap: 0.5rem;
}

.spinner-container.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 100;
}

.spinner {
  position: relative;
  display: inline-block;
}

.spinner-small {
  width: 1rem;
  height: 1rem;
}

.spinner-medium {
  width: 2rem;
  height: 2rem;
}

.spinner-large {
  width: 3rem;
  height: 3rem;
}

.spinner-circle {
  width: 100%;
  height: 100%;
  border: 2px solid #e5e7eb;
  border-top-color: #1a73e8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-small .spinner-circle {
  border-width: 2px;
}

.spinner-medium .spinner-circle {
  border-width: 3px;
}

.spinner-large .spinner-circle {
  border-width: 4px;
}

.spinner-message {
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

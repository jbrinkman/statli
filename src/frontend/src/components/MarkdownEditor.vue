<template>
  <div class="markdown-editor">
    <textarea
      ref="textarea"
      v-model="content"
      class="textarea"
      :placeholder="placeholder"
      @input="handleInput"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';

// Props
interface Props {
  modelValue: string;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Enter markdown content...',
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

// Refs
const textarea = ref<HTMLTextAreaElement | null>(null);
const content = ref(props.modelValue);

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  if (newValue !== content.value) {
    content.value = newValue;
    nextTick(() => {
      autoResize();
    });
  }
});

// Watch for content changes to auto-resize
watch(content, () => {
  nextTick(() => {
    autoResize();
  });
});

// Auto-resize textarea to fit content
const autoResize = () => {
  if (textarea.value) {
    // Reset height to auto to get the correct scrollHeight
    textarea.value.style.height = 'auto';
    // Set height to scrollHeight to fit content
    textarea.value.style.height = `${textarea.value.scrollHeight}px`;
  }
};

// Handle input event
const handleInput = () => {
  emit('update:modelValue', content.value);
  autoResize();
};

// Initialize on mount
onMounted(() => {
  autoResize();
});
</script>

<style scoped>
.markdown-editor {
  width: 100%;
}

.textarea {
  width: 100%;
  padding: 0.625rem;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #202124;
  font-family: inherit;
  line-height: 1.5;
  transition: border-color 0.2s;
  resize: vertical;
  min-height: 4rem;
  max-height: 30rem;
  overflow-y: auto;
  box-sizing: border-box;
}

.textarea:focus {
  outline: none;
  border-color: #1a73e8;
}

.textarea::placeholder {
  color: #5f6368;
  opacity: 0.7;
}
</style>

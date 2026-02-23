<template>
    <div class="monaco-editor-wrapper">
        <vue-monaco-editor v-model:value="content" :language="language" :theme="theme" :options="editorOptions"
            :class="{ 'editor-readonly': readonly }" @mount="handleMount" />
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';

interface Props {
    modelValue: string;
    language: 'markdown' | 'html' | 'css';
    placeholder?: string;
    readonly?: boolean;
    theme?: 'vs' | 'vs-dark' | 'hc-black';
}

interface Emits {
    (e: 'update:modelValue', value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
    placeholder: '',
    readonly: false,
    theme: 'vs',
});

const emit = defineEmits<Emits>();

const content = ref(props.modelValue);

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
    if (newValue !== content.value) {
        content.value = newValue;
    }
});

// Emit changes to parent
watch(content, (newValue) => {
    emit('update:modelValue', newValue);
});

// Editor options configuration
const editorOptions = computed(() => ({
    automaticLayout: true,
    lineNumbers: 'on' as const,
    minimap: {
        enabled: true,
    },
    autoIndent: 'full' as const,
    formatOnPaste: true,
    formatOnType: true,
    readOnly: props.readonly,
    wordWrap: 'on' as const,
    scrollBeyondLastLine: false,
    fontSize: 14,
    tabSize: 2,
    insertSpaces: true,
    renderWhitespace: 'selection' as const,
    bracketPairColorization: {
        enabled: true,
    },
}));

const handleMount = (editor: any) => {
    // Set placeholder if content is empty
    if (!content.value && props.placeholder) {
        editor.setValue(props.placeholder);
        // Select all placeholder text so it gets replaced on first keystroke
        editor.setSelection(editor.getModel().getFullModelRange());
    }
};
</script>

<style scoped>
.monaco-editor-wrapper {
    width: 100%;
    height: 100%;
    min-height: 400px;
}

.editor-readonly {
    opacity: 0.8;
}
</style>

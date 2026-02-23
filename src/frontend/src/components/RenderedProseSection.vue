<template>
    <div class="rendered-prose-section">
        <!-- Inject stylesheet dynamically -->
        <component :is="'style'" v-if="props.stylesheet">{{ props.stylesheet }}</component>

        <div v-if="renderError" class="error-message">
            <p>Failed to render prose section: {{ renderError }}</p>
        </div>
        <div v-else-if="renderedHtml" class="prose-content" v-html="renderedHtml"></div>
        <div v-else class="empty-content">
            <p class="text-gray-500 italic">No content</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface ReportSection {
    id: number;
    project_id: number;
    name: string;
    type: string;
    content: string;
    order: number;
    is_enabled: boolean;
    created_at: string;
    updated_at: string;
}

interface Props {
    section: ReportSection;
    stylesheet: string;
}

const props = defineProps<Props>();

const renderError = ref<string>('');

// Configure marked to allow HTML passthrough
marked.setOptions({
    breaks: true,
    gfm: true,
});

const renderedHtml = computed(() => {
    try {
        renderError.value = '';

        // Handle empty content
        if (!props.section.content || props.section.content.trim() === '') {
            return '';
        }

        // Convert markdown to HTML with HTML passthrough enabled
        const rawHtml = marked.parse(props.section.content, { async: false }) as string;

        // Sanitize HTML with DOMPurify to prevent XSS
        const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
            ALLOWED_TAGS: [
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'p', 'br', 'hr',
                'strong', 'em', 'u', 's', 'code', 'pre',
                'ul', 'ol', 'li',
                'blockquote',
                'a', 'img',
                'table', 'thead', 'tbody', 'tr', 'th', 'td',
                'div', 'span',
            ],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style'],
        });

        return sanitizedHtml;
    } catch (error) {
        renderError.value = error instanceof Error ? error.message : 'Unknown error';
        return '';
    }
});

</script>

<style scoped>
.rendered-prose-section {
    width: 100%;
}

.error-message {
    padding: 1rem;
    background-color: #fee;
    border: 1px solid #fcc;
    border-radius: 4px;
    color: #c00;
}

.empty-content {
    padding: 1rem;
    text-align: center;
}

/* Apply the master stylesheet to prose content */
.prose-content {
    width: 100%;
}
</style>

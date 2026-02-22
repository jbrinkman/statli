<template>
  <div class="report-preview">
    <!-- Header -->
    <div class="header">
      <h2 class="title">Report Preview</h2>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      Loading report preview...
    </div>

    <!-- Error State -->
    <div v-if="error" class="error">
      {{ error }}
    </div>

    <!-- Report Content -->
    <div v-if="!loading && !error && report" class="report-content">
      <!-- Recipients Block -->
      <div class="recipients-block">
        <div v-if="report.Recipients.To" class="recipient-line">
          <strong>To:</strong> {{ report.Recipients.To }}
        </div>
        <div v-if="report.Recipients.CC" class="recipient-line">
          <strong>CC:</strong> {{ report.Recipients.CC }}
        </div>
        <div v-if="report.Recipients.BCC" class="recipient-line">
          <strong>BCC:</strong> {{ report.Recipients.BCC }}
        </div>
      </div>

      <!-- Report Title -->
      <h1 class="report-title">{{ report.Title }}</h1>

      <!-- CSS Styles (injected into component) -->
      <component :is="'style'" v-html="report.CSS"></component>

      <!-- Report Sections -->
      <div
        v-for="(section, index) in report.Sections"
        :key="index"
        class="report-section"
      >
        <h2 class="section-title">{{ section.Name }}</h2>
        <div class="section-content" v-html="renderMarkdown(section.Content)"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && !error && !report" class="empty-state">
      No report generated. Generate a report to see the preview.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { GeneratedReport } from '../composables/useReports';

// Props
interface Props {
  report: GeneratedReport | null;
  loading?: boolean;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
});

// Methods
const renderMarkdown = (content: string): string => {
  if (!content) return '';
  
  // Simple markdown to HTML conversion
  // This handles the basic markdown features used in the reports
  let html = content;
  
  // Convert markdown links: [text](url) -> <a href="url">text</a>
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Convert strikethrough: ~~text~~ -> <del>text</del>
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  
  // Convert bold: **text** -> <strong>text</strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert italic: *text* -> <em>text</em>
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Convert line breaks to <br> and preserve paragraph structure
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraph tags if not already wrapped
  if (!html.startsWith('<p>')) {
    html = '<p>' + html + '</p>';
  }
  
  return html;
};
</script>

<style scoped>
.report-preview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  height: 100%;
  overflow-y: auto;
  background-color: #ffffff;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e0e0e0;
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #202124;
  margin: 0;
}

.loading,
.error,
.empty-state {
  padding: 1rem;
  text-align: center;
  color: #5f6368;
}

.error {
  color: #c00;
  background-color: #fee;
  border-radius: 4px;
}

.empty-state {
  padding: 2rem;
  font-style: italic;
}

.report-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.recipients-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.875rem;
}

.recipient-line {
  color: #202124;
}

.recipient-line strong {
  color: #5f6368;
  font-weight: 600;
}

.report-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #202124;
  margin: 0;
  padding: 0.5rem 0;
}

.report-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #202124;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.section-content {
  color: #202124;
  line-height: 1.6;
  font-size: 0.9375rem;
}

/* Markdown content styling */
.section-content :deep(p) {
  margin: 0.5rem 0;
}

.section-content :deep(a) {
  color: #1a73e8;
  text-decoration: none;
}

.section-content :deep(a:hover) {
  text-decoration: underline;
}

.section-content :deep(del) {
  color: #5f6368;
}

.section-content :deep(strong) {
  font-weight: 600;
}

.section-content :deep(em) {
  font-style: italic;
}

/* Status badge styles (from design document) */
.section-content :deep(.status-red) {
  background-color: #fee;
  color: #c00;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: bold;
}

.section-content :deep(.status-green) {
  background-color: #efe;
  color: #0a0;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: bold;
}

.section-content :deep(.status-yellow) {
  background-color: #ffe;
  color: #aa0;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: bold;
}

.section-content :deep(.status-gray) {
  background-color: #eee;
  color: #666;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: bold;
}

.section-content :deep(.status-paused) {
  background-color: #fef;
  color: #90a;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: bold;
}

.section-content :deep(.status-pending) {
  background-color: #eff;
  color: #099;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: bold;
}
</style>

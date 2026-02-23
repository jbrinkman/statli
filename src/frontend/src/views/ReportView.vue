<template>
  <div class="report-view" role="region" aria-label="Report generation view">
    <!-- Header with navigation and actions -->
    <div class="header">
      <div class="header-left">
        <button @click="$emit('navigate-back')" class="btn-back" aria-label="Navigate back to tasks">
          ← Back to Tasks
        </button>
        <h1 class="project-name">{{ project?.name || 'Loading...' }} - Report</h1>
      </div>
      <div class="header-right">
        <button @click="handleCopyToClipboard" :disabled="!generatedReport || loading" class="btn-copy"
          aria-label="Copy report to clipboard (Ctrl+Shift+C)" :aria-disabled="!generatedReport || loading">
          📋 Copy to Clipboard
        </button>
        <button @click="handleExport" :disabled="!generatedReport || loading" class="btn-export"
          aria-label="Export report to file (Ctrl+S)" :aria-disabled="!generatedReport || loading">
          💾 Export
        </button>
        <button @click="handleFinalize" :disabled="!generatedReport || loading" class="btn-finalize"
          aria-label="Finalize report and capture audit trail (Ctrl+F)" :aria-disabled="!generatedReport || loading">
          ✓ Finalize
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="content">
      <!-- Left Panel: Section Toggles and Generate -->
      <div class="left-panel" role="complementary" aria-label="Report configuration">
        <div class="panel-header">
          <h2>Report Sections</h2>
          <button @click="handleGenerate" :disabled="loading" class="btn-generate"
            aria-label="Generate report preview (Ctrl+G)" :aria-disabled="loading">
            {{ loading ? 'Generating...' : '🔄 Generate Report' }}
          </button>
        </div>

        <!-- Date Selector -->
        <div class="date-selector">
          <label for="report-date">Report Date:</label>
          <input id="report-date" v-model="reportDate" type="date" class="date-input" aria-label="Select report date" />
        </div>

        <!-- Section Toggles -->
        <div class="section-toggles" role="group" aria-label="Report section toggles">
          <div v-for="section in reportSections" :key="section.id" class="section-toggle">
            <label class="toggle-label">
              <input type="checkbox" v-model="section.is_enabled" @change="handleSectionToggle(section)"
                class="toggle-checkbox" :aria-label="`Toggle ${section.name} section`" />
              <span class="toggle-text">{{ section.name }}</span>
              <span class="toggle-type" aria-label="Section type">{{ section.type }}</span>
            </label>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="error" role="alert" aria-live="assertive">
          {{ error }}
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="success" role="status" aria-live="polite">
          {{ successMessage }}
        </div>
      </div>

      <!-- Right Panel: Report Preview -->
      <div class="right-panel" role="main" aria-label="Report preview">
        <ReportPreview :report="generatedReport" :loading="loading" :error="error" :stylesheet="masterStylesheet"
          :report-sections="reportSections" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ReportPreview from '../components/ReportPreview.vue';
import { useReports, type GeneratedReport, type ReportSection } from '../composables/useReports';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';
import type { Project } from '../composables/useProjects';

// Props
interface Props {
  project: Project;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'navigate-back': [];
}>();

// Use composables
const {
  reportSections,
  generatedReport,
  loading,
  error,
  loadReportSections,
  updateReportSection,
  generateReport,
  finalizeReport,
  exportToFile,
  getSuggestedFilepath,
  copyToClipboard,
  clearError,
} = useReports();

// Local state
const reportDate = ref(new Date().toISOString().split('T')[0]); // Today's date in YYYY-MM-DD format
const successMessage = ref<string | null>(null);
const masterStylesheet = ref<string>('');

// Load master stylesheet
const loadMasterStylesheet = async () => {
  try {
    const app = (window as any).go?.main?.App;
    if (app && typeof app.GetProjectStylesheet === 'function') {
      masterStylesheet.value = await app.GetProjectStylesheet(props.project.id);
    }
  } catch (err: any) {
    console.error('Failed to load master stylesheet:', err);
    // Don't set error state, just use empty stylesheet as fallback
  }
};

// Load report sections on mount
onMounted(async () => {
  await loadReportSections(props.project.id);
  await loadMasterStylesheet();
});

// Handle section toggle
const handleSectionToggle = async (section: ReportSection) => {
  try {
    await updateReportSection(section);
  } catch (err: any) {
    console.error('Failed to update section:', err);
  }
};

// Handle generate report
const handleGenerate = async () => {
  clearError();
  successMessage.value = null;

  try {
    await generateReport(props.project.id, reportDate.value);
    successMessage.value = 'Report generated successfully!';
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err: any) {
    console.error('Failed to generate report:', err);
  }
};

// Handle export
const handleExport = async () => {
  if (!generatedReport.value) return;

  clearError();
  successMessage.value = null;

  try {
    // Get suggested filepath
    const suggestedPath = await getSuggestedFilepath(props.project.id, reportDate.value);

    // In a real desktop app, we would show a file picker dialog
    // For now, we'll use the suggested path directly
    // TODO: Integrate with Wails file picker dialog

    // Convert the generated report to markdown
    const markdownContent = convertReportToMarkdown(generatedReport.value);

    // Export to file
    await exportToFile(markdownContent, suggestedPath);

    successMessage.value = `Report exported to: ${suggestedPath}`;
    setTimeout(() => {
      successMessage.value = null;
    }, 5000);
  } catch (err: any) {
    console.error('Failed to export report:', err);
  }
};

// Handle finalize
const handleFinalize = async () => {
  if (!generatedReport.value) return;

  if (!confirm('Are you sure you want to finalize this report? This will capture the current task states in the audit trail.')) {
    return;
  }

  clearError();
  successMessage.value = null;

  try {
    // Convert the generated report to markdown
    const markdownContent = convertReportToMarkdown(generatedReport.value);

    // Finalize the report
    await finalizeReport(props.project.id, markdownContent);

    successMessage.value = 'Report finalized successfully! Task history has been captured.';
    setTimeout(() => {
      successMessage.value = null;
    }, 5000);
  } catch (err: any) {
    console.error('Failed to finalize report:', err);
  }
};

// Handle copy to clipboard
const handleCopyToClipboard = async () => {
  if (!generatedReport.value) return;

  clearError();
  successMessage.value = null;

  try {
    // Convert the generated report to markdown
    const markdownContent = convertReportToMarkdown(generatedReport.value);

    // Copy to clipboard
    await copyToClipboard(markdownContent);

    successMessage.value = 'Report copied to clipboard!';
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err: any) {
    console.error('Failed to copy to clipboard:', err);
  }
};

// Convert GeneratedReport to markdown string
const convertReportToMarkdown = (report: GeneratedReport): string => {
  let markdown = '';

  // Add recipients block
  if (report.Recipients.To || report.Recipients.CC || report.Recipients.BCC) {
    if (report.Recipients.To) {
      markdown += `**To:** ${report.Recipients.To}\n`;
    }
    if (report.Recipients.CC) {
      markdown += `**CC:** ${report.Recipients.CC}\n`;
    }
    if (report.Recipients.BCC) {
      markdown += `**BCC:** ${report.Recipients.BCC}\n`;
    }
    markdown += '\n';
  }

  // Add title
  markdown += `# ${report.Title}\n\n`;

  // Add CSS styles
  markdown += `${report.CSS}\n\n`;

  // Add sections
  for (const section of report.Sections) {
    markdown += `## ${section.Name}\n\n`;
    markdown += `${section.Content}\n\n`;
  }

  return markdown;
};

// Keyboard shortcuts
useKeyboardShortcuts([
  {
    key: 'g',
    ctrl: true,
    handler: () => {
      if (!loading.value) {
        handleGenerate();
      }
    },
    description: 'Generate report',
  },
  {
    key: 's',
    ctrl: true,
    handler: () => {
      if (generatedReport.value && !loading.value) {
        handleExport();
      }
    },
    description: 'Save/Export report',
  },
  {
    key: 'c',
    ctrl: true,
    shift: true,
    handler: () => {
      if (generatedReport.value && !loading.value) {
        handleCopyToClipboard();
      }
    },
    description: 'Copy report to clipboard',
  },
  {
    key: 'f',
    ctrl: true,
    handler: () => {
      if (generatedReport.value && !loading.value) {
        handleFinalize();
      }
    },
    description: 'Finalize report',
  },
]);
</script>

<style scoped>
.report-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background-color: #ffffff;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid #e0e0e0;
  background-color: #f8f9fa;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-back {
  padding: 0.5rem 1rem;
  background-color: transparent;
  color: #5f6368;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background-color: #e0e0e0;
  color: #202124;
}

.project-name {
  font-size: 1.5rem;
  font-weight: 600;
  color: #202124;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 0.75rem;
}

.btn-copy,
.btn-export,
.btn-finalize {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy {
  background-color: transparent;
  color: #5f6368;
  border: 1px solid #dadce0;
}

.btn-copy:hover:not(:disabled) {
  background-color: #e0e0e0;
  color: #202124;
}

.btn-export {
  background-color: #1a73e8;
  color: white;
}

.btn-export:hover:not(:disabled) {
  background-color: #1557b0;
}

.btn-finalize {
  background-color: #0d9488;
  color: white;
}

.btn-finalize:hover:not(:disabled) {
  background-color: #0f766e;
}

.btn-copy:disabled,
.btn-export:disabled,
.btn-finalize:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-panel {
  width: 350px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  border-right: 2px solid #e0e0e0;
  background-color: #f8f9fa;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panel-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #202124;
  margin: 0;
}

.btn-generate {
  padding: 0.75rem 1rem;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-generate:hover:not(:disabled) {
  background-color: #1557b0;
}

.btn-generate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.date-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.date-selector label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #5f6368;
}

.date-input {
  padding: 0.5rem;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #202124;
}

.section-toggles {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-toggle {
  padding: 0.75rem;
  background-color: #ffffff;
  border: 1px solid #dadce0;
  border-radius: 4px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.toggle-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.toggle-text {
  flex: 1;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #202124;
}

.toggle-type {
  padding: 0.25rem 0.5rem;
  background-color: #e0e0e0;
  color: #5f6368;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.error {
  padding: 0.75rem;
  background-color: #fee;
  color: #c00;
  border-radius: 4px;
  font-size: 0.875rem;
}

.success {
  padding: 0.75rem;
  background-color: #efe;
  color: #0a0;
  border-radius: 4px;
  font-size: 0.875rem;
}

.right-panel {
  flex: 1;
  overflow-y: auto;
  background-color: #ffffff;
}
</style>

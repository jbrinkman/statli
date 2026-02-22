import { ref, Ref } from "vue";
import { useNotifications } from "./useNotifications";

// ReportSection type matching the backend model
export interface ReportSection {
  id: number;
  project_id: number;
  name: string;
  type: string; // "prose" or "status"
  content: string;
  order: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// StatusDefinition type matching the backend model
export interface StatusDefinition {
  id: number;
  project_id: number;
  name: string;
  style: string; // red, green, yellow, gray, paused, pending
  order: number;
  created_at: string;
  updated_at: string;
}

// ReportSnapshot type matching the backend model
export interface ReportSnapshot {
  id: number;
  project_id: number;
  markdown_content: string;
  finalized_at: string;
}

// GeneratedReport type matching the backend service
export interface GeneratedReport {
  Title: string;
  Recipients: {
    To: string;
    CC: string;
    BCC: string;
  };
  Sections: Array<{
    Name: string;
    Type: string;
    Content: string;
  }>;
  CSS: string;
}

// Composable state and methods
export function useReports() {
  const { success, error: showError } = useNotifications();

  // Reactive state
  const reportSections: Ref<ReportSection[]> = ref([]);
  const statusDefinitions: Ref<StatusDefinition[]> = ref([]);
  const reportSnapshots: Ref<ReportSnapshot[]> = ref([]);
  const currentReportSection: Ref<ReportSection | null> = ref(null);
  const currentStatusDefinition: Ref<StatusDefinition | null> = ref(null);
  const currentReportSnapshot: Ref<ReportSnapshot | null> = ref(null);
  const generatedReport: Ref<GeneratedReport | null> = ref(null);
  const loading: Ref<boolean> = ref(false);
  const error: Ref<string | null> = ref(null);

  // Helper to call backend methods through window.go
  const callBackend = async (method: string, ...args: any[]): Promise<any> => {
    try {
      // Access the Wails runtime through window.go
      const app = (window as any).go?.main?.App;
      if (!app || typeof app[method] !== "function") {
        throw new Error(`Wails method ${method} not available`);
      }

      // Call the method directly on the App
      return await app[method](...args);
    } catch (err: any) {
      console.error(`Backend call failed: ${method}`, err);
      throw err;
    }
  };

  // Report Section CRUD operations

  // Create a new report section
  const createReportSection = async (
    section: Omit<ReportSection, "id" | "created_at" | "updated_at">,
  ): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("CreateReportSection", section);
      // Refresh the section list after creation
      if (section.project_id) {
        await loadReportSections(section.project_id);
      }
    } catch (err: any) {
      error.value = err.message || "Failed to create report section";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Update an existing report section
  const updateReportSection = async (section: ReportSection): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("UpdateReportSection", section);
      // Refresh the section list after update
      if (section.project_id) {
        await loadReportSections(section.project_id);
      }
      // Update current section if it's the one being edited
      if (currentReportSection.value?.id === section.id) {
        currentReportSection.value = section;
      }
    } catch (err: any) {
      error.value = err.message || "Failed to update report section";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get a report section by ID
  const getReportSection = async (id: number): Promise<ReportSection> => {
    loading.value = true;
    error.value = null;

    try {
      const section = await callBackend("GetReportSection", id);
      currentReportSection.value = section;
      return section;
    } catch (err: any) {
      error.value = err.message || "Failed to get report section";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Load all report sections for a project
  const loadReportSections = async (projectID: number): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const result = await callBackend("ListReportSections", projectID);
      reportSections.value = result || [];
    } catch (err: any) {
      error.value = err.message || "Failed to load report sections";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Reorder report sections within a project
  const reorderSections = async (
    projectID: number,
    sectionIDs: number[],
  ): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("ReorderSections", projectID, sectionIDs);
      // Refresh the section list after reorder
      await loadReportSections(projectID);
    } catch (err: any) {
      error.value = err.message || "Failed to reorder sections";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Status Definition CRUD operations

  // Create a new status definition
  const createStatusDefinition = async (
    status: Omit<StatusDefinition, "id" | "created_at" | "updated_at">,
  ): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("CreateStatusDefinition", status);
      // Refresh the status list after creation
      if (status.project_id) {
        await loadStatusDefinitions(status.project_id);
      }
    } catch (err: any) {
      error.value = err.message || "Failed to create status definition";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Update an existing status definition
  const updateStatusDefinition = async (
    status: StatusDefinition,
  ): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("UpdateStatusDefinition", status);
      // Refresh the status list after update
      if (status.project_id) {
        await loadStatusDefinitions(status.project_id);
      }
      // Update current status if it's the one being edited
      if (currentStatusDefinition.value?.id === status.id) {
        currentStatusDefinition.value = status;
      }
    } catch (err: any) {
      error.value = err.message || "Failed to update status definition";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Load all status definitions for a project
  const loadStatusDefinitions = async (projectID: number): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const result = await callBackend("ListStatusDefinitions", projectID);
      statusDefinitions.value = result || [];
    } catch (err: any) {
      error.value = err.message || "Failed to load status definitions";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Report Generation and Export operations

  // Generate a report for a project at a given date
  const generateReport = async (
    projectID: number,
    date: string, // YYYY-MM-DD format
  ): Promise<GeneratedReport> => {
    loading.value = true;
    error.value = null;

    try {
      const report = await callBackend("GenerateReport", projectID, date);
      generatedReport.value = report;
      success("Report generated successfully");
      return report;
    } catch (err: any) {
      error.value = err.message || "Failed to generate report";
      showError(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Finalize a report and capture task history
  const finalizeReport = async (
    projectID: number,
    markdownContent: string,
  ): Promise<ReportSnapshot> => {
    loading.value = true;
    error.value = null;

    try {
      const snapshot = await callBackend(
        "FinalizeReport",
        projectID,
        markdownContent,
      );
      currentReportSnapshot.value = snapshot;
      success("Report finalized successfully");
      return snapshot;
    } catch (err: any) {
      error.value = err.message || "Failed to finalize report";
      showError(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get a report snapshot by ID
  const getReportSnapshot = async (id: number): Promise<ReportSnapshot> => {
    loading.value = true;
    error.value = null;

    try {
      const snapshot = await callBackend("GetReportSnapshot", id);
      currentReportSnapshot.value = snapshot;
      return snapshot;
    } catch (err: any) {
      error.value = err.message || "Failed to get report snapshot";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Load all report snapshots for a project
  const loadReportSnapshots = async (projectID: number): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const result = await callBackend("ListReportSnapshots", projectID);
      reportSnapshots.value = result || [];
    } catch (err: any) {
      error.value = err.message || "Failed to load report snapshots";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Export a report to a file
  const exportToFile = async (
    content: string,
    filePath: string,
  ): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("ExportToFile", content, filePath);
      success("Report exported successfully");
    } catch (err: any) {
      error.value = err.message || "Failed to export report";
      showError(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get suggested filepath for exporting a report
  const getSuggestedFilepath = async (
    projectID: number,
    date: string, // YYYY-MM-DD format
  ): Promise<string> => {
    loading.value = true;
    error.value = null;

    try {
      const filepath = await callBackend(
        "GetSuggestedFilepath",
        projectID,
        date,
      );
      return filepath;
    } catch (err: any) {
      error.value = err.message || "Failed to get suggested filepath";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Copy content to clipboard
  const copyToClipboard = async (content: string): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("CopyToClipboard", content);
      success("Copied to clipboard");
    } catch (err: any) {
      error.value = err.message || "Failed to copy to clipboard";
      showError(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Set the current report section
  const setCurrentReportSection = (section: ReportSection | null): void => {
    currentReportSection.value = section;
  };

  // Set the current status definition
  const setCurrentStatusDefinition = (
    status: StatusDefinition | null,
  ): void => {
    currentStatusDefinition.value = status;
  };

  // Set the current report snapshot
  const setCurrentReportSnapshot = (snapshot: ReportSnapshot | null): void => {
    currentReportSnapshot.value = snapshot;
  };

  // Clear error
  const clearError = (): void => {
    error.value = null;
  };

  return {
    // State
    reportSections,
    statusDefinitions,
    reportSnapshots,
    currentReportSection,
    currentStatusDefinition,
    currentReportSnapshot,
    generatedReport,
    loading,
    error,

    // Report Section methods
    createReportSection,
    updateReportSection,
    getReportSection,
    loadReportSections,
    reorderSections,

    // Status Definition methods
    createStatusDefinition,
    updateStatusDefinition,
    loadStatusDefinitions,

    // Report Generation and Export methods
    generateReport,
    finalizeReport,
    getReportSnapshot,
    loadReportSnapshots,
    exportToFile,
    getSuggestedFilepath,
    copyToClipboard,

    // Utility methods
    setCurrentReportSection,
    setCurrentStatusDefinition,
    setCurrentReportSnapshot,
    clearError,
  };
}

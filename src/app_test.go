package main

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestNewApp(t *testing.T) {
	app := NewApp()
	if app == nil {
		t.Fatal("NewApp() returned nil")
	}

	// Verify initial state
	if app.ctx != nil {
		t.Error("Expected ctx to be nil before startup")
	}
	if app.db != nil {
		t.Error("Expected db to be nil before startup")
	}
	if app.logger != nil {
		t.Error("Expected logger to be nil before startup")
	}
	if app.projectService != nil {
		t.Error("Expected projectService to be nil before startup")
	}
	if app.taskService != nil {
		t.Error("Expected taskService to be nil before startup")
	}
	if app.reportService != nil {
		t.Error("Expected reportService to be nil before startup")
	}
	if app.exportService != nil {
		t.Error("Expected exportService to be nil before startup")
	}
}

func TestAppStartup(t *testing.T) {
	// Create a temporary directory for test database
	tempDir := t.TempDir()

	// Set environment variable for database location
	dbPath := filepath.Join(tempDir, "test.db")
	os.Setenv("STATUS_REPORT_DB_PATH", dbPath)
	defer os.Unsetenv("STATUS_REPORT_DB_PATH")

	app := NewApp()
	ctx := context.Background()

	// Call startup
	app.startup(ctx)

	// Verify all components are initialized
	if app.ctx == nil {
		t.Error("Expected ctx to be set after startup")
	}
	if app.db == nil {
		t.Error("Expected db to be initialized after startup")
	}
	if app.logger == nil {
		t.Error("Expected logger to be initialized after startup")
	}
	if app.projectService == nil {
		t.Error("Expected projectService to be initialized after startup")
	}
	if app.taskService == nil {
		t.Error("Expected taskService to be initialized after startup")
	}
	if app.reportService == nil {
		t.Error("Expected reportService to be initialized after startup")
	}
	if app.exportService == nil {
		t.Error("Expected exportService to be initialized after startup")
	}

	// Clean up
	app.shutdown(ctx)
}

func TestAppShutdown(t *testing.T) {
	// Create a temporary directory for test database
	tempDir := t.TempDir()

	// Set environment variable for database location
	dbPath := filepath.Join(tempDir, "test.db")
	os.Setenv("STATUS_REPORT_DB_PATH", dbPath)
	defer os.Unsetenv("STATUS_REPORT_DB_PATH")

	app := NewApp()
	ctx := context.Background()

	// Startup and then shutdown
	app.startup(ctx)
	app.shutdown(ctx)

	// Verify shutdown doesn't panic and handles nil gracefully
	// (no assertions needed, just verify it doesn't crash)
}

func TestGetServiceMethods(t *testing.T) {
	// Create a temporary directory for test database
	tempDir := t.TempDir()

	// Set environment variable for database location
	dbPath := filepath.Join(tempDir, "test.db")
	os.Setenv("STATUS_REPORT_DB_PATH", dbPath)
	defer os.Unsetenv("STATUS_REPORT_DB_PATH")

	app := NewApp()
	ctx := context.Background()
	app.startup(ctx)
	defer app.shutdown(ctx)

	// Test GetProjectService
	projectService := app.GetProjectService()
	if projectService == nil {
		t.Error("GetProjectService() returned nil")
	}
	if projectService != app.projectService {
		t.Error("GetProjectService() returned different instance")
	}

	// Test GetTaskService
	taskService := app.GetTaskService()
	if taskService == nil {
		t.Error("GetTaskService() returned nil")
	}
	if taskService != app.taskService {
		t.Error("GetTaskService() returned different instance")
	}

	// Test GetReportService
	reportService := app.GetReportService()
	if reportService == nil {
		t.Error("GetReportService() returned nil")
	}
	if reportService != app.reportService {
		t.Error("GetReportService() returned different instance")
	}

	// Test GetExportService
	exportService := app.GetExportService()
	if exportService == nil {
		t.Error("GetExportService() returned nil")
	}
	if exportService != app.exportService {
		t.Error("GetExportService() returned different instance")
	}
}

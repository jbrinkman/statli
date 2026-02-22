package screenshot

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestDefaultConfig(t *testing.T) {
	cfg := DefaultConfig()

	if cfg.URL != "http://localhost:34115" {
		t.Errorf("expected default URL 'http://localhost:34115', got '%s'", cfg.URL)
	}

	if cfg.WaitSelector != "body" {
		t.Errorf("expected default WaitSelector 'body', got '%s'", cfg.WaitSelector)
	}

	if cfg.WaitDuration != 1*time.Second {
		t.Errorf("expected default WaitDuration 1s, got %v", cfg.WaitDuration)
	}

	if !cfg.FullPage {
		t.Error("expected FullPage to be true")
	}

	if cfg.Width != 1280 {
		t.Errorf("expected default Width 1280, got %d", cfg.Width)
	}

	if cfg.Height != 800 {
		t.Errorf("expected default Height 800, got %d", cfg.Height)
	}
}

func TestCapture_DirectoryCreation(t *testing.T) {
	// Skip if no display available (CI environment)
	if os.Getenv("CI") != "" && os.Getenv("DISPLAY") == "" {
		t.Skip("Skipping screenshot test in headless CI environment")
	}

	tempDir := t.TempDir()
	outputPath := filepath.Join(tempDir, "nested", "dir", "screenshot.png")

	cfg := &Config{
		URL:          "data:text/html,<html><body>Test</body></html>",
		OutputPath:   outputPath,
		WaitSelector: "body",
		WaitDuration: 100 * time.Millisecond,
		FullPage:     true,
		Width:        800,
		Height:       600,
	}

	ctx := context.Background()
	err := Capture(ctx, cfg)

	// We expect this to fail if Chrome is not available, but directory should be created
	if err != nil {
		t.Logf("Screenshot capture failed (expected if Chrome not available): %v", err)
	}

	// Check that directory was created
	dir := filepath.Dir(outputPath)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		t.Errorf("expected directory to be created: %s", dir)
	}
}

func TestScreenshotStep(t *testing.T) {
	step := ScreenshotStep{
		OutputPath:   "/tmp/test.png",
		WaitSelector: "#app",
		WaitDuration: 500 * time.Millisecond,
		Description:  "Main app view",
	}

	if step.OutputPath != "/tmp/test.png" {
		t.Errorf("expected OutputPath '/tmp/test.png', got '%s'", step.OutputPath)
	}

	if step.Description != "Main app view" {
		t.Errorf("expected Description 'Main app view', got '%s'", step.Description)
	}
}

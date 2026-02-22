package main

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"src/backend/screenshot"

	"github.com/chromedp/chromedp"
)

// TestScreenshot_BasicCapture demonstrates basic screenshot capture
// This test requires the Wails app to be running on localhost:34115
func TestScreenshot_BasicCapture(t *testing.T) {
	// Skip if running in CI without display
	if os.Getenv("CI") != "" && os.Getenv("DISPLAY") == "" {
		t.Skip("Skipping UI screenshot test in headless CI environment")
	}

	// Skip if app is not running (you can check by attempting connection)
	// For now, we'll just skip if WAILS_APP_RUNNING is not set
	if os.Getenv("WAILS_APP_RUNNING") == "" {
		t.Skip("Skipping screenshot test - set WAILS_APP_RUNNING=1 and start app with 'wails dev'")
	}

	screenshotDir := filepath.Join("screenshots", "test")

	cfg := &screenshot.Config{
		URL:          "http://localhost:34115",
		OutputPath:   filepath.Join(screenshotDir, "main-view.png"),
		WaitSelector: "body",
		WaitDuration: 2 * time.Second,
		FullPage:     true,
		Width:        1280,
		Height:       800,
	}

	ctx := context.Background()
	err := screenshot.Capture(ctx, cfg)
	if err != nil {
		t.Fatalf("failed to capture screenshot: %v", err)
	}

	// Verify file was created
	if _, err := os.Stat(cfg.OutputPath); os.IsNotExist(err) {
		t.Errorf("screenshot file was not created: %s", cfg.OutputPath)
	}

	t.Logf("Screenshot saved to: %s", cfg.OutputPath)
}

// TestScreenshot_ProjectList captures the project list view
func TestScreenshot_ProjectList(t *testing.T) {
	if os.Getenv("CI") != "" && os.Getenv("DISPLAY") == "" {
		t.Skip("Skipping UI screenshot test in headless CI environment")
	}

	if os.Getenv("WAILS_APP_RUNNING") == "" {
		t.Skip("Skipping screenshot test - set WAILS_APP_RUNNING=1 and start app")
	}

	screenshotDir := filepath.Join("screenshots", "test")

	cfg := &screenshot.Config{
		URL:          "http://localhost:34115",
		OutputPath:   filepath.Join(screenshotDir, "project-list.png"),
		WaitSelector: ".project-list, [data-testid='project-list']",
		WaitDuration: 1 * time.Second,
		FullPage:     true,
		Width:        1280,
		Height:       800,
	}

	ctx := context.Background()
	err := screenshot.Capture(ctx, cfg)
	if err != nil {
		t.Logf("Note: If selector not found, adjust WaitSelector in test")
		t.Fatalf("failed to capture screenshot: %v", err)
	}

	t.Logf("Screenshot saved to: %s", cfg.OutputPath)
}

// TestScreenshot_Sequence demonstrates capturing a sequence of screenshots
func TestScreenshot_Sequence(t *testing.T) {
	if os.Getenv("CI") != "" && os.Getenv("DISPLAY") == "" {
		t.Skip("Skipping UI screenshot test in headless CI environment")
	}

	if os.Getenv("WAILS_APP_RUNNING") == "" {
		t.Skip("Skipping screenshot test - set WAILS_APP_RUNNING=1 and start app")
	}

	screenshotDir := filepath.Join("screenshots", "test", "sequence")

	steps := []screenshot.ScreenshotStep{
		{
			OutputPath:   filepath.Join(screenshotDir, "01-initial-load.png"),
			WaitSelector: "body",
			WaitDuration: 1 * time.Second,
			Description:  "Initial page load",
		},
		{
			OutputPath:   filepath.Join(screenshotDir, "02-after-interaction.png"),
			WaitSelector: "body",
			WaitDuration: 500 * time.Millisecond,
			Action: chromedp.ActionFunc(func(ctx context.Context) error {
				// Example: Click a button (adjust selector as needed)
				// return chromedp.Click("#some-button", chromedp.ByQuery).Do(ctx)
				return nil // No action for now
			}),
			Description: "After user interaction",
		},
	}

	ctx := context.Background()
	err := screenshot.CaptureSequence(ctx, "http://localhost:34115", steps)
	if err != nil {
		t.Fatalf("failed to capture screenshot sequence: %v", err)
	}

	// Verify all screenshots were created
	for _, step := range steps {
		if _, err := os.Stat(step.OutputPath); os.IsNotExist(err) {
			t.Errorf("screenshot not created: %s", step.OutputPath)
		} else {
			t.Logf("Screenshot saved: %s - %s", step.OutputPath, step.Description)
		}
	}
}

// TestScreenshot_WindowResize captures screenshots at different window sizes
func TestScreenshot_WindowResize(t *testing.T) {
	if os.Getenv("CI") != "" && os.Getenv("DISPLAY") == "" {
		t.Skip("Skipping UI screenshot test in headless CI environment")
	}

	if os.Getenv("WAILS_APP_RUNNING") == "" {
		t.Skip("Skipping screenshot test - set WAILS_APP_RUNNING=1 and start app")
	}

	screenshotDir := filepath.Join("screenshots", "test", "resize")

	sizes := []struct {
		name   string
		width  int
		height int
	}{
		{"small", 800, 600},
		{"medium", 1280, 800},
		{"large", 1920, 1080},
	}

	ctx := context.Background()

	for _, size := range sizes {
		cfg := &screenshot.Config{
			URL:          "http://localhost:34115",
			OutputPath:   filepath.Join(screenshotDir, size.name+".png"),
			WaitSelector: "body",
			WaitDuration: 1 * time.Second,
			FullPage:     true,
			Width:        size.width,
			Height:       size.height,
		}

		err := screenshot.Capture(ctx, cfg)
		if err != nil {
			t.Errorf("failed to capture %s screenshot: %v", size.name, err)
			continue
		}

		t.Logf("Screenshot saved: %s (%dx%d)", cfg.OutputPath, size.width, size.height)
	}
}

// TestScreenshot_CustomAction demonstrates capturing with custom interactions
func TestScreenshot_CustomAction(t *testing.T) {
	if os.Getenv("CI") != "" && os.Getenv("DISPLAY") == "" {
		t.Skip("Skipping UI screenshot test in headless CI environment")
	}

	if os.Getenv("WAILS_APP_RUNNING") == "" {
		t.Skip("Skipping screenshot test - set WAILS_APP_RUNNING=1 and start app")
	}

	screenshotDir := filepath.Join("screenshots", "test")

	cfg := &screenshot.Config{
		URL:          "http://localhost:34115",
		OutputPath:   filepath.Join(screenshotDir, "custom-action.png"),
		WaitSelector: "body",
		WaitDuration: 1 * time.Second,
		FullPage:     true,
		Width:        1280,
		Height:       800,
	}

	// Example custom action: scroll down
	action := chromedp.ActionFunc(func(ctx context.Context) error {
		return chromedp.Evaluate(`window.scrollTo(0, 500)`, nil).Do(ctx)
	})

	ctx := context.Background()
	err := screenshot.CaptureWithAction(ctx, cfg, action)
	if err != nil {
		t.Fatalf("failed to capture screenshot with action: %v", err)
	}

	t.Logf("Screenshot saved to: %s", cfg.OutputPath)
}

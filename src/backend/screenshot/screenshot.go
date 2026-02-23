package screenshot

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/chromedp/chromedp"
)

// Config holds screenshot configuration
type Config struct {
	// URL to capture (e.g., "http://localhost:34115")
	URL string
	// OutputPath where to save the screenshot
	OutputPath string
	// WaitSelector - CSS selector to wait for before capturing
	WaitSelector string
	// WaitDuration - additional time to wait after selector appears
	WaitDuration time.Duration
	// FullPage - capture full page or just viewport
	FullPage bool
	// Width - viewport width
	Width int
	// Height - viewport height
	Height int
}

// DefaultConfig returns a config with sensible defaults
func DefaultConfig() *Config {
	return &Config{
		URL:          "http://localhost:34115",
		WaitSelector: "body",
		WaitDuration: 1 * time.Second,
		FullPage:     true,
		Width:        1280,
		Height:       800,
	}
}

// Capture takes a screenshot with the given configuration
func Capture(ctx context.Context, cfg *Config) error {
	if cfg == nil {
		cfg = DefaultConfig()
	}

	// Ensure output directory exists
	dir := filepath.Dir(cfg.OutputPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Create chrome context with custom viewport
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.WindowSize(cfg.Width, cfg.Height),
		chromedp.Flag("headless", true),
	)

	allocCtx, cancel := chromedp.NewExecAllocator(ctx, opts...)
	defer cancel()

	chromeCtx, cancel := chromedp.NewContext(allocCtx)
	defer cancel()

	// Set timeout
	chromeCtx, cancel = context.WithTimeout(chromeCtx, 30*time.Second)
	defer cancel()

	var buf []byte

	// Build task list
	tasks := chromedp.Tasks{
		chromedp.Navigate(cfg.URL),
		chromedp.WaitVisible(cfg.WaitSelector, chromedp.ByQuery),
	}

	// Add wait duration if specified
	if cfg.WaitDuration > 0 {
		tasks = append(tasks, chromedp.Sleep(cfg.WaitDuration))
	}

	// Add screenshot task
	if cfg.FullPage {
		tasks = append(tasks, chromedp.FullScreenshot(&buf, 90))
	} else {
		tasks = append(tasks, chromedp.CaptureScreenshot(&buf))
	}

	// Execute tasks
	if err := chromedp.Run(chromeCtx, tasks); err != nil {
		return fmt.Errorf("failed to capture screenshot: %w", err)
	}

	// Write screenshot to file
	if err := os.WriteFile(cfg.OutputPath, buf, 0644); err != nil {
		return fmt.Errorf("failed to write screenshot: %w", err)
	}

	return nil
}

// CaptureWithAction captures a screenshot after performing a custom action
func CaptureWithAction(ctx context.Context, cfg *Config, action chromedp.Action) error {
	if cfg == nil {
		cfg = DefaultConfig()
	}

	// Ensure output directory exists
	dir := filepath.Dir(cfg.OutputPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Create chrome context
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.WindowSize(cfg.Width, cfg.Height),
		chromedp.Flag("headless", true),
	)

	allocCtx, cancel := chromedp.NewExecAllocator(ctx, opts...)
	defer cancel()

	chromeCtx, cancel := chromedp.NewContext(allocCtx)
	defer cancel()

	chromeCtx, cancel = context.WithTimeout(chromeCtx, 30*time.Second)
	defer cancel()

	var buf []byte

	// Build task list
	tasks := chromedp.Tasks{
		chromedp.Navigate(cfg.URL),
		chromedp.WaitVisible(cfg.WaitSelector, chromedp.ByQuery),
		action,
	}

	if cfg.WaitDuration > 0 {
		tasks = append(tasks, chromedp.Sleep(cfg.WaitDuration))
	}

	if cfg.FullPage {
		tasks = append(tasks, chromedp.FullScreenshot(&buf, 90))
	} else {
		tasks = append(tasks, chromedp.CaptureScreenshot(&buf))
	}

	if err := chromedp.Run(chromeCtx, tasks); err != nil {
		return fmt.Errorf("failed to capture screenshot: %w", err)
	}

	if err := os.WriteFile(cfg.OutputPath, buf, 0644); err != nil {
		return fmt.Errorf("failed to write screenshot: %w", err)
	}

	return nil
}

// CaptureSequence captures multiple screenshots in sequence
func CaptureSequence(ctx context.Context, baseURL string, steps []ScreenshotStep) error {
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.WindowSize(1280, 800),
		chromedp.Flag("headless", true),
	)

	allocCtx, cancel := chromedp.NewExecAllocator(ctx, opts...)
	defer cancel()

	chromeCtx, cancel := chromedp.NewContext(allocCtx)
	defer cancel()

	chromeCtx, cancel = context.WithTimeout(chromeCtx, 60*time.Second)
	defer cancel()

	// Navigate to base URL
	if err := chromedp.Run(chromeCtx, chromedp.Navigate(baseURL)); err != nil {
		return fmt.Errorf("failed to navigate: %w", err)
	}

	// Execute each step
	for i, step := range steps {
		var buf []byte

		tasks := chromedp.Tasks{}

		// Add custom actions if provided
		if step.Action != nil {
			tasks = append(tasks, step.Action)
		}

		// Wait for selector if provided
		if step.WaitSelector != "" {
			tasks = append(tasks, chromedp.WaitVisible(step.WaitSelector, chromedp.ByQuery))
		}

		// Add wait duration
		if step.WaitDuration > 0 {
			tasks = append(tasks, chromedp.Sleep(step.WaitDuration))
		} else {
			tasks = append(tasks, chromedp.Sleep(500*time.Millisecond))
		}

		// Capture screenshot
		tasks = append(tasks, chromedp.FullScreenshot(&buf, 90))

		if err := chromedp.Run(chromeCtx, tasks); err != nil {
			return fmt.Errorf("failed to execute step %d: %w", i, err)
		}

		// Ensure output directory exists
		dir := filepath.Dir(step.OutputPath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create output directory: %w", err)
		}

		// Write screenshot
		if err := os.WriteFile(step.OutputPath, buf, 0644); err != nil {
			return fmt.Errorf("failed to write screenshot %d: %w", i, err)
		}
	}

	return nil
}

// ScreenshotStep represents a single step in a screenshot sequence
type ScreenshotStep struct {
	// OutputPath where to save this screenshot
	OutputPath string
	// WaitSelector - CSS selector to wait for
	WaitSelector string
	// WaitDuration - time to wait before capturing
	WaitDuration time.Duration
	// Action - custom chromedp action to perform
	Action chromedp.Action
	// Description - human-readable description of this step
	Description string
}

// NavigateToView returns a chromedp action that navigates to a specific view in the app
func NavigateToView(view string, projectID int) chromedp.Action {
	return chromedp.ActionFunc(func(ctx context.Context) error {
		switch view {
		case "form":
			// Click the "Create Project" button to show the form
			if err := chromedp.Click(`button[aria-label*="Create new project"]`, chromedp.ByQuery).Do(ctx); err != nil {
				return fmt.Errorf("failed to click create project button: %w", err)
			}
			// Wait for form to appear
			return chromedp.WaitVisible(`[data-component="project-form"]`, chromedp.ByQuery).Do(ctx)

		case "tasks":
			// Click on the project button to navigate to tasks view
			selector := fmt.Sprintf(`button[data-project-id="%d"]`, projectID)
			if err := chromedp.Click(selector, chromedp.ByQuery).Do(ctx); err != nil {
				return fmt.Errorf("failed to click project %d: %w", projectID, err)
			}
			// Wait for tasks view to load
			return chromedp.WaitVisible(`[data-view="tasks"]`, chromedp.ByQuery).Do(ctx)

		case "report":
			// First navigate to tasks view
			tasksSelector := fmt.Sprintf(`button[data-project-id="%d"]`, projectID)
			if err := chromedp.Click(tasksSelector, chromedp.ByQuery).Do(ctx); err != nil {
				return fmt.Errorf("failed to click project %d: %w", projectID, err)
			}
			// Wait for tasks view
			if err := chromedp.WaitVisible(`[data-view="tasks"]`, chromedp.ByQuery).Do(ctx); err != nil {
				return fmt.Errorf("failed to wait for tasks view: %w", err)
			}
			// Small delay to ensure tasks view is fully loaded
			chromedp.Sleep(500 * time.Millisecond).Do(ctx)
			// Click on generate report button
			if err := chromedp.Click(`button[aria-label*="Generate"]`, chromedp.ByQuery).Do(ctx); err != nil {
				return fmt.Errorf("failed to click generate report button: %w", err)
			}
			// Wait for report view to load
			return chromedp.WaitVisible(`[data-view="report"]`, chromedp.ByQuery).Do(ctx)

		default:
			return fmt.Errorf("unknown view: %s", view)
		}
	})
}

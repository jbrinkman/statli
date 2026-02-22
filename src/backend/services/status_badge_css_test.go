package services

import (
	"strings"
	"testing"
)

// TestStatusBadgeCSS verifies that the CSS includes all required status badge styles
// Implements requirements 7.4, 7.7: CSS styles for Status_Badges
func TestStatusBadgeCSS(t *testing.T) {
	css := getStatusBadgeCSS()

	// Verify CSS is not empty
	if css == "" {
		t.Fatal("CSS should not be empty")
	}

	// Verify CSS is wrapped in <style> tags
	if !strings.HasPrefix(css, "<style>") {
		t.Error("CSS should start with <style> tag")
	}
	if !strings.HasSuffix(css, "</style>") {
		t.Error("CSS should end with </style> tag")
	}

	// Verify all required status badge classes are present
	requiredClasses := []string{
		".status-red",
		".status-green",
		".status-yellow",
		".status-gray",
		".status-paused",
		".status-pending",
	}

	for _, class := range requiredClasses {
		if !strings.Contains(css, class) {
			t.Errorf("CSS should contain class %s", class)
		}
	}

	// Verify all required CSS properties are present for each class
	requiredProperties := []string{
		"background-color:",
		"color:",
		"padding:",
		"border-radius:",
		"font-weight:",
	}

	for _, prop := range requiredProperties {
		// Count occurrences - should be at least 6 (one per status class)
		count := strings.Count(css, prop)
		if count < 6 {
			t.Errorf("CSS should contain at least 6 occurrences of %s, got %d", prop, count)
		}
	}

	// Verify specific color values match design document
	colorTests := []struct {
		class     string
		bgColor   string
		textColor string
	}{
		{".status-red", "#fee", "#c00"},
		{".status-green", "#efe", "#0a0"},
		{".status-yellow", "#ffe", "#aa0"},
		{".status-gray", "#eee", "#666"},
		{".status-paused", "#fef", "#90a"},
		{".status-pending", "#eff", "#099"},
	}

	for _, test := range colorTests {
		// Find the class definition
		classIndex := strings.Index(css, test.class)
		if classIndex == -1 {
			t.Errorf("Class %s not found in CSS", test.class)
			continue
		}

		// Extract the class definition (from class name to closing brace)
		classEnd := strings.Index(css[classIndex:], "}")
		if classEnd == -1 {
			t.Errorf("Closing brace not found for class %s", test.class)
			continue
		}
		classDef := css[classIndex : classIndex+classEnd]

		// Verify background color
		if !strings.Contains(classDef, "background-color: "+test.bgColor) {
			t.Errorf("Class %s should have background-color: %s", test.class, test.bgColor)
		}

		// Verify text color
		if !strings.Contains(classDef, "color: "+test.textColor) {
			t.Errorf("Class %s should have color: %s", test.class, test.textColor)
		}
	}

	// Verify consistent styling properties
	if !strings.Contains(css, "padding: 2px 6px") {
		t.Error("CSS should contain padding: 2px 6px")
	}
	if !strings.Contains(css, "border-radius: 3px") {
		t.Error("CSS should contain border-radius: 3px")
	}
	if !strings.Contains(css, "font-weight: bold") {
		t.Error("CSS should contain font-weight: bold")
	}
}

// TestStatusBadgeCSSFormat verifies the CSS is properly formatted
func TestStatusBadgeCSSFormat(t *testing.T) {
	css := getStatusBadgeCSS()

	// Verify proper indentation (4 spaces for properties)
	lines := strings.Split(css, "\n")
	propertyCount := 0
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.Contains(trimmed, ":") && !strings.HasPrefix(trimmed, ".") {
			propertyCount++
			// Check that property lines have proper indentation
			if !strings.HasPrefix(line, "    ") && line != "" {
				t.Errorf("Property line should be indented with 4 spaces: %s", line)
			}
		}
	}

	// Should have 30 properties total (5 properties × 6 classes)
	if propertyCount != 30 {
		t.Errorf("Expected 30 CSS properties, got %d", propertyCount)
	}
}

// TestStatusBadgeCSSInReport verifies CSS is included in generated reports
// This test is covered by existing tests in report_service_test.go
// See TestGenerateReport_BasicStructure which verifies CSS inclusion

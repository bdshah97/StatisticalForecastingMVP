// SSA Color Palette - Single source of truth
// From SSA&Company Brand Guidelines

export const ssaColors = {
  // Primary Colors
  blue: '#003399',        // Primary Blue - main brand color
  nepal: '#8CA3B2',       // Light blue-gray
  black: '#000000',       // Black background
  white: '#FFFFFF',       // White text/foreground

  // Secondary Colors
  curiousBlue: '#0A7CC1',    // Bright blue accent
  blumine: '#336179',        // Dark blue-gray
  christiGreen: '#1D9A19',   // Bright green
  strongGreen: '#186037',    // Dark green
  easternBlue: '#0088A1',    // Teal/cyan

  // Accent Colors
  persimmon: '#DE4702',      // Orange-red accent
};

// Color roles for the app
export const ssaColorRoles = {
  background: ssaColors.black,           // Main background
  cardBackground: ssaColors.black,       // Card backgrounds
  border: ssaColors.nepal,               // Default borders
  primaryAccent: ssaColors.blue,         // Primary accent (borders, highlights)
  secondaryAccent: ssaColors.curiousBlue, // Secondary accent
  successAccent: ssaColors.christiGreen,  // Success/positive
  warningAccent: ssaColors.persimmon,     // Warning/alert
  text: ssaColors.white,                 // Primary text
};

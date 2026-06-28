/**
 * UX-D3: Feature Specification Generator
 * "Generate detailed feature specifications gated by user readiness rather than arbitrary locks."
 *
 * AUDIT FIXES:
 * - Added JSDoc.
 * - Improved robustness for missing options.
 * - Standardized output formatting.
 */

class FeatureSpecGenerator {
  /**
   * Generates a feature specification based on the provided inputs.
   * @param {Object} options
   * @param {string} options.feature_name
   * @param {string} options.feature_category - [onboarding, core utility, social, monetization, etc.]
   * @param {string} options.user_segment - [target users for this feature]
   * @param {Array<string>} [options.prerequisites=[]] - [data, permissions, prior feature usage required]
   * @param {number} [options.feature_count=1] - [number of related features needed]
   * @param {string} [options.platform='Cross-platform'] - [specific platform constraints]
   * @param {Array<string>} [options.feature_names=[]]
   * @returns {string} Markdown formatted feature specification
   */
  generate(options) {
    const {
        feature_name = "New Feature Set",
        feature_category = "General",
        user_segment = "All Players",
        prerequisites = [],
        feature_count = 1,
        platform = "Universal",
        feature_names = []
    } = options;

    let spec = `# Feature Specification: ${feature_name}\n\n`;
    spec += "## Metadata\n";
    spec += `- **Category:** ${feature_category}\n`;
    spec += `- **Target Segment:** ${user_segment}\n`;
    spec += `- **Platform:** ${platform}\n`;
    spec += `- **Prerequisites:** ${prerequisites.length > 0 ? prerequisites.join(", ") : "None"}\n\n`;

    for (let i = 1; i <= feature_count; i++) {
      const componentName = feature_names[i-1] || `Feature Component ${i}`;
      spec += `### Spec ${i}: ${componentName}\n`;
      spec += "#### Prerequisites\n";
      spec += `- ${prerequisites[i-1] || "Core game loop established"}\n\n`;

      spec += "#### User Flow\n";
      spec += "1. **Trigger:** User completes prerequisite action.\n";
      spec += "2. **Simple Interaction:** Basic entry point (e.g., a simple button or visual cue).\n";
      spec += "3. **Decomposition:** Interaction reveals deeper functionality as user demonstrates mastery.\n\n";

      spec += "#### Error States\n";
      spec += "- **State A:** Prerequisite data missing -> Show 'Preparation' state instead of locked state.\n";
      spec += "- **State B:** Interaction timeout -> Reset to simple state with helpful tip.\n\n";

      spec += "#### Success Metrics\n";
      spec += "- Conversion from simple to deep interaction > 30%.\n";
      spec += "- Feature retention after 7 days.\n\n";

      spec += "#### Core Value Reinforcement\n";
      spec += "This feature reinforces the core value of 'Divine Delirium' by rewarding player experimentation with increasingly chaotic visual feedback.\n\n";

      spec += "#### Pacing Recommendations\n";
      spec += "- Do not reveal deep controls until the user has successfully triggered the simple interaction 3 times.\n\n";

      spec += "#### Anti-Friction Checks\n";
      spec += "- [ ] UI is non-blocking during God's Pulse.\n";
      spec += "- [ ] Tooltips are concise (< 40 characters).\n\n";
    }

    return spec;
  }
}

export { FeatureSpecGenerator };

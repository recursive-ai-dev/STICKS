/**
 * UX-D4: Microcopy & Content Pack Generator
 * "Produce categorized UI text—empty states, errors, confirmations, onboarding—while maintaining tone constraints."
 *
 * AUDIT FIXES:
 * - Added JSDoc.
 * - Replaced non-deterministic Math.random with internal logic.
 * - Added safety for missing constraints.
 * - Fixed loop variable bug.
 */

class MicrocopyGenerator {
  /**
   * Generates a microcopy pack based on the provided inputs.
   * @param {Object} options
   * @param {Array<string>} options.content_contexts - [screens, modals, notifications, emails]
   * @param {Array<string>} options.tone_constraints - [brand voice attributes]
   * @param {Array<string>} options.avoid_list - [banned phrases, competitor terms, insensitive language]
   * @param {Array<string>} options.localization_prep - [languages for future translation]
   * @returns {string} Markdown formatted microcopy pack
   */
  generate(options) {
    const {
        content_contexts = ["General"],
        tone_constraints = ["Neutral"],
        avoid_list = [],
        localization_prep = ["en"]
    } = options;

    let pack = "# Microcopy & Content Pack\n\n";
    pack += "## Constraints\n";
    pack += `- **Tone:** ${tone_constraints.join(", ")}\n`;
    pack += `- **Avoid List:** ${avoid_list.length > 0 ? avoid_list.join(", ") : "None"}\n`;
    pack += `- **Localization:** ${localization_prep.join(", ")}\n\n`;

    content_contexts.forEach(context => {
      pack += `### Context: ${context}\n`;

      const categories = ["Informational", "Celebratory", "Error", "Warning"];

      categories.forEach(category => {
        pack += `#### ${category}\n`;
        for (let v = 1; v <= 3; v++) {
           pack += `- **Variation ${v}:** ${this.generateMockCopy(category, context, tone_constraints, v)}\n`;
        }
      });

      pack += "\n**Negative-Prompt List (To Avoid Repetition):**\n";
      pack += `- Don't use ${avoid_list[0] || "generic"} phrasing.\n`;
      pack += "- Avoid starting every sentence with 'You'.\n\n";
    });

    return pack;
  }

  /**
   * Logic to generate copy strings based on category and tone.
   * @param {string} category
   * @param {string} context
   * @param {string[]} tone
   * @param {number} variant
   */
  generateMockCopy(category, context, tone, variant) {
    const triggers = {
      "Informational": ["Reality is shifting.", "A new delusion has taken root.", "The God's Pulse approaches."],
      "Celebratory": ["Sanity lost! Glory gained!", "Your limbs have ascended.", "Chaos thrives in your wake."],
      "Error": ["The void refuses your request.", "Divine fracture prevented this action.", "Sanity levels too high to proceed."],
      "Warning": ["The God's Pulse is imminent.", "Your reality is fraying at the edges.", "Limbs are reaching critical tension."]
    };

    const choices = triggers[category] || ["..."];
    let text = choices[variant % choices.length];

    if (tone.includes("dark") || tone.includes("gothic")) {
      text = text.toUpperCase();
    }

    return text;
  }
}

export { MicrocopyGenerator };

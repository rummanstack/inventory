import { assert } from "../lib/errors.js";

function extractOutputText(payload) {
  return payload.output_text
    || payload.outputText
    || payload.steps?.flatMap((step) => step.content || step.output || [])
      .filter((item) => item?.type === "text" && item?.text)
      .map((item) => item.text)
      .join("\n")
    || payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n");
}

function parseJsonFromText(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text || "").match(/\{[\s\S]*\}/);
    assert(match, "AI returned an unreadable response.", 502);
    return JSON.parse(match[0]);
  }
}

export class GeminiProvider {
  constructor(env) {
    this.apiKey = env.GEMINI_API_KEY;
    this.model = env.GEMINI_MODEL || "gemini-3.5-flash";
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/interactions";
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async requestInteraction({ systemInstruction, input, generationConfig = {} }) {
    assert(this.isConfigured(), "Gemini is not configured. Add GEMINI_API_KEY to backend/.env.", 503);

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({
        model: this.model,
        system_instruction: systemInstruction,
        input,
        generation_config: {
          temperature: 0.3,
          thinking_level: "low",
          ...generationConfig,
        },
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || "Gemini request failed.";
      const error = new Error(message);
      error.status = response.status >= 500 ? 502 : response.status;
      throw error;
    }

    const outputText = extractOutputText(payload);
    assert(outputText, "Gemini returned no text.", 502);
    return outputText;
  }

  async generateText({ systemInstruction, input }) {
    return this.requestInteraction({ systemInstruction, input });
  }

  async generateJson({ systemInstruction, input, schemaHint }) {
    const outputText = await this.requestInteraction({
      systemInstruction,
      input: `${input}\n\nReturn only valid JSON matching this shape:\n${JSON.stringify(schemaHint, null, 2)}`,
      generationConfig: { temperature: 0.2 },
    });

    return parseJsonFromText(outputText);
  }
}

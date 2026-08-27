import { describe, it, expect } from "vitest";
import { checkText, checkMatching, checkFillInTheBlank } from "./exercise-validation";

describe("checkText", () => {
  it("matches case-insensitively and ignores surrounding whitespace", () => {
    expect(checkText("  Kamisaraki  ", "kamisaraki")).toBe(true);
  });

  it("rejects a wrong answer", () => {
    expect(checkText("waliki", "kamisaraki")).toBe(false);
  });

  it("rejects when the correct answer is null", () => {
    expect(checkText("kamisaraki", null)).toBe(false);
  });
});

describe("checkMatching", () => {
  const pairs = [
    { aymara_word: "ampara" },
    { aymara_word: "anu" },
  ];

  it("accepts a complete correct mapping by position", () => {
    expect(checkMatching(JSON.stringify(["ampara", "anu"]), pairs)).toBe(true);
  });

  it("rejects a partial mapping even if the submitted values are correct", () => {
    expect(checkMatching(JSON.stringify(["ampara"]), pairs)).toBe(false);
  });

  it("rejects a mismatched pair", () => {
    expect(checkMatching(JSON.stringify(["anu", "ampara"]), pairs)).toBe(false);
  });

  it("rejects invalid JSON instead of throwing", () => {
    expect(checkMatching("not json", pairs)).toBe(false);
  });

  it("rejects an empty submission against non-empty pairs", () => {
    expect(checkMatching("[]", pairs)).toBe(false);
  });

  it("handles pairs with repeated spanish_word labels correctly by position (regression)", () => {
    const grouped = [{ aymara_word: "p" }, { aymara_word: "p'" }, { aymara_word: "ph" }];
    expect(checkMatching(JSON.stringify(["p", "p'", "ph"]), grouped)).toBe(true);
    expect(checkMatching(JSON.stringify(["p", "ph", "p'"]), grouped)).toBe(false);
  });
});

describe("checkFillInTheBlank", () => {
  const validAnswers = ["fonémico", "Fonemico"];

  it("accepts any case-insensitive match among valid answers", () => {
    expect(checkFillInTheBlank(JSON.stringify(["fonemico"]), validAnswers)).toBe(true);
  });

  it("rejects when no submitted value matches", () => {
    expect(checkFillInTheBlank(JSON.stringify(["fonetico"]), validAnswers)).toBe(false);
  });

  it("rejects invalid JSON instead of throwing", () => {
    expect(checkFillInTheBlank("not json", validAnswers)).toBe(false);
  });
});

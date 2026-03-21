import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildMedicalVerificationNotes,
  extractCriticalDetails,
  shouldEscalateMedicalVerification,
  summarizeTranscriptionLogprobs,
} from "../src/lib/medicalSafety.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(scriptDir, "medical-safety-cases.json");
const fixtures = JSON.parse(readFileSync(fixturePath, "utf8"));

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

for (const testCase of fixtures.translationCases) {
  const escalated = shouldEscalateMedicalVerification(testCase.text);
  if (escalated !== testCase.expectEscalation) {
    fail(`${testCase.id}: expected escalation=${testCase.expectEscalation}, got ${escalated}`);
    continue;
  }

  if (testCase.expectedNoteKeywords?.length) {
    const notes = buildMedicalVerificationNotes(testCase.text).join(" ").toLowerCase();
    const missingKeyword = testCase.expectedNoteKeywords.find(
      (keyword) => !notes.includes(keyword.toLowerCase())
    );
    if (missingKeyword) {
      fail(`${testCase.id}: missing verification note keyword "${missingKeyword}"`);
      continue;
    }
  }

  if (testCase.expectedDetailKeywords?.length) {
    const details = extractCriticalDetails(testCase.text).join(" ").toLowerCase();
    const missingKeyword = testCase.expectedDetailKeywords.find(
      (keyword) => !details.includes(keyword.toLowerCase())
    );
    if (missingKeyword) {
      fail(`${testCase.id}: missing critical detail keyword "${missingKeyword}"`);
      continue;
    }
  }

  pass(`${testCase.id}: escalation and seeded expectations matched`);
}

for (const testCase of fixtures.speechCases) {
  const summary = summarizeTranscriptionLogprobs(testCase.logprobs);
  if (summary.confidence !== testCase.expectedConfidence) {
    fail(
      `${testCase.id}: expected speech confidence=${testCase.expectedConfidence}, got ${summary.confidence}`
    );
    continue;
  }

  pass(`${testCase.id}: speech confidence matched ${summary.confidence}`);
}

if (failures > 0) {
  console.error(`\n${failures} seeded medical safety check(s) failed.`);
  process.exit(1);
}

console.log("\nAll seeded medical safety checks passed.");

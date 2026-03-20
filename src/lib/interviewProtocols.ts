import {
  ClinicalReasoningData,
  DifferentialUrgency,
  ProtocolScreeningItem,
  ProtocolSummary,
} from "@/types";

interface ConversationMessage {
  role: "patient" | "provider";
  text: string;
}

interface ProtocolItemDefinition {
  id: string;
  label: string;
  priority: DifferentialUrgency;
  question: string;
  rationale: string;
  askPatterns: string[];
  mentionPatterns?: string[];
}

interface ProtocolDefinition {
  id: string;
  label: string;
  triggerPatterns: string[];
  items: ProtocolItemDefinition[];
}

interface NormalizedMessage extends ConversationMessage {
  normalizedText: string;
}

interface InternalProtocolMatch {
  summary: ProtocolSummary;
  score: number;
}

export interface ProtocolPriorityGap {
  protocolId: string;
  protocolLabel: string;
  item: ProtocolScreeningItem;
}

export interface ProtocolAnalysisResult {
  protocols: ProtocolSummary[];
  promptBlock: string;
  highestPriorityGap: ProtocolPriorityGap | null;
  blocksAssessment: boolean;
}

const PRIORITY_ORDER: Record<DifferentialUrgency, number> = {
  critical: 0,
  urgent: 1,
  routine: 2,
};

const PROTOCOL_DEFINITIONS: ProtocolDefinition[] = [
  {
    id: "chest_pain",
    label: "Chest Pain Pathway",
    triggerPatterns: [
      "chest pain",
      "pain in my chest",
      "pressure in my chest",
      "chest pressure",
      "chest tightness",
      "tightness in my chest",
    ],
    items: [
      {
        id: "cp_syncope",
        label: "Syncope or near-syncope",
        priority: "critical",
        question: "Did you pass out or feel like you might pass out?",
        rationale: "Chest pain with syncope can signal immediately dangerous cardiac or vascular disease.",
        askPatterns: ["pass out", "faint", "black out", "lose consciousness"],
        mentionPatterns: ["passed out", "fainted", "almost fainted", "blacked out"],
      },
      {
        id: "cp_pleuritic",
        label: "Pleuritic component",
        priority: "critical",
        question: "Does the pain get worse when you take a deep breath?",
        rationale: "Pleuritic pain can point toward pulmonary embolism, pneumothorax, or pericarditis.",
        askPatterns: ["deep breath", "breathe in", "breathing in", "worse when you breathe"],
        mentionPatterns: ["worse when i breathe", "hurts to breathe", "pain with deep breath"],
      },
      {
        id: "cp_radiation",
        label: "Radiation to arm, jaw, or back",
        priority: "urgent",
        question: "Does the pain move into your arm, jaw, or back?",
        rationale: "Radiation helps risk-stratify acute coronary syndrome and aortic pathology.",
        askPatterns: ["arm, jaw, or back", "arm or jaw", "move to your arm", "move into your back", "radiate"],
        mentionPatterns: ["into my arm", "into my jaw", "into my back", "radiates"],
      },
      {
        id: "cp_tearing_back",
        label: "Sudden tearing pain to the back",
        priority: "critical",
        question: "Did the pain start all at once and go into your back?",
        rationale: "Sudden chest pain radiating to the back raises concern for aortic catastrophe.",
        askPatterns: ["all at once", "go into your back", "suddenly", "tearing"],
        mentionPatterns: ["all at once", "sudden", "tearing", "to my back"],
      },
    ],
  },
  {
    id: "shortness_of_breath",
    label: "Shortness Of Breath Pathway",
    triggerPatterns: [
      "shortness of breath",
      "hard to breathe",
      "trouble breathing",
      "difficulty breathing",
      "cannot breathe",
      "can't breathe",
      "breathless",
      "wheezing",
    ],
    items: [
      {
        id: "sob_full_sentences",
        label: "Can speak full sentences",
        priority: "critical",
        question: "Can you speak in full sentences right now?",
        rationale: "Inability to speak full sentences can indicate severe respiratory distress.",
        askPatterns: ["full sentences", "one sentence", "talk in full"],
        mentionPatterns: ["cannot talk", "can't talk", "one word", "hard to talk"],
      },
      {
        id: "sob_chest_pain",
        label: "Associated chest pain",
        priority: "critical",
        question: "Do you also have chest pain?",
        rationale: "Shortness of breath with chest pain changes the immediate differential and workup.",
        askPatterns: ["also have chest pain", "chest pain too"],
        mentionPatterns: ["chest pain"],
      },
      {
        id: "sob_fever_cough",
        label: "Fever or cough",
        priority: "urgent",
        question: "Do you also have a fever or cough?",
        rationale: "Fever or cough changes the likelihood of pneumonia or other infections.",
        askPatterns: ["fever or cough", "cough or fever"],
        mentionPatterns: ["fever", "cough"],
      },
      {
        id: "sob_leg_swelling",
        label: "One-leg swelling",
        priority: "urgent",
        question: "Is one leg more swollen than the other?",
        rationale: "Unilateral leg swelling can be a clue to venous thromboembolism.",
        askPatterns: ["one leg", "leg swollen", "leg swelling"],
        mentionPatterns: ["one leg is swollen", "leg swelling", "swollen leg"],
      },
      {
        id: "sob_allergy_trigger",
        label: "Possible allergy trigger",
        priority: "urgent",
        question: "Did this start after a new food, medicine, or sting?",
        rationale: "A sudden exposure trigger raises concern for anaphylaxis.",
        askPatterns: ["new food", "new medicine", "sting", "allergy trigger"],
        mentionPatterns: ["after food", "after medicine", "after a sting", "after a bee sting"],
      },
    ],
  },
  {
    id: "headache",
    label: "Headache Pathway",
    triggerPatterns: ["headache", "head pain", "migraine", "my head hurts"],
    items: [
      {
        id: "ha_thunderclap",
        label: "Thunderclap onset",
        priority: "critical",
        question: "Did the headache hit all at once within seconds?",
        rationale: "Thunderclap onset raises concern for hemorrhage and other emergencies.",
        askPatterns: ["all at once", "within seconds", "thunderclap", "suddenly hit"],
        mentionPatterns: ["all at once", "within seconds", "sudden severe headache"],
      },
      {
        id: "ha_neuro",
        label: "Weakness, vision, or speech change",
        priority: "critical",
        question: "Do you have weakness, trouble speaking, or trouble seeing?",
        rationale: "Neurologic deficits with headache can indicate stroke, bleed, or mass effect.",
        askPatterns: ["trouble speaking", "trouble seeing", "weakness", "vision change"],
        mentionPatterns: ["weakness", "can't speak", "blurred vision", "double vision", "vision loss"],
      },
      {
        id: "ha_fever_neck",
        label: "Fever or stiff neck",
        priority: "critical",
        question: "Do you have a fever or a stiff neck?",
        rationale: "Meningitis and encephalitis must be screened in high-risk headache presentations.",
        askPatterns: ["stiff neck", "fever", "neck stiffness"],
        mentionPatterns: ["stiff neck", "fever", "neck is stiff"],
      },
      {
        id: "ha_head_trauma",
        label: "Recent head trauma",
        priority: "urgent",
        question: "Did you hit your head before this started?",
        rationale: "Recent trauma changes the risk of intracranial bleeding.",
        askPatterns: ["hit your head", "head injury", "trauma"],
        mentionPatterns: ["hit my head", "fell and hit", "head injury"],
      },
    ],
  },
  {
    id: "abdominal_pain",
    label: "Abdominal Pain Pathway",
    triggerPatterns: [
      "abdominal pain",
      "stomach pain",
      "belly pain",
      "pain in my stomach",
      "pain in my belly",
      "pain in my abdomen",
    ],
    items: [
      {
        id: "abd_pregnancy",
        label: "Possible pregnancy",
        priority: "critical",
        question: "Could you be pregnant?",
        rationale: "Pregnancy changes the differential and can signal ectopic or obstetric emergency.",
        askPatterns: ["pregnant", "pregnancy", "could you be pregnant"],
        mentionPatterns: ["i am pregnant", "could be pregnant", "pregnant"],
      },
      {
        id: "abd_gi_bleeding",
        label: "Blood in vomit or black stool",
        priority: "critical",
        question: "Have you vomited blood or passed black stool?",
        rationale: "GI bleeding changes acuity and immediate workup.",
        askPatterns: ["vomited blood", "black stool", "bloody stool", "blood in vomit"],
        mentionPatterns: ["vomited blood", "black stool", "blood in my stool", "bloody vomit"],
      },
      {
        id: "abd_lateralized",
        label: "Pain mostly on one side",
        priority: "urgent",
        question: "Is the pain mostly on one side?",
        rationale: "Focal pain can point toward appendicitis, cholecystitis, torsion, or ectopic pregnancy.",
        askPatterns: ["one side", "right side", "left side"],
        mentionPatterns: ["right side", "left side", "one side"],
      },
      {
        id: "abd_fever_vomiting",
        label: "Fever or vomiting",
        priority: "urgent",
        question: "Do you also have fever or vomiting?",
        rationale: "Fever and vomiting help assess infection, obstruction, and systemic illness.",
        askPatterns: ["fever or vomiting", "vomiting or fever"],
        mentionPatterns: ["fever", "vomiting", "throwing up"],
      },
    ],
  },
  {
    id: "fever_infection",
    label: "Fever Or Infection Pathway",
    triggerPatterns: ["fever", "chills", "infection", "high temperature", "sepsis"],
    items: [
      {
        id: "fever_confusion",
        label: "Confusion or hard to wake",
        priority: "critical",
        question: "Are you confused or harder to wake up than normal?",
        rationale: "Altered mental status with infection raises concern for sepsis or CNS infection.",
        askPatterns: ["confused", "hard to wake", "sleepy", "altered"],
        mentionPatterns: ["confused", "hard to wake", "very sleepy", "not acting normal"],
      },
      {
        id: "fever_sob",
        label: "Shortness of breath",
        priority: "critical",
        question: "Are you short of breath?",
        rationale: "Respiratory compromise changes the immediate triage approach to infection.",
        askPatterns: ["short of breath", "hard to breathe", "trouble breathing"],
        mentionPatterns: ["short of breath", "hard to breathe", "trouble breathing"],
      },
      {
        id: "fever_rash_neck",
        label: "Rash or stiff neck",
        priority: "urgent",
        question: "Do you have a new rash or a stiff neck?",
        rationale: "Rash or neck stiffness raises concern for invasive infection.",
        askPatterns: ["new rash", "stiff neck", "rash or a stiff neck"],
        mentionPatterns: ["rash", "stiff neck", "neck is stiff"],
      },
      {
        id: "fever_immunocompromised",
        label: "Weakened immune system",
        priority: "urgent",
        question: "Do you take medicines that weaken your immune system?",
        rationale: "Immunocompromise changes both risk and urgency of infectious complaints.",
        askPatterns: ["weaken your immune system", "chemo", "transplant", "immune system"],
        mentionPatterns: ["chemo", "transplant", "immune system is weak", "steroids"],
      },
    ],
  },
  {
    id: "pregnancy_bleeding",
    label: "Pregnancy Or Vaginal Bleeding Pathway",
    triggerPatterns: [
      "pregnant",
      "pregnancy",
      "vaginal bleeding",
      "bleeding in pregnancy",
      "missed period",
      "late period",
      "pelvic pain",
    ],
    items: [
      {
        id: "preg_heavy_bleeding",
        label: "Heavy bleeding or clots",
        priority: "critical",
        question: "Are you soaking pads or passing large clots?",
        rationale: "Heavy bleeding affects stability and urgency.",
        askPatterns: ["soaking pads", "large clots", "heavy bleeding"],
        mentionPatterns: ["soaking pads", "large clots", "heavy bleeding"],
      },
      {
        id: "preg_one_sided_syncope",
        label: "One-sided pain or syncope",
        priority: "critical",
        question: "Do you have one-sided pain or did you pass out?",
        rationale: "One-sided pain or syncope in possible pregnancy raises ectopic concern.",
        askPatterns: ["one-sided pain", "pass out", "faint"],
        mentionPatterns: ["one-sided pain", "passed out", "fainted"],
      },
      {
        id: "preg_lmp",
        label: "Last menstrual period",
        priority: "urgent",
        question: "When was your last period?",
        rationale: "Dating and pregnancy probability are essential in abdominal or bleeding complaints.",
        askPatterns: ["last period", "last menstrual", "lmp"],
        mentionPatterns: ["last period", "my period was", "lmp"],
      },
      {
        id: "preg_positive_test",
        label: "Positive pregnancy test",
        priority: "urgent",
        question: "Have you had a positive pregnancy test?",
        rationale: "A known positive test changes risk framing immediately.",
        askPatterns: ["positive pregnancy test", "pregnancy test"],
        mentionPatterns: ["positive pregnancy test", "test was positive"],
      },
    ],
  },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatEvidence(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (cleaned.length <= 140) return cleaned;
  return `${cleaned.slice(0, 137)}...`;
}

function findPatterns(text: string, patterns: string[]): string[] {
  return patterns.filter((pattern) => text.includes(normalizeText(pattern)));
}

function findSpontaneousEvidence(
  messages: NormalizedMessage[],
  patterns: string[]
): string | undefined {
  const match = messages.find(
    (message) =>
      message.role === "patient" &&
      findPatterns(message.normalizedText, patterns).length > 0
  );

  return match ? formatEvidence(match.text) : undefined;
}

function findAskedAndAnsweredEvidence(
  messages: NormalizedMessage[],
  patterns: string[]
): string | undefined {
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];

    if (
      message.role !== "provider" ||
      findPatterns(message.normalizedText, patterns).length === 0
    ) {
      continue;
    }

    const response = messages
      .slice(index + 1)
      .find((candidate) => candidate.role === "patient");

    if (response) {
      return formatEvidence(response.text);
    }
  }

  return undefined;
}

function buildProtocolSummary(
  definition: ProtocolDefinition,
  messages: NormalizedMessage[],
  matchedBy: string[]
): ProtocolSummary {
  const screening = definition.items.map<ProtocolScreeningItem>((item) => {
    const patterns = item.mentionPatterns ?? item.askPatterns;
    const spontaneousEvidence = findSpontaneousEvidence(messages, patterns);
    const askedAndAnsweredEvidence = findAskedAndAnsweredEvidence(messages, item.askPatterns);
    const evidence = spontaneousEvidence || askedAndAnsweredEvidence;

    return {
      id: item.id,
      label: item.label,
      priority: item.priority,
      question: item.question,
      rationale: item.rationale,
      status: evidence ? "addressed" : "missing",
      evidence,
    };
  });

  const addressedCount = screening.filter((item) => item.status === "addressed").length;
  const criticalGaps = screening
    .filter((item) => item.status === "missing" && item.priority === "critical")
    .map((item) => item.label);
  const urgentGaps = screening
    .filter((item) => item.status === "missing" && item.priority === "urgent")
    .map((item) => item.label);
  const nextPriorityQuestion = screening
    .filter((item) => item.status === "missing")
    .sort((left, right) => PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority])[0]?.question;

  return {
    id: definition.id,
    label: definition.label,
    matchReason: `Matched by: ${matchedBy.join(", ")}`,
    completion: Math.round((addressedCount / screening.length) * 100),
    nextPriorityQuestion,
    criticalGaps,
    urgentGaps,
    screening,
  };
}

function buildPromptBlock(protocols: ProtocolSummary[]): string {
  if (protocols.length === 0) {
    return "No symptom protocol matched strongly enough. Use the general emergency interview framework and keep screening life-threatening causes first.";
  }

  return [
    "Protocol guidance:",
    ...protocols.map((protocol) => {
      const missingItems = protocol.screening
        .filter((item) => item.status === "missing")
        .map((item) => `${item.priority.toUpperCase()}: ${item.label} -> Ask: ${item.question}`);

      return [
        `- ${protocol.label} (${protocol.matchReason}; completion ${protocol.completion}%)`,
        ...missingItems.map((item) => `  ${item}`),
      ].join("\n");
    }),
    "If a protocol has missing CRITICAL items, highest_priority_gap and next_question should address the top missing protocol item, and ready_for_assessment should stay false until those critical items are addressed.",
  ].join("\n");
}

function comparePriorityGaps(
  left: ProtocolPriorityGap,
  right: ProtocolPriorityGap,
  scoreMap: Map<string, number>
): number {
  const priorityDiff = PRIORITY_ORDER[left.item.priority] - PRIORITY_ORDER[right.item.priority];
  if (priorityDiff !== 0) return priorityDiff;

  const scoreDiff = (scoreMap.get(right.protocolId) ?? 0) - (scoreMap.get(left.protocolId) ?? 0);
  if (scoreDiff !== 0) return scoreDiff;

  return left.item.label.localeCompare(right.item.label);
}

export function analyzeInterviewProtocols(messages: ConversationMessage[]): ProtocolAnalysisResult {
  const normalizedMessages = messages.map((message) => ({
    ...message,
    normalizedText: normalizeText(message.text),
  }));
  const patientText = normalizeText(
    messages
      .filter((message) => message.role === "patient")
      .map((message) => message.text)
      .join(" ")
  );

  const matches = PROTOCOL_DEFINITIONS.map<InternalProtocolMatch | null>((definition) => {
    const matchedBy = findPatterns(patientText, definition.triggerPatterns);
    if (matchedBy.length === 0) return null;

    return {
      summary: buildProtocolSummary(definition, normalizedMessages, matchedBy),
      score: matchedBy.length,
    };
  })
    .filter((match): match is InternalProtocolMatch => Boolean(match))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  const scoreMap = new Map(matches.map((match) => [match.summary.id, match.score]));
  const priorityGaps = matches
    .flatMap((match) =>
      match.summary.screening
        .filter((item) => item.status === "missing")
        .map<ProtocolPriorityGap>((item) => ({
          protocolId: match.summary.id,
          protocolLabel: match.summary.label,
          item,
        }))
    )
    .sort((left, right) => comparePriorityGaps(left, right, scoreMap));

  return {
    protocols: matches.map((match) => match.summary),
    promptBlock: buildPromptBlock(matches.map((match) => match.summary)),
    highestPriorityGap: priorityGaps[0] ?? null,
    blocksAssessment: matches.some((match) =>
      match.summary.screening.some(
        (item) => item.status === "missing" && item.priority === "critical"
      )
    ),
  };
}

export function applyProtocolGuidance(
  reasoning: ClinicalReasoningData,
  protocolAnalysis: ProtocolAnalysisResult
): ClinicalReasoningData {
  const highestGap = protocolAnalysis.highestPriorityGap;
  const protocolUnscreened = protocolAnalysis.protocols
    .flatMap((protocol) =>
      protocol.screening
        .filter((item) => item.status === "missing")
        .map((item) => item.label)
    )
    .filter((label, index, labels) => labels.indexOf(label) === index);
  const existingUnscreened = new Set(
    reasoning.redFlags.unscreened.map((label) => label.toLowerCase())
  );
  const mergedUnscreened = [
    ...reasoning.redFlags.unscreened,
    ...protocolUnscreened.filter((label) => !existingUnscreened.has(label.toLowerCase())),
  ];

  // Only override nextQuestion with protocol gap if the AI's question is empty or
  // if the protocol gap is critical AND the AI picked a routine topic.
  // This prevents overriding the AI's de-duplication logic with already-asked protocol questions.
  const shouldOverride = highestGap &&
    highestGap.item.priority === "critical" &&
    (!reasoning.nextQuestion || reasoning.nextQuestion === "What worries you the most right now?");
  const nextQuestion = shouldOverride ? highestGap!.item.question : reasoning.nextQuestion;
  const highestPriorityGap = highestGap
    ? {
        label: highestGap.item.label,
        rationale: `${highestGap.protocolLabel}: ${highestGap.item.rationale}`,
      }
    : reasoning.highestPriorityGap;
  const readinessRationale = protocolAnalysis.blocksAssessment
    ? `${reasoning.readinessRationale} Protocol guardrail: ${highestGap?.protocolLabel || "active pathway"} still has unresolved critical screening.`
    : reasoning.readinessRationale;

  return {
    ...reasoning,
    redFlags: {
      ...reasoning.redFlags,
      unscreened: mergedUnscreened,
    },
    protocols: protocolAnalysis.protocols,
    highestPriorityGap,
    nextQuestion,
    readyForAssessment: protocolAnalysis.blocksAssessment
      ? false
      : reasoning.readyForAssessment,
    readinessRationale,
  };
}

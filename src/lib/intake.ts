import { IntakeQuestion } from "@/types";

export const intakeQuestions: IntakeQuestion[] = [
  {
    id: "chief",
    emoji: "\u{1F3E5}",
    question: "What brings you in today?",
    category: "chief",
  },
  {
    id: "pain-yn",
    emoji: "\u{1F915}",
    question: "Are you in any pain right now?",
    category: "pain",
  },
  {
    id: "pain-where",
    emoji: "\u{1F4CD}",
    question: "Where is the pain? Can you point to it?",
    category: "pain",
  },
  {
    id: "pain-scale",
    emoji: "\u{1F4CA}",
    question: "On a scale from 1 to 10, how bad is the pain?",
    category: "pain",
  },
  {
    id: "pain-type",
    emoji: "\u{1F525}",
    question: "What does the pain feel like? Sharp, dull, burning, or pressure?",
    category: "pain",
  },
  {
    id: "pain-duration",
    emoji: "\u23F0",
    question: "When did the pain start?",
    category: "pain",
  },
  {
    id: "allergy",
    emoji: "\u26A0\uFE0F",
    question: "Do you have any allergies to medications?",
    category: "allergy",
  },
  {
    id: "medication",
    emoji: "\u{1F48A}",
    question: "Are you currently taking any medications?",
    category: "medication",
  },
  {
    id: "history",
    emoji: "\u{1F4CB}",
    question: "Do you have any medical conditions we should know about?",
    category: "history",
  },
  {
    id: "surgery",
    emoji: "\u{1FA7A}",
    question: "Have you had any surgeries before?",
    category: "history",
  },
];

export const intakeCategories = [
  { key: "chief" as const, label: "Chief Complaint", emoji: "\u{1F3E5}" },
  { key: "pain" as const, label: "Pain Assessment", emoji: "\u{1F915}" },
  { key: "allergy" as const, label: "Allergies", emoji: "\u26A0\uFE0F" },
  { key: "medication" as const, label: "Medications", emoji: "\u{1F48A}" },
  { key: "history" as const, label: "Medical History", emoji: "\u{1F4CB}" },
];

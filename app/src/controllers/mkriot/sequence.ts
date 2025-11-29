import * as Tone from "tone";
import {
  MAX_ALARM_STEPS,
  MIN_NOTE_FREQ,
  MAX_NOTE_FREQ,
  MIN_NOTE_DURATION_MS,
  MAX_NOTE_DURATION_MS,
  DEFAULT_NOTE_DURATION_MS,
} from "./constants";
import type { MelodyStep } from "./types";

const NOTE_SEPARATOR = "@";
const TOKEN_DELIMITER = /\s+/;

export function parseMelodyInput(input: string): MelodyStep[] {
  const tokens = tokenizeMelodyInput(input);
  const steps: MelodyStep[] = [];

  for (const token of tokens) {
    try {
      steps.push(parseTokenToStep(token));
      if (steps.length >= MAX_ALARM_STEPS) {
        break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(message);
    }
  }

  return steps;
}

export function normalizeMelodySequence(input: string) {
  const steps = parseMelodyInput(input);
  if (!steps.length) {
    throw new Error("Agrega al menos una entrada con formato nota@duración.");
  }
  const sequence = steps
    .map(({ freq, duration }) => {
      if (duration === DEFAULT_NOTE_DURATION_MS) {
        return `${freq}`;
      }
      return `${freq}@${duration}`;
    })
    .join(" ");
  return { steps, sequence };
}

function tokenizeMelodyInput(input: string): string[] {
  if (!input?.trim()) {
    return [];
  }
  return input.trim().split(TOKEN_DELIMITER).filter(Boolean);
}

function parseTokenToStep(token: string): MelodyStep {
  const { notePart, durationPart } = splitToken(token);
  const freq = resolveFrequency(notePart);
  const duration = resolveDuration(durationPart);
  return { freq, duration };
}

function splitToken(token: string) {
  const [notePart, durationPart] = token.split(NOTE_SEPARATOR);
  return { notePart, durationPart };
}

function resolveFrequency(rawNote?: string): number {
  const noteText = sanitizeTokenPart(rawNote);
  if (!noteText) {
    throw new Error("Agrega una nota musical antes del separador @.");
  }

  if (isNumericNote(noteText)) {
    return clampInteger(Number.parseFloat(noteText), MIN_NOTE_FREQ, MAX_NOTE_FREQ);
  }

  const derivedFrequency = convertNoteToFrequency(noteText);
  return clampInteger(derivedFrequency, MIN_NOTE_FREQ, MAX_NOTE_FREQ);
}

function resolveDuration(rawDuration?: string): number {
  const durationText = sanitizeTokenPart(rawDuration);
  const multiplier = durationText?.length
    ? Number.parseFloat(durationText)
    : 1;

  if (!Number.isFinite(multiplier)) {
    throw new Error(`La duración "${rawDuration}" no es válida.`);
  }

  const durationValue = multiplier * DEFAULT_NOTE_DURATION_MS;

  return clampInteger(durationValue, MIN_NOTE_DURATION_MS, MAX_NOTE_DURATION_MS);
}

function sanitizeTokenPart(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isNumericNote(value: string): boolean {
  return Number.isFinite(Number.parseFloat(value));
}

function convertNoteToFrequency(noteText: string): number {
  try {
    const frequency = Tone.Frequency(noteText).toFrequency();
    if (!Number.isFinite(frequency)) {
      throw new Error();
    }
    return frequency;
  } catch {
    throw new Error(`La nota "${noteText}" no es válida.`);
  }
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(Math.trunc(value), min), max);
}

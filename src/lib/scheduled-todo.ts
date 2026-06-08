export interface ScheduledTodoValue {
  title: string;
  dateKey: string;
  time: string | null;
  location: string;
}

export type ScheduledTodoParseResult =
  | { kind: "plain"; text: string }
  | { kind: "invalid"; text: string; errors: string[] }
  | { kind: "scheduled"; value: ScheduledTodoValue };

const DATE_TOKEN_PATTERN = /\((\d{6})\)/g;
const BRACKET_TOKEN_PATTERN = /\[([^\]]*)\]/g;
const LOCATION_TOKEN_PATTERN = /\{([^}]*)\}/;
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function parseDateToken(token: string) {
  const day = Number(token.slice(0, 2));
  const month = Number(token.slice(2, 4));
  const year = 2000 + Number(token.slice(4, 6));

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function formatDateToken(dateKey: string) {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) return "";
  return `${match[3]}${match[2]}${match[1].slice(2)}`;
}

function parseTimeToken(token: string) {
  if (!/^\d{4}$/.test(token)) return null;
  const hour = Number(token.slice(0, 2));
  const minute = Number(token.slice(2, 4));
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${pad2(hour)}:${pad2(minute)}`;
}

function formatTimeToken(time: string | null | undefined) {
  if (!time) return "";
  const compact = time.includes(":") ? time.replace(":", "") : time;
  return /^\d{4}$/.test(compact) ? compact : "";
}

export function parseScheduledTodoSyntax(text: string): ScheduledTodoParseResult {
  const original = text;
  const dateTokens = Array.from(original.matchAll(DATE_TOKEN_PATTERN));
  if (!dateTokens.length) return { kind: "plain", text: original };

  const invalidDateTokens: string[] = [];
  let selectedDate: { token: RegExpExecArray; dateKey: string } | null = null;

  for (const token of dateTokens) {
    const dateKey = parseDateToken(token[1]);
    if (dateKey) {
      selectedDate = { token, dateKey };
      break;
    }
    invalidDateTokens.push(token[1]);
  }

  if (!selectedDate) {
    return {
      kind: "invalid",
      text: original,
      errors: [`Invalid date${invalidDateTokens.length > 1 ? "s" : ""}: ${invalidDateTokens.join(", ")}`]
    };
  }

  const index = selectedDate.token.index ?? 0;
  const title = original.slice(0, index).trim();
  const rest = original.slice(index + selectedDate.token[0].length);
  const errors: string[] = [];

  if (!title) errors.push("Title is required before the date.");

  const bracketTokens = Array.from(rest.matchAll(BRACKET_TOKEN_PATTERN));
  let time: string | null = null;
  if (bracketTokens.length) {
    const parsedTime = parseTimeToken(bracketTokens[0][1].trim());
    if (parsedTime) {
      time = parsedTime;
    } else {
      errors.push(`Invalid time: ${bracketTokens[0][1].trim() || "empty"}`);
    }
  } else if (rest.includes("[") || rest.includes("]")) {
    errors.push("Invalid time syntax. Expected [HHMM].");
  }

  const locationMatch = rest.match(LOCATION_TOKEN_PATTERN);
  const location = locationMatch?.[1].trim() ?? "";

  if (errors.length) return { kind: "invalid", text: original, errors };

  return {
    kind: "scheduled",
    value: {
      title,
      dateKey: selectedDate.dateKey,
      time,
      location
    }
  };
}

export function formatScheduledTodoSyntax(value: ScheduledTodoValue) {
  const parts = [`${value.title.trim()} (${formatDateToken(value.dateKey)})`];
  const time = formatTimeToken(value.time);
  if (time) parts.push(`[${time}]`);
  if (value.location.trim()) parts.push(`{${value.location.trim()}}`);
  return parts.join(" ");
}

export function scheduledTodoValidationMessage(result: ScheduledTodoParseResult) {
  return result.kind === "invalid" ? `${result.errors.join(" ")} Expected format: (DDMMYY) [HHMM] {Location}.` : "";
}

import { addDaysToDateKey, dateKeyToLocalDate, localDateKey } from "@/lib/dates";

export type CommandPageParseResult =
  | {
      type: "task";
      title: string;
      plannedDate: string | null;
      dueDate: string | null;
      scheduledTime: string | null;
    }
  | {
      type: "date";
      title: string;
      date: string;
      time: string | null;
    }
  | {
      type: "none";
    }
  | {
      type: "error";
      message: string;
    };

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Boolean(dateKeyToLocalDate(value));
}

function isTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function paddedDateKey(year: number, month: number, day: number) {
  const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isDateKey(key) ? key : null;
}

function relativeDateToken(token: string, today: string) {
  const lower = token.toLowerCase();
  if (lower === "today") return today;
  if (lower === "tomorrow") return addDaysToDateKey(today, 1) ?? today;
  return null;
}

function parseDateValue(value: string, today: string) {
  const trimmed = value.trim();
  const relative = relativeDateToken(trimmed, today);
  if (relative) return relative;
  if (isDateKey(trimmed)) return trimmed;

  const todayDate = dateKeyToLocalDate(today);
  const currentYear = todayDate?.getFullYear() ?? new Date().getFullYear();
  const currentMonth = (todayDate?.getMonth() ?? new Date().getMonth()) + 1;
  const normalized = trimmed.replace(/[/.]/g, "-");
  const full = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (full) return paddedDateKey(Number(full[1]), Number(full[2]), Number(full[3]));

  const compactFull = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactFull) return paddedDateKey(Number(compactFull[1]), Number(compactFull[2]), Number(compactFull[3]));

  const monthDay = normalized.match(/^(\d{1,2})-(\d{1,2})$/);
  if (monthDay) return paddedDateKey(currentYear, Number(monthDay[1]), Number(monthDay[2]));

  const compactMonthDay = trimmed.match(/^(\d{3,4})$/);
  if (compactMonthDay) {
    const digits = compactMonthDay[1];
    const splitAt = digits.length - 2;
    return paddedDateKey(currentYear, Number(digits.slice(0, splitAt)), Number(digits.slice(splitAt)));
  }

  const dayOnly = trimmed.match(/^(\d{1,2})$/);
  if (dayOnly) return paddedDateKey(currentYear, currentMonth, Number(dayOnly[1]));

  return null;
}

function parseBracketDateToken(token: string, today: string) {
  const match = token.match(/^\[([\d\s./-]+)\]$/);
  if (!match) return undefined;
  return parseDateValue(match[1], today);
}

function parseTimeValue(value: string) {
  const trimmed = value.trim().replace(".", ":");
  if (isTime(trimmed)) return trimmed;

  const hourOnly = trimmed.match(/^(\d{1,2})$/);
  if (hourOnly) {
    const hour = Number(hourOnly[1]);
    return hour >= 0 && hour <= 23 ? `${String(hour).padStart(2, "0")}:00` : null;
  }

  const compact = trimmed.match(/^(\d{3,4})$/);
  if (compact) {
    const digits = compact[1];
    const splitAt = digits.length - 2;
    const hour = Number(digits.slice(0, splitAt));
    const minute = Number(digits.slice(splitAt));
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
      ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
      : null;
  }

  const colon = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (colon) {
    const hour = Number(colon[1]);
    const minute = Number(colon[2]);
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
      ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
      : null;
  }

  return null;
}

function parseParenthesizedTimeToken(token: string) {
  const match = token.match(/^\(([\d\s:.]+)\)$/);
  if (!match) return undefined;
  return parseTimeValue(match[1]);
}

export function parseCommandPageLine(line: string, today = localDateKey()): CommandPageParseResult {
  const trimmed = line.trim();
  const command = trimmed.match(/^\/(task|date|deadline)\b/i)?.[1]?.toLowerCase();
  if (!command) return { type: "none" };
  const dateCommand = command === "date" || command === "deadline";

  const body = trimmed.replace(/^\/(task|date|deadline)\b/i, "").trim();
  if (!body) {
    return {
      type: "error",
      message: dateCommand ? "Add a title and date, like /date Exam [2026-07-10] (10:00)." : "Add a task title after /task."
    };
  }

  const tokens = body.split(/\s+/);
  const titleTokens: string[] = [];
  let plannedDate: string | null = null;
  let dueDate: string | null = null;
  let date: string | null = null;
  let time: string | null = null;

  for (const token of tokens) {
    const planned = token.match(/^planned:(.+)$/i)?.[1];
    const due = token.match(/^due:(.+)$/i)?.[1];
    const on = token.match(/^on:(.+)$/i)?.[1];
    const at = token.match(/^at:(.+)$/i)?.[1];
    const relative = relativeDateToken(token, today);
    const bracketDate = parseBracketDateToken(token, today);
    const parenthesizedTime = parseParenthesizedTimeToken(token);

    if (bracketDate !== undefined) {
      if (!bracketDate) return { type: "error", message: "Use [YYYY-MM-DD] or [MM-DD] for bracket dates." };
      if (dateCommand) date = bracketDate;
      else plannedDate = bracketDate;
      continue;
    }

    if (parenthesizedTime !== undefined) {
      if (!parenthesizedTime) return { type: "error", message: "Use (HH:MM), (930), or (9) for times." };
      time = parenthesizedTime;
      continue;
    }

    if (planned !== undefined) {
      const parsed = parseDateValue(planned, today);
      if (!parsed) return { type: "error", message: "Use planned:YYYY-MM-DD for planned dates." };
      plannedDate = parsed;
      continue;
    }

    if (due !== undefined) {
      const parsed = parseDateValue(due, today);
      if (!parsed) return { type: "error", message: "Use due:YYYY-MM-DD for due dates." };
      dueDate = parsed;
      continue;
    }

    if (on !== undefined) {
      const parsed = parseDateValue(on, today);
      if (!parsed) return { type: "error", message: "Use on:YYYY-MM-DD for dates." };
      if (dateCommand) date = parsed;
      else plannedDate = parsed;
      continue;
    }

    if (at !== undefined) {
      const parsed = parseTimeValue(at);
      if (!parsed) return { type: "error", message: "Use at:HH:MM with 24-hour time." };
      time = parsed;
      continue;
    }

    if (relative) {
      if (!dateCommand) plannedDate = relative;
      else date = relative;
      continue;
    }

    titleTokens.push(token);
  }

  const title = titleTokens.join(" ").trim();
  if (!title) return { type: "error", message: dateCommand ? "Add a date title." : "Add a task title." };

  if (!dateCommand) {
    return {
      type: "task",
      title,
      plannedDate: plannedDate ?? (time ? today : null),
      dueDate,
      scheduledTime: time
    };
  }

  if (!date) {
    return { type: "error", message: "Dates need today, tomorrow, on:YYYY-MM-DD, or [YYYY-MM-DD]." };
  }

  return {
    type: "date",
    title,
    date,
    time
  };
}

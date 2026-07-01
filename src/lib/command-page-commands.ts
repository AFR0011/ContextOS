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

function relativeDateToken(token: string, today: string) {
  const lower = token.toLowerCase();
  if (lower === "today") return today;
  if (lower === "tomorrow") return addDaysToDateKey(today, 1) ?? today;
  return null;
}

export function parseCommandPageLine(line: string, today = localDateKey()): CommandPageParseResult {
  const trimmed = line.trim();
  const command = trimmed.match(/^\/(task|date)\b/i)?.[1]?.toLowerCase();
  if (!command) return { type: "none" };

  const body = trimmed.replace(/^\/(task|date)\b/i, "").trim();
  if (!body) {
    return {
      type: "error",
      message: command === "date" ? "Add a title and date, like /date Exam on:2026-07-10." : "Add a task title after /task."
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

    if (planned !== undefined) {
      if (!isDateKey(planned)) return { type: "error", message: "Use planned:YYYY-MM-DD for planned dates." };
      plannedDate = planned;
      continue;
    }

    if (due !== undefined) {
      if (!isDateKey(due)) return { type: "error", message: "Use due:YYYY-MM-DD for due dates." };
      dueDate = due;
      continue;
    }

    if (on !== undefined) {
      if (!isDateKey(on)) return { type: "error", message: "Use on:YYYY-MM-DD for dates." };
      date = on;
      continue;
    }

    if (at !== undefined) {
      if (!isTime(at)) return { type: "error", message: "Use at:HH:MM with 24-hour time." };
      time = at;
      continue;
    }

    if (relative) {
      if (command === "task") plannedDate = relative;
      else date = relative;
      continue;
    }

    titleTokens.push(token);
  }

  const title = titleTokens.join(" ").trim();
  if (!title) return { type: "error", message: command === "date" ? "Add a date title." : "Add a task title." };

  if (command === "task") {
    return {
      type: "task",
      title,
      plannedDate: plannedDate ?? (time ? today : null),
      dueDate,
      scheduledTime: time
    };
  }

  if (!date) {
    return { type: "error", message: "Dates need today, tomorrow, or on:YYYY-MM-DD." };
  }

  return {
    type: "date",
    title,
    date,
    time
  };
}

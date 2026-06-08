import assert from "node:assert/strict";
import { formatScheduledTodoSyntax, parseScheduledTodoSyntax } from "../src/lib/scheduled-todo";

function scheduled(text: string) {
  const result = parseScheduledTodoSyntax(text);
  assert.equal(result.kind, "scheduled", text);
  return result.value;
}

function invalid(text: string) {
  const result = parseScheduledTodoSyntax(text);
  assert.equal(result.kind, "invalid", text);
  return result.errors.join(" ");
}

assert.deepEqual(scheduled("Laundry (080626) [1100]"), {
  title: "Laundry",
  dateKey: "2026-06-08",
  time: "11:00",
  location: ""
});

assert.deepEqual(scheduled("Shop for tent (110626) [1500] {China Bazaar}"), {
  title: "Shop for tent",
  dateKey: "2026-06-11",
  time: "15:00",
  location: "China Bazaar"
});

assert.deepEqual(scheduled("  Stochastics Final   (140626)   "), {
  title: "Stochastics Final",
  dateKey: "2026-06-14",
  time: null,
  location: ""
});

assert.equal(parseScheduledTodoSyntax("Text Amir").kind, "plain");
assert.equal(parseScheduledTodoSyntax("Laundry 080626").kind, "plain");
assert.equal(parseScheduledTodoSyntax("Laundry [1100]").kind, "plain");
assert.equal(parseScheduledTodoSyntax("Laundry {Home}").kind, "plain");

assert.match(invalid("Laundry (310226)"), /Invalid date/);
assert.match(invalid("Laundry (000626)"), /Invalid date/);
assert.match(invalid("Laundry (080026)"), /Invalid date/);
assert.match(invalid("Laundry (080626) [2400]"), /Invalid time/);
assert.match(invalid("Laundry (080626) [1160]"), /Invalid time/);
assert.match(invalid("Laundry (080626) [900]"), /Invalid time/);

assert.equal(
  formatScheduledTodoSyntax({
    title: "Shop for tent",
    dateKey: "2026-06-11",
    time: "15:00",
    location: "China Bazaar"
  }),
  "Shop for tent (110626) [1500] {China Bazaar}"
);

assert.equal(
  formatScheduledTodoSyntax({
    title: "Stochastics Final",
    dateKey: "2026-06-14",
    time: null,
    location: ""
  }),
  "Stochastics Final (140626)"
);

const multiple = scheduled("Prep (310226) again (080626) [0000]");
assert.deepEqual(multiple, {
  title: "Prep (310226) again",
  dateKey: "2026-06-08",
  time: "00:00",
  location: ""
});

console.log("scheduled-todo parser tests passed");

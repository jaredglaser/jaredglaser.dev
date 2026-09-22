import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const TIMEZONE = "America/New_York";

// Wall-clock time in TIMEZONE with numeric offset
// ex: 2026-09-21T20:56:23.643-04:00
function timestamp(date = new Date()) {
  const wallClock = date
    .toLocaleString("sv-SE", { timeZone: TIMEZONE })
    .replace(" ", "T");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  const offset =
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      timeZoneName: "longOffset",
    })
      .formatToParts(date)
      .find(part => part.type === "timeZoneName")
      .value.replace("GMT", "") || "Z";
  return `${wallClock}.${ms}${offset}`;
}

const staged = execFileSync(
  "git",
  [
    "diff",
    "--cached",
    "--name-only",
    "--diff-filter=ACM",
    "--",
    "src/content/posts",
  ],
  { encoding: "utf8" },
)
  .split("\n")
  .filter(file => file.endsWith(".md") || file.endsWith(".mdx"));

if (staged.length === 0) process.exit(0);

const now = timestamp();

for (const file of staged) {
  let content = readFileSync(file, "utf8");

  if (/^modDatetime:/m.test(content)) {
    content = content.replace(/^modDatetime:.*$/m, `modDatetime: ${now}`);
  } else {
    content = content.replace(
      /^(pubDatetime:.*$)/m,
      `$1\nmodDatetime: ${now}`,
    );
  }

  writeFileSync(file, content);
  execFileSync("git", ["add", file]);
  console.log(`modDatetime updated: ${file}`);
}

const fs = require("fs");
const content = fs.readFileSync("src/components/AttendanceDetail.tsx", "utf8");
const btnIdx = content.indexOf("<button");
console.log("First <button at:", btnIdx);

let tagEnd = -1, depth = 0, inQuote = false, qChar = "";
for (let j = btnIdx + 7; j < content.length && j < btnIdx + 2000; j++) {
  const ch = content[j];
  if (inQuote) { if (ch === qChar) inQuote = false; continue; }
  if (ch === '"' || ch === "'") { inQuote = true; qChar = ch; continue; }
  if (ch === "{") { depth++; continue; }
  if (ch === "}") { if (depth > 0) depth--; continue; }
  if (ch === ">" && depth === 0) { tagEnd = j; break; }
}
console.log("tagEnd:", tagEnd);
if (tagEnd > 0) {
  const tag = content.substring(btnIdx, tagEnd + 1);
  console.log("Tag length:", tag.length);
  console.log("Has btn btn-:", tag.includes("btn btn-"));
  console.log("Tag start:", JSON.stringify(tag.substring(0, 80)));
  console.log("Tag end:", JSON.stringify(tag.substring(tag.length - 80)));
}
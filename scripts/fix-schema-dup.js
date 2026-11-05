const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const raw = fs.readFileSync(schemaPath, 'utf8');
const lines = raw.split('\n');

console.log(`Total lines: ${lines.length}`);

// Find all shopPurchases occurrences in the User model
const userModelStart = lines.findIndex(l => l.includes('model User {'));
const userModelEnd = lines.findIndex((l, i) => i > userModelStart && l.trim() === '}');

console.log(`User model: lines ${userModelStart + 1} to ${userModelEnd + 1}`);

const shopLinesInUser = [];
for (let i = userModelStart; i <= userModelEnd; i++) {
  if (lines[i].includes('shopPurchases')) {
    shopLinesInUser.push({ lineNum: i + 1, content: JSON.stringify(lines[i]) });
  }
}

console.log('shopPurchases in User model:', shopLinesInUser);

// Keep only the first occurrence, remove any subsequent ones
let firstFound = false;
const newLines = lines.filter((line, idx) => {
  if (idx < userModelStart || idx > userModelEnd) return true;
  if (line.includes('shopPurchases')) {
    if (!firstFound) { firstFound = true; return true; }
    console.log(`Removing duplicate at line ${idx + 1}: ${JSON.stringify(line)}`);
    return false;
  }
  return true;
});

fs.writeFileSync(schemaPath, newLines.join('\n'), 'utf8');
console.log(`\n✅ Done. Removed ${lines.length - newLines.length} duplicate line(s)`);

// Verify
const verify = fs.readFileSync(schemaPath, 'utf8');
const shopMatches = [...verify.matchAll(/shopPurchases/g)];
console.log(`shopPurchases occurrences after fix: ${shopMatches.length}`);


const fs = require("fs");
const path = require("path");

function walk(dir) {
  let files = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files = files.concat(walk(fullPath));
    } else if (fullPath.endsWith(".tsx") || fullPath.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

const collidingRegex = /\b(max-w|w|h|p|m|gap|space)-(xxs|xs|sm|md|lg|xl|xxl|section)\b/g;

const files = walk(path.join(__dirname, "../src"));
console.log("Analyzing files for collisions...");

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  let match;
  while ((match = collidingRegex.exec(content)) !== null) {
    const utility = match[1];
    const token = match[2];
    
    // We only care about size utilities (max-w, w, h) colliding with spacing names,
    // because padding (p-sm), margin (m-sm), gap (gap-sm) are INTENDED to use the spacing scale.
    // Width (w-sm, max-w-sm, h-sm) are what collide and collapse!
    if (["max-w", "w", "h"].includes(utility)) {
      const lineNum = content.substring(0, match.index).split("\n").length;
      console.log(`Collision in ${path.relative(process.cwd(), file)}:L${lineNum} -> "${match[0]}"`);
    }
  }
}

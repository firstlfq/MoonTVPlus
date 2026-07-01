const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');

function findRouteFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRouteFiles(fullPath));
    } else if (entry.name === 'route.ts') {
      results.push(fullPath);
    }
  }
  return results;
}

const files = findRouteFiles(apiDir);
console.log(`找到 ${files.length} 个 route.ts 文件`);

let modified = 0;
let skipped = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // 如果已经有 export const dynamic，跳过
  if (/export const dynamic/.test(content)) {
    skipped++;
    continue;
  }
  
  // 检查是否使用了动态 API（直接或通过 getAuthInfoFromCookie）
  const usesDynamicApi = /getAuthInfoFromCookie|request\.headers|request\.cookies|request\.nextUrl|nextUrl\.searchParams|request\.url/.test(content);
  
  if (!usesDynamicApi) {
    skipped++;
    continue;
  }
  
  // 如果有 export const runtime，在其后添加 dynamic
  if (/export const runtime/.test(content)) {
    content = content.replace(
      /(export const runtime\s*=\s*'[^']+';)/,
      "$1\nexport const dynamic = 'force-dynamic';"
    );
    fs.writeFileSync(file, content, 'utf-8');
    modified++;
    console.log(`  runtime+dynamic: ${path.relative(apiDir, file)}`);
  } else {
    // 没有 runtime，在 import 之后添加
    content = content.replace(
      /^((?:import .*;\n)*)/,
      "$1export const dynamic = 'force-dynamic';\n"
    );
    fs.writeFileSync(file, content, 'utf-8');
    modified++;
    console.log(`  dynamic-only: ${path.relative(apiDir, file)}`);
  }
}

console.log(`\n完成！修改 ${modified} 个文件，跳过 ${skipped} 个`);

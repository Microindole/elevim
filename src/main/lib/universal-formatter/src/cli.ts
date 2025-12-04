import * as fs from 'fs';
import * as path from 'path';
import { FormatterEngine } from './engine';

const engine = new FormatterEngine();

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: npx ts-node src/cli.ts <file_path>');
    return;
  }

  const targetPath = path.resolve(args[0]);
  
  if (!fs.existsSync(targetPath)) {
    console.error('File not found:', targetPath);
    return;
  }

  // console.log(`Processing: ${targetPath}`);
  
  const content = fs.readFileSync(targetPath, 'utf-8');

  // 安全检查
  if (content.length === 0) {
      console.error("❌ Error: Input file is empty!");
      return;
  }

  const startTime = Date.now();
  
  let formatted = "";
  try {
      formatted = await engine.formatCode(targetPath, content);
  } catch (error) {
      console.error("❌ Engine Crashed:", error);
      return;
  }
  
  const duration = Date.now() - startTime;

  // 核心逻辑修改：如果内容有变化，直接覆盖写入
  if (formatted && formatted !== content) {
    // 1. 写入文件 (覆盖原文件)
    fs.writeFileSync(targetPath, formatted, 'utf-8');
    
    console.log(`✅ Formatted ${path.basename(targetPath)} in ${duration}ms`);
  } else {
    console.log('✅ File is already formatted.');
  }
}

main();
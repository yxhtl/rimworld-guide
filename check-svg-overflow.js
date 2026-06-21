/**
 * 扫描英文版 HTML 页面中所有 SVG，检测文字是否超出所在矩形（穿模/重叠）
 * 用法: node check-svg-overflow.js
 *       node check-svg-overflow.js --verbose  显示所有检测详情（含跳过的箭头标签）
 */

const fs = require('fs');
const path = require('path');

const EN_DIR = path.join(__dirname, 'en');
const VERBOSE = process.argv.includes('--verbose');

// ---- 工具函数 ----

/** 估算 text 元素的渲染宽度（px），基于 viewBox 坐标系 */
function estimateTextWidth(text, fontSize, fontWeight) {
  if (!text || !fontSize) return 0;
  let width = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code >= 0x4e00 && code <= 0x9fff) {
      width += fontSize;
    } else if (code >= 0x1f300 && code <= 0x1f9ff) {
      width += fontSize * 1.0; // emoji 宽度接近字号
    } else if (ch === ' ') {
      width += fontSize * 0.3;
    } else {
      width += fontSize * 0.55;
    }
  }
  if (fontWeight === 'bold') width *= 1.05;
  return width;
}

function getTextBounds(textX, textWidth, textAnchor) {
  if (textAnchor === 'middle') return { left: textX - textWidth / 2, right: textX + textWidth / 2 };
  if (textAnchor === 'end') return { left: textX - textWidth, right: textX };
  return { left: textX, right: textX + textWidth };
}

/** 检查 text 是否在 rect 内部（y 坐标） */
function isTextInRect(textY, rectY, rectHeight, fontSize) {
  const textTop = textY - fontSize * 0.8;
  const textBottom = textY + fontSize * 0.3;
  const rectBottom = rectY + rectHeight;
  return textTop >= rectY - 1 && textBottom <= rectBottom + 1;
}

// ---- 解析 ----

function parseSvgElements(html) {
  const svgRegex = /<svg[^>]*>([\s\S]*?)<\/svg>/gi;
  const results = [];
  let match;
  while ((match = svgRegex.exec(html)) !== null) {
    const svgContent = match[1];
    const rects = [], texts = [], lines = [];

    const rectRegex = /<rect[^>]*\/?>/gi;
    let rm;
    while ((rm = rectRegex.exec(svgContent)) !== null) {
      const tag = rm[0];
      const x = parseFloat((tag.match(/x="([^"]*)"/) || [])[1]);
      const y = parseFloat((tag.match(/y="([^"]*)"/) || [])[1]);
      const w = parseFloat((tag.match(/width="([^"]*)"/) || [])[1]);
      const h = parseFloat((tag.match(/height="([^"]*)"/) || [])[1]);
      if (!isNaN(x) && !isNaN(y) && !isNaN(w) && !isNaN(h)) {
        rects.push({ x, y, width: w, height: h });
      }
    }

    const textRegex = /<text[^>]*>([\s\S]*?)<\/text>/gi;
    let tm;
    while ((tm = textRegex.exec(svgContent)) !== null) {
      const tag = tm[0];
      const rawContent = tm[1].replace(/<[^>]*>/g, '').trim();
      const x = parseFloat((tag.match(/x="([^"]*)"/) || [])[1]);
      const y = parseFloat((tag.match(/y="([^"]*)"/) || [])[1]);
      const fontSize = parseFloat((tag.match(/font-size="([^"]*)"/) || [])[1]);
      const fontWeight = (tag.match(/font-weight="([^"]*)"/) || [])[1] || 'normal';
      const textAnchor = (tag.match(/text-anchor="([^"]*)"/) || [])[1] || 'start';
      if (!isNaN(x) && !isNaN(y) && !isNaN(fontSize) && rawContent) {
        texts.push({ x, y, fontSize, fontWeight, textAnchor, content: rawContent });
      }
    }

    const lineRegex = /<line[^>]*\/?>/gi;
    let lm;
    while ((lm = lineRegex.exec(svgContent)) !== null) {
      const tag = lm[0];
      const x1 = parseFloat((tag.match(/x1="([^"]*)"/) || [])[1]);
      const y1 = parseFloat((tag.match(/y1="([^"]*)"/) || [])[1]);
      const x2 = parseFloat((tag.match(/x2="([^"]*)"/) || [])[1]);
      const y2 = parseFloat((tag.match(/y2="([^"]*)"/) || [])[1]);
      if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
        lines.push({ x1, y1, x2, y2 });
      }
    }

    results.push({ rects, texts, lines });
  }
  return results;
}

/** 判断文字是不是箭头标签：在一条线的中点附近，且该线连接两个矩形 */
function isArrowLabel(text, lines, rects) {
  for (const line of lines) {
    const lineMidX = (line.x1 + line.x2) / 2;
    const lineMidY = (line.y1 + line.y2) / 2;
    const distX = Math.abs(text.x - lineMidX);
    const distY = Math.abs(text.y - lineMidY);

    // 文字在线的中点附近（水平方向 80px 内，垂直方向 25px 内）
    if (distX < 80 && distY < 25) {
      // 检查这条线是否连接两个矩形
      let endpointsInRects = 0;
      for (const rect of rects) {
        const margin = 5;
        if (line.x1 >= rect.x - margin && line.x1 <= rect.x + rect.width + margin &&
            line.y1 >= rect.y - margin && line.y1 <= rect.y + rect.height + margin) {
          endpointsInRects++;
        }
        if (line.x2 >= rect.x - margin && line.x2 <= rect.x + rect.width + margin &&
            line.y2 >= rect.y - margin && line.y2 <= rect.y + rect.height + margin) {
          endpointsInRects++;
        }
      }
      if (endpointsInRects >= 2) return true;
    }
  }
  return false;
}

// ---- 主流程 ----

function checkFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const figureMatches = [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<figure[\s\S]*?<svg[^>]*>([\s\S]*?)<\/svg>/gi)];
  const svgs = parseSvgElements(html);
  const issues = [];
  const skipped = [];

  for (let i = 0; i < svgs.length; i++) {
    const { rects, texts, lines } = svgs[i];

    // 过滤掉背景矩形和微型装饰矩形：
    // width > 500 → SVG 全宽背景
    // width < 20  → 微型装饰/图标框
    const contentRects = rects.filter(r => r.width >= 20 && r.width <= 500);

    let sectionTitle = `SVG #${i + 1}`;
    if (figureMatches[i]) {
      sectionTitle = figureMatches[i][1].replace(/<[^>]*>/g, '').trim() || sectionTitle;
    }

    for (const text of texts) {
      const textWidth = estimateTextWidth(text.content, text.fontSize, text.fontWeight);

      // 跳过箭头标签（"Determines", "Affects" 等故意放在线上的文字）
      if (isArrowLabel(text, lines, contentRects)) {
        skipped.push({ section: sectionTitle, text: text.content.substring(0, 40), reason: '箭头标签（故意放在线上的文字）' });
        continue;
      }

      // 找到该文字所在的内容矩形
      let foundRect = null;
      for (const rect of contentRects) {
        if (isTextInRect(text.y, rect.y, rect.height, text.fontSize)) {
          const bounds = getTextBounds(text.x, textWidth, text.textAnchor);
          const rectRight = rect.x + rect.width;
          if (bounds.right > rect.x && bounds.left < rectRight) {
            foundRect = rect;
            break;
          }
        }
      }

      if (foundRect) {
        const bounds = getTextBounds(text.x, textWidth, text.textAnchor);
        const rectRight = foundRect.x + foundRect.width;
        const overflowLeft = Math.max(0, foundRect.x - bounds.left);
        const overflowRight = Math.max(0, bounds.right - rectRight);
        const tolerance = 3;

        if (overflowLeft > tolerance || overflowRight > tolerance) {
          const dir = [];
          if (overflowLeft > tolerance) dir.push(`左边溢出 ${overflowLeft.toFixed(0)}px`);
          if (overflowRight > tolerance) dir.push(`右边溢出 ${overflowRight.toFixed(0)}px`);

          const textBottom = text.y + text.fontSize * 0.3;
          const rectBottom = foundRect.y + foundRect.height;
          if (textBottom - rectBottom > 2) {
            dir.push(`底部超出 ${(textBottom - rectBottom).toFixed(0)}px`);
          }

          issues.push({
            section: sectionTitle,
            text: text.content,
            fontSize: text.fontSize,
            textWidth: textWidth.toFixed(0),
            rectWidth: foundRect.width.toFixed(0),
            rectX: foundRect.x,
            rectY: foundRect.y,
            textX: text.x,
            textY: text.y,
            direction: dir.join('；'),
          });
        }
      }
      // 不在任何内容矩形内的文字：不报（可能是自由放置的标题/标注）
    }
  }
  return { fileName, issues, skipped };
}

// ---- 运行 ----

console.log('🔍 扫描英文版页面 SVG 文字溢出（已过滤箭头标签和背景矩形）...\n');

const files = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.html'));
let totalIssues = 0, totalSkipped = 0;
const allResults = [];

for (const file of files) {
  const { fileName, issues, skipped } = checkFile(path.join(EN_DIR, file));
  if (issues.length > 0) {
    allResults.push({ fileName, issues });
    totalIssues += issues.length;
  }
  totalSkipped += skipped.length;
}

if (allResults.length === 0) {
  console.log('✅ 没有发现 SVG 文字溢出问题！');
} else {
  for (const { fileName, issues } of allResults) {
    console.log(`\n📄 ${fileName} (${issues.length} 处问题)`);
    let lastSection = '';
    for (const issue of issues) {
      if (issue.section !== lastSection) {
        console.log(`   ┌─ ${issue.section}`);
        lastSection = issue.section;
      }
      console.log(`   │  📝 "${issue.text}"`);
      console.log(`   │     字号:${issue.fontSize}px | 文字宽≈${issue.textWidth}px | 矩形宽=${issue.rectWidth}px`);
      console.log(`   │     🔴 ${issue.direction}`);
    }
  }
  console.log(`\n⚠️  共发现 ${totalIssues} 处穿模问题。`);
}

if (VERBOSE) {
  console.log(`\n📎 已跳过 ${totalSkipped} 处箭头标签（用 --verbose 查看详情）：`);
  // 只显示文件统计
  const byFile = {};
  for (const r of allResults) {
    byFile[r.fileName] = r.issues.length;
  }
}

console.log(`\n💡 提示：用 node check-svg-overflow.js --verbose 查看跳过的箭头标签详情。`);

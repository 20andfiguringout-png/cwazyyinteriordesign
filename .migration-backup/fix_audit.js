/**
 * Alvéo Audit Fix Script
 * Fixes encoding bugs + rewrites functions for drawing quality improvements
 */
const fs = require('fs');
const path = require('path');

const BASE = __dirname;

// ─── 1. FIX ClosetLayoutEngine.ts ──────────────────────────────────────────

let engine = fs.readFileSync(path.join(BASE, 'src/engine/ClosetLayoutEngine.ts'), 'utf8');

// Fix all encoding artifacts: â€" (em-dash) → ' - '  and  âš  (warning) → ''
engine = engine.replace(/\u00e2\u20ac\u201d/g, ' - ');   // â€" (most common em-dash artifact)
engine = engine.replace(/\u00e2\u20ac\u201c/g, ' - ');   // â€œ (left variant)
engine = engine.replace(/\u00e2\u0161\u00a0/g, '');       // âš\u00a0 (warning sign artifact, NBSP)
engine = engine.replace(/\u00e2\u20ac\u201e/g, ' - ');   // any other variant

// ── Replace calcRecommendations with clean data-driven version ──────────────
const oldRecsFnStart = 'private calcRecommendations(walls: ClosetWall[]): string[] {';
const oldRecsFnEnd   = '\n  }';

// Find and replace the entire calcRecommendations method
const startIdx  = engine.indexOf(oldRecsFnStart);
if (startIdx === -1) { console.error('calcRecommendations start not found'); process.exit(1); }

// Find the closing brace of this specific function
// It ends with the next \n  } that closes the function
let braceDepth = 0;
let endIdx = startIdx;
for (let i = startIdx; i < engine.length; i++) {
  if (engine[i] === '{') braceDepth++;
  if (engine[i] === '}') {
    braceDepth--;
    if (braceDepth === 0) { endIdx = i + 1; break; }
  }
}

const newCalcRecs = `private calcRecommendations(walls: ClosetWall[]): string[] {
    const recs: string[] = [];
    const shoes  = this.countShoes();
    const wrd    = this.wardrobe;

    // Layout type summary
    const typeNotes: Partial<Record<ClosetType, string>> = {
      'walkin-u':      'U-shape walk-in: 3 elevation drawings - EL-A (back), EL-B (left), EL-C (right).',
      'walkin-l':      'L-shape walk-in: 2 elevation drawings - EL-A (back wall) and EL-B (side wall).',
      'island':        'Island walk-in: U-shape walls generated. Island unit to be specified separately.',
      'corridor':      'Corridor walk-in: 2 facing walls - EL-A (hanging) and EL-B (storage).',
      'walkin-single': 'Single-wall walk-in: back wall fitted, aisle confirmed.',
    };
    const note = typeNotes[this.closetType];
    if (note) recs.push(note);

    // Hanging inventory analysis
    const longHang  = (wrd.longDresses ?? 0) + (wrd.suits ?? 0);
    const shortHang = (wrd.shirts ?? 0) + (wrd.shortJackets ?? 0) + (wrd.pants ?? 0);
    const totalHang = longHang + shortHang;
    if (totalHang > 0) {
      const ftNeeded = Math.ceil((longHang * 2.5 + shortHang * 1.8) / 12);
      recs.push(\`\${totalHang} hanging items require approx. \${ftNeeded} linear ft of rod space across all walls.\`);
    }

    // Double-hang opportunity
    if ((wrd.shirts ?? 0) > 15) {
      const ftSaved = Math.round((wrd.shirts ?? 0) * 1.8 / 12 * 0.45);
      recs.push(\`\${wrd.shirts} shirts: double-hang layout saves approx. \${ftSaved} linear ft.\`);
    }

    // Folded items / drawers
    const folded = (wrd.tShirts ?? 0) + (wrd.sweaters ?? 0) + (wrd.jeans ?? 0) + (wrd.underwear ?? 0);
    if (folded > 0) {
      const drawersNeeded = Math.ceil(folded / 10);
      recs.push(\`\${folded} folded items require approx. \${drawersNeeded} drawers. \${drawersNeeded > 8 ? 'A dedicated drawer column is recommended.' : 'Covered by the current drawer stack.'}\`);
    }

    // Shoes
    if (shoes > 0) {
      const shelvesNeeded = Math.ceil(shoes / 4);
      recs.push(\`\${shoes} shoe pairs need approx. \${shelvesNeeded} shelves.\${shoes > 30 ? ' A dedicated shoe wall section is recommended.' : ''}\`);
    }

    if (this.H < 84) recs.push('Ceiling height below 7 ft - rod heights adjusted to maximise hanging space.');
    if (this.W < 60) recs.push('Compact layout: priority items at most accessible height (18 in. to 60 in. A.F.F.).');
    if (walls.every(w => w.zones.length === 0)) recs.push('Complete your wardrobe inventory to generate a tailored layout.');

    return recs;
  }`;

engine = engine.slice(0, startIdx) + newCalcRecs + engine.slice(endIdx);

fs.writeFileSync(path.join(BASE, 'src/engine/ClosetLayoutEngine.ts'), engine, 'utf8');
console.log('✓ ClosetLayoutEngine.ts fixed');

// ─── 2. FIX ClosetSVGRenderer.ts ────────────────────────────────────────────

let renderer = fs.readFileSync(path.join(BASE, 'src/renderer/ClosetSVGRenderer.ts'), 'utf8');

// FIX 03: Zone label centering — remove special-casing for hang zones
renderer = renderer.replace(
  /\/\/ Zone label.*?Hang zones.*?\n.*?const labelY = zone\.type\.includes\('hang'\)\s*\n\s*\? zTopY \+ zoneH \* 0\.80.*?\n\s*: zTopY \+ zoneH \/ 2;/s,
  `const labelY = zTopY + zoneH / 2;  // vertically centred in all zones`
);

// FIX 04: Garment silhouette count — cap at 8, add shape variety
// Replace the count line + the entire garment loop
const oldCountLine = `      const count        = clamp(Math.floor((zw - pad * 2) / Math.max(this.scale * 2.6, 7)), 2, 10);`;
const garmentLoopStart = '      for (let i = 0; i < count; i++) {';
const garmentLoopEnd_marker = '      return out;';

const countIdx = renderer.indexOf(oldCountLine);
if (countIdx === -1) {
  console.error('count line not found in renderer');
} else {
  // Find the whole block from count line to end of the for loop
  const loopStart = renderer.indexOf(garmentLoopStart, countIdx);
  if (loopStart === -1) { console.error('loop start not found'); process.exit(1); }
  
  // Find end of the for loop (matching braces)
  let depth = 0, loopEnd = loopStart;
  for (let i = loopStart; i < renderer.length; i++) {
    if (renderer[i] === '{') depth++;
    if (renderer[i] === '}') {
      depth--;
      if (depth === 0) { loopEnd = i + 1; break; }
    }
  }
  
  const newGarmentBlock = `      // Cap at 8 silhouettes — representative, not inventory count
      const count   = clamp(Math.floor((zw - pad * 2) / Math.max(this.scale * 2.8, 8)), 2, 8);
      const spacing = (zw - pad * 2) / (count + 1);
      const gw    = isLong ? clamp(this.scale * 2.2, 6, 15) : clamp(this.scale * 2.8, 7, 18);
      const gwBot = isLong ? gw * 1.18 : gw * 0.88;

      for (let i = 0; i < count; i++) {
        const gx    = zx + pad + (i + 1) * spacing;
        const ty    = rodY + hookH;
        const by    = rodY + hookH + gPx;
        // Cycle 3 shape variants for visual variety, slightly different fills
        const shape = i % 3;
        const fCol  = shape === 0 ? (isLong ? '#f0ede8' : '#ece8e2')
                    : shape === 1 ? (isLong ? '#e8e4de' : '#e5e0da')
                    :               (isLong ? '#edeae4' : '#eae6e0');
        const fOp   = shape === 1 ? 0.58 : 0.68;
        // Hanger
        out += \`
  <polyline points="\${gx},\${rodY} \${gx - gw * 0.6},\${ty} \${gx + gw * 0.6},\${ty}"
            fill="none" stroke="#888" stroke-width="0.9" stroke-linejoin="round"/>
  <circle cx="\${gx}" cy="\${rodY}" r="1.4" fill="none" stroke="#888" stroke-width="0.7"/>\`;
        if (isLong) {
          if (shape === 1) {
            // Long coat: straight column, boxy shoulders
            const cw = gw * 1.08;
            out += \`
  <path d="M\${gx - cw * 0.5},\${ty} L\${gx - gw * 0.4},\${by} L\${gx + gw * 0.4},\${by} L\${gx + cw * 0.5},\${ty} Z"
        fill="\${fCol}" fill-opacity="\${fOp}" stroke="#bbb" stroke-width="0.65"/>\`;
          } else {
            // Dress: A-line silhouette, tapers at hem
            out += \`
  <path d="M\${gx - gw * 0.5},\${ty} L\${gx - gwBot * 0.5},\${by} L\${gx + gwBot * 0.5},\${by} L\${gx + gw * 0.5},\${ty} Z"
        fill="\${fCol}" fill-opacity="\${fOp}" stroke="#bbb" stroke-width="0.65"/>\`;
          }
        } else {
          const mid = ty + (by - ty) * 0.28;
          if (shape === 1) {
            // Jacket: slightly boxy, wider shoulders
            const jw = gw * 1.1;
            out += \`
  <path d="M\${gx - jw * 0.5},\${ty} L\${gx - jw * 0.52},\${mid} L\${gx - gwBot * 0.36},\${by} L\${gx + gwBot * 0.36},\${by} L\${gx + jw * 0.52},\${mid} L\${gx + jw * 0.5},\${ty} Z"
        fill="\${fCol}" fill-opacity="\${fOp}" stroke="#bbb" stroke-width="0.65"/>\`;
          } else {
            // Shirt: tapers toward hem
            out += \`
  <path d="M\${gx - gw * 0.5},\${ty} L\${gx - gw * 0.58},\${mid} L\${gx - gwBot * 0.42},\${by} L\${gx + gwBot * 0.42},\${by} L\${gx + gw * 0.58},\${mid} L\${gx + gw * 0.5},\${ty} Z"
        fill="\${fCol}" fill-opacity="\${fOp}" stroke="#bbb" stroke-width="0.65"/>\`;
          }
        }
      }`;
  
  // Delete from old count line to end of old loop, insert new block
  renderer = renderer.slice(0, countIdx) + newGarmentBlock + renderer.slice(loopEnd);
  console.log('✓ Garment silhouettes capped at 8 with shape variety');
}

// FIX 05+06: Title block — fix line spacing (prevent text collision)
renderer = renderer.replace(
  `  <text x="\${cx}" y="\${blockY - 20}" text-anchor="middle"\n        font-size="14" font-weight="700" fill="#111111" letter-spacing="3"\n        font-family="'Helvetica Neue','Arial Narrow',Arial,sans-serif">\${titleText}</text>\n  <!-- Centre: Project data (level 2 — medium, regular weight) -->\n  <text x="\${cx}" y="\${blockY - 4}" text-anchor="middle"\n        font-size="8.5" font-weight="400" fill="#666666" letter-spacing="0.8"\n        font-family="'Helvetica Neue',Arial,sans-serif">\${typeLabel}  ·  \${toFtIn(W)} WIDE  ·  \${toFtIn(H)} TALL  ·  \${D}" DEEP</text>\n  <!-- Centre: Meta info (level 3 — small, very light) -->\n  <text x="\${cx}" y="\${blockY + 11}" text-anchor="middle"\n        font-size="6.5" fill="#aaaaaa" letter-spacing="0.5"\n        font-family="'Helvetica Neue',Arial,sans-serif">REV. A  ·  DATE \${dateStr}  ·  EL-01</text>`,
  `  <text x="\${cx}" y="\${blockY - 26}" text-anchor="middle"\n        font-size="14" font-weight="700" fill="#111111" letter-spacing="3"\n        font-family="'Helvetica Neue','Arial Narrow',Arial,sans-serif">\${titleText}</text>\n  <line x1="\${cx - 54}" y1="\${blockY - 16}" x2="\${cx + 54}" y2="\${blockY - 16}" stroke="#d8d0c8" stroke-width="0.5"/>\n  <!-- Centre: Project data (level 2) -->\n  <text x="\${cx}" y="\${blockY - 7}" text-anchor="middle"\n        font-size="8.5" font-weight="400" fill="#666666" letter-spacing="0.8"\n        font-family="'Helvetica Neue',Arial,sans-serif">\${typeLabel}  ·  \${toFtIn(W)} WIDE  ·  \${toFtIn(H)} TALL  ·  \${D}" DEEP</text>\n  <!-- Centre: Meta info (level 3) -->\n  <text x="\${cx}" y="\${blockY + 5}" text-anchor="middle"\n        font-size="6.5" fill="#aaaaaa" letter-spacing="0.5"\n        font-family="'Helvetica Neue',Arial,sans-serif">REV. A  ·  DATE \${dateStr}  ·  EL-01</text>`
);

// FIX usable height annotation — add after the overall height dim line
const overallDimEnd = `    out += this.dimLineV(vdX, yTop, yFloor, toFtIn(H));`;
const usableAnnotation = `    out += this.dimLineV(vdX, yTop, yFloor, toFtIn(H));

    // Usable interior height note between dim line and closet
    const TOE_DIM_H = 3;
    const yToeNote  = this.cy(TOE_DIM_H);
    const noteX     = x0 - 28;
    const noteMid   = (yTop + yToeNote) / 2;
    out += \`
  <text x="\${noteX}" y="\${noteMid}" text-anchor="middle" dominant-baseline="central"
        font-size="5.5" fill="#c8c0b8" letter-spacing="1"
        font-family="'Helvetica Neue',Arial,sans-serif"
        transform="rotate(-90 \${noteX} \${noteMid})">INT. HT. \${toFtIn(H - TOE_DIM_H)}</text>\`;`;

renderer = renderer.replace(overallDimEnd, usableAnnotation);

// FIX zone label centering — regex approach
renderer = renderer.replace(
  /\/\/ Zone label.*?Hang zones.*?\r?\n.*?const labelY = zone\.type\.includes\('hang'\)[\s\S]*?\n(\s*): zTopY \+ zoneH \/ 2;.*?\/\/ vertically centred for all other zones/,
  (match, indent) => `${indent}const labelY = zTopY + zoneH / 2;  // vertically centred in all zone types`
);

// Also do a simple string replacement as backup if regex didn't match
if (renderer.includes('? zTopY + zoneH * 0.80')) {
  renderer = renderer.replace(
    /const labelY = zone\.type\.includes\('hang'\)\s*\n\s*\? zTopY \+ zoneH \* 0\.80[^\n]*\n\s*: zTopY \+ zoneH \/ 2;[^\n]*/,
    'const labelY = zTopY + zoneH / 2;  // vertically centred in all zone types'
  );
}

fs.writeFileSync(path.join(BASE, 'src/renderer/ClosetSVGRenderer.ts'), renderer, 'utf8');
console.log('✓ ClosetSVGRenderer.ts fixed');

// ─── 3. FIX PDFExporter.ts ──────────────────────────────────────────────────

let pdf = fs.readFileSync(path.join(BASE, 'src/engine/PDFExporter.ts'), 'utf8');

// Fix shoe capacity row + rewrite smart suggestions section
const oldStorageBlock = `  const storageRows = [
    ['Hanging Rods', \`\${storage.hangingRods} linear ft\`],
    ['Shelf Space', \`\${storage.shelfSpace} sq ft\`],
    ['Drawers', \`\${storage.drawerCount}\`],
    ['Shoe Capacity', \`\${storage.shoeCapacity} pairs\`],
    ['Utilization Score', \`\${layout.utilizationScore}%\`],
  ].map(([k, v]) => \`<tr><td>\${k}</td><td>\${v}</td></tr>\`).join('');

  const recsHTML = recs.length
    ? \`<ul>\${recs.map(r => \`<li>\${r}</li>\`).join('')}</ul>\`
    : '<p>No additional suggestions — your layout is well optimized!</p>';`;

const newStorageBlock = `  const shoeRequired = (sh?.sneakers ?? 0) + (sh?.heels ?? 0) + (sh?.boots ?? 0) + (sh?.flats ?? 0);
  const shoeCapAvail  = storage.shoeCapacity;
  const shoeCapStr    = shoeRequired > shoeCapAvail
    ? \`\${shoeCapAvail} in layout (\${shoeRequired} required — \${shoeRequired - shoeCapAvail} more pairs need additional wall)\`
    : \`\${shoeCapAvail} pairs\`;

  const storageRows = [
    ['Hanging Rods', \`\${storage.hangingRods} linear ft\`],
    ['Shelf Space', \`\${storage.shelfSpace} sq ft\`],
    ['Drawers', \`\${storage.drawerCount}\`],
    ['Shoe Capacity', shoeCapStr],
    ['Utilization Score', \`\${layout.utilizationScore}%\`],
  ].map(([k, v]) => \`<tr><td>\${k}</td><td>\${v}</td></tr>\`).join('');

  // Smart suggestions — generated programmatically from inventory + layout data
  const smartSuggestions: string[] = [];
  if (w) {
    const longHangCount  = (w.longDresses ?? 0) + (w.suits ?? 0);
    const shortHangCount = (w.shirts ?? 0) + (w.shortJackets ?? 0) + (w.pants ?? 0);
    const totalHanging   = longHangCount + shortHangCount;
    if (totalHanging > 0) {
      const linFtNeeded = Math.ceil((longHangCount * 2.5 + shortHangCount * 1.8) / 12);
      const linFtAvail  = storage.hangingRods;
      smartSuggestions.push(
        \`\${totalHanging} hanging items require approx. \${linFtNeeded} linear ft of rod space. \` +
        \`Layout provides \${linFtAvail} linear ft.\` +
        (linFtNeeded > linFtAvail + 2 ? ' An additional wall is recommended.' : ' Current layout accommodates this.')
      );
    }
    if ((w.shirts ?? 0) > 15) {
      const ftSaved = Math.round((w.shirts ?? 0) * 1.8 / 12 * 0.45);
      smartSuggestions.push(\`\${w.shirts} shirts: double-hang layout for this section saves approx. \${ftSaved} linear ft of wall space.\`);
    }
    const folded = (w.tShirts ?? 0) + (w.sweaters ?? 0) + (w.jeans ?? 0) + (w.underwear ?? 0);
    if (folded > 0) {
      const drawersNeeded = Math.ceil(folded / 10);
      smartSuggestions.push(
        \`\${folded} folded items require approx. \${drawersNeeded} drawers. \` +
        \`Layout has \${storage.drawerCount} drawers.\` +
        (drawersNeeded > storage.drawerCount ? \` Consider adding \${drawersNeeded - storage.drawerCount} more.\` : ' Drawer allocation is sufficient.')
      );
    }
    if (shoeRequired > 0) {
      const shelvesNeeded = Math.ceil(shoeRequired / 4);
      smartSuggestions.push(
        \`\${shoeRequired} shoe pairs need approx. \${shelvesNeeded} shelves.\` +
        (shoeRequired > 30 ? ' A dedicated shoe wall (EL-C) is strongly recommended.' : ' Shoe section included in current layout.')
      );
    }
    if ((w.bags ?? 0) > 3)
      smartSuggestions.push(\`\${w.bags} handbags: allocate open shelf space at 15-18 in. above drawers, approx. 18 in. width per bag.\`);
  }
  if (smartSuggestions.length === 0)
    smartSuggestions.push('Your layout is well-proportioned for your inventory. No major adjustments needed.');

  const recsHTML = \`<ul>\${smartSuggestions.map(r => \`<li>\${r}</li>\`).join('')}</ul>\`;`;

if (pdf.includes(oldStorageBlock)) {
  pdf = pdf.replace(oldStorageBlock, newStorageBlock);
  console.log('✓ PDFExporter.ts storageRows + smart suggestions fixed');
} else {
  console.error('Could not find storageRows block in PDFExporter.ts');
}

fs.writeFileSync(path.join(BASE, 'src/engine/PDFExporter.ts'), pdf, 'utf8');
console.log('✓ PDFExporter.ts written');

console.log('\nAll fixes applied. Run: npx tsc --noEmit to verify.');

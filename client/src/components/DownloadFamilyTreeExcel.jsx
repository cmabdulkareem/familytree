// DownloadFamilyTreeExcel.jsx
import React from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/* Palette (column colors) */
const colors = [
  "#fef08a", // warm yellow
  "#93c5fd", // sky blue
  "#86efac", // mint green
  "#fda4af", // rose pink
  "#c4b5fd", // soft violet
  "#fca5a5", // coral red
  "#5eead4", // teal
  "#f9a8d4", // magenta pink
  "#a5f3fc", // light cyan
  "#fcd34d", // amber
];

/* Contrast text color */
function getContrastColor(hex) {
  if (!hex) return "000000";
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "000000" : "FFFFFF";
}

/* Build rows: root → leaf */
const buildRowsByLevels = (nodes, path = [], rows = []) => {
  for (const n of nodes || []) {
    const nodeName = n?.name || "";
    const nodeLabel = n?.spouses?.length ? `${nodeName}-${n.spouses.join("-")}` : nodeName;
    const currentPath = [...path, nodeLabel];
    if (n?.children?.length) {
      buildRowsByLevels(n.children, currentPath, rows);
    } else {
      rows.push(currentPath);
    }
  }
  return rows;
};

/* Helper: build worksheet */
function buildSheet(wb, sheetName, rows, headers, colors) {
  const ws = wb.addWorksheet(sheetName);

  // Columns
  const columns = headers.map((h, c) => {
    let maxLen = String(h).length;
    for (let r = 0; r < rows.length; r++) {
      const v = rows[r][c];
      if (v && v.toString().length > maxLen) maxLen = v.toString().length;
    }
    return { header: h, key: `c${c}`, width: Math.min(Math.max(maxLen + 2, 12), 50) };
  });
  ws.columns = columns;

  // Header
  const headerRow = ws.getRow(1);
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF333333" } };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  headerRow.height = 20;

  // Data
  const maxDepth = headers.length;
  for (let i = 0; i < rows.length; i++) {
    const rowValues = rows[i];
    const excelRow = ws.getRow(i + 2);
    for (let c = 0; c < maxDepth; c++) {
      const cell = excelRow.getCell(c + 1);
      cell.value = rowValues[c] || "";
      const bgHex = colors[c % colors.length] || "#FFFFFF";
      const argb = "FF" + bgHex.replace("#", "").toUpperCase();
      const contrast = getContrastColor(bgHex);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
      cell.font = { color: { argb: "FF" + contrast } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    }
    excelRow.commit();
  }

  // Merge consecutive identical values
  const totalRows = rows.length + 1;
  for (let c = 0; c < maxDepth; c++) {
    let start = 2;
    while (start <= totalRows) {
      const startVal = ws.getCell(start, c + 1).value;
      if (!startVal) { start++; continue; }
      let end = start;
      while (end + 1 <= totalRows && ws.getCell(end + 1, c + 1).value === startVal) {
        end++;
      }
      if (end > start) {
        ws.mergeCells(start, c + 1, end, c + 1);
        const mergedCell = ws.getCell(start, c + 1);
        const bgHex = colors[c % colors.length] || "#FFFFFF";
        const argb = "FF" + bgHex.replace("#", "").toUpperCase();
        const contrast = getContrastColor(bgHex);
        mergedCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
        mergedCell.font = { color: { argb: "FF" + contrast } };
        mergedCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      }
      start = end + 1;
    }
  }

  ws.views = [{ state: "frozen", ySplit: 1 }];
}

export default function DownloadFamilyTreeExcel({ tree }) {
  const handleDownload = async () => {
    if (!tree || typeof tree !== "object") {
      alert("No tree provided to export.");
      return;
    }

let rootName = "";
if (tree.father || tree.mother) {
  // Root tree
  rootName = tree.mother ? `${tree.father || ""}-${tree.mother || ""}` : (tree.father || "");
} else {
  // Child node subtree
  rootName = tree.spouses?.length ? `${tree.name}-${tree.spouses.join("-")}` : tree.name || "";
}

    let rows = [];
    if (Array.isArray(tree.children) && tree.children.length > 0) {
      rows = buildRowsByLevels(tree.children, [rootName]);
    } else {
      rows = [[rootName]];
    }
    if (!rows || rows.length === 0) rows = [[rootName]];

    const maxDepth = Math.max(...rows.map((r) => r.length), 1);

    // Normalize
    const normalized = rows.map((r) => {
      const copy = [...r];
      while (copy.length < maxDepth) copy.push("");
      return copy;
    });

    const wb = new ExcelJS.Workbook();

    // Sheet 0 (full tree)
    const headersFull = Array.from({ length: maxDepth }, (_, i) => `Level ${i}`);
    buildSheet(wb, "FamilyTree", normalized, headersFull, colors);

    // Extra sheets: FromLevel1, FromLevel2, FromLevel3 ...
    for (let startLevel = 1; startLevel < maxDepth; startLevel++) {
      const trimmedRows = normalized.map(r => r.slice(startLevel));
      const depth = maxDepth - startLevel;
      if (depth <= 0) continue;

      const headers = Array.from({ length: depth }, (_, i) => `Level ${i + 1}`);
      buildSheet(wb, `FromLevel${startLevel}`, trimmedRows, headers, colors);
    }

    try {
      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer], { type: "application/octet-stream" }), "FamilyTree.xlsx");
    } catch (err) {
      console.error("Failed to generate Excel:", err);
      alert("Failed to generate Excel. See console for details.");
    }
  };

  return (
    <div onClick={handleDownload} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.5rem' }}>
      <span>📊</span>
      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Export Excel</span>
    </div>
  );
}

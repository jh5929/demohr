/** SpreadsheetML workbook. Excel opens it without a third-party parser. */
export function downloadWorkbook(filename: string, sheetName: string, rows: string[][]) {
  const esc = (value: string) =>
    value.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
  const body = rows
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => `<Cell><Data ss:Type="String">${esc(cell)}</Data></Cell>`)
          .join("")}</Row>`,
    )
    .join("");
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="${esc(sheetName)}"><Table>${body}</Table></Worksheet>
</Workbook>`;
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

export type CsvRecord = Record<string, string>;

function pushField(row: string[], field: string) {
  row.push(field.trim());
}

export function parseCsv(text: string): CsvRecord[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      pushField(currentRow, currentField);
      currentField = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      pushField(currentRow, currentField);
      currentField = "";

      if (currentRow.some((value) => value.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];

      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    pushField(currentRow, currentField);
    if (currentRow.some((value) => value.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());
  const dataRows = rows.slice(1);

  return dataRows
    .filter((row) => row.some((value) => value.trim().length > 0))
    .map((row) => {
      const record: CsvRecord = {};
      headers.forEach((header, index) => {
        if (!header) return;
        record[header] = row[index]?.trim() ?? "";
      });
      return record;
    });
}

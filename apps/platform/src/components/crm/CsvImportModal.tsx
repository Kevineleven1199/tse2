"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileText,
  Check,
  AlertTriangle,
  X,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/src/lib/utils";

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  importType: "customer" | "lead";
}

type Step = "upload" | "preview" | "mapping" | "importing" | "results";

interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

interface ColumnMapping {
  [key: string]: string;
}

interface ImportResults {
  imported: number;
  skipped: number;
  errors: string[];
}

// Column mapping definitions
const COLUMN_MAPPINGS = {
  customer: {
    firstName: ["first name", "firstname", "first_name", "name"],
    lastName: ["last name", "lastname", "last_name", "surname"],
    email: ["email", "e-mail", "email address"],
    phone: ["phone", "telephone", "phone number", "tel", "mobile"],
    address: ["address", "street", "address1", "street address"],
    city: ["city", "town"],
    state: ["state", "province", "region"],
    postalCode: ["zip", "zipcode", "zip code", "postal code", "postalcode"],
  },
  lead: {
    businessName: ["business", "business name", "company", "company name"],
    contactName: ["contact", "contact name", "name", "person"],
    contactEmail: ["email", "e-mail", "contact email"],
    contactPhone: ["phone", "telephone", "contact phone", "tel"],
    address: ["address", "street"],
    city: ["city", "town"],
    state: ["state", "province", "region"],
    postalCode: ["zip", "zipcode", "zip code", "postal code", "postalcode"],
    website: ["website", "url", "web"],
    industry: ["industry", "type", "business type"],
    sqft: ["sqft", "square feet", "square footage", "sq ft"],
    source: ["source", "lead source", "origin"],
    notes: ["notes", "comments", "description"],
  },
};

export function CsvImportModal({
  isOpen,
  onClose,
  onSuccess,
  importType,
}: CsvImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    },
    []
  );

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a CSV file");
      return;
    }

    const text = await file.text();
    const parsed = parseCsv(text);
    setParsedCsv(parsed);

    // Auto-detect column mapping
    const mapping = autoDetectMapping(parsed.headers, importType);
    setColumnMapping(mapping);

    setStep("mapping");
  }, [importType]);

  const handleColumnMappingChange = useCallback(
    (csvHeader: string, fieldName: string) => {
      setColumnMapping((prev) => ({
        ...prev,
        [csvHeader]: fieldName,
      }));
    },
    []
  );

  const handleImport = useCallback(async () => {
    if (!parsedCsv) return;

    setIsImporting(true);
    setStep("importing");

    try {
      // Transform rows using column mapping
      const mappedRecords = parsedCsv.rows.map((row) => {
        const mappedRow: Record<string, string> = {};
        Object.entries(columnMapping).forEach(([csvHeader, fieldName]) => {
          if (fieldName && row[csvHeader] !== undefined) {
            mappedRow[fieldName] = row[csvHeader];
          }
        });
        return mappedRow;
      });

      const response = await fetch("/api/admin/customers/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: mappedRecords,
          type: importType,
        }),
      });

      const data: ImportResults = await response.json();

      if (!response.ok) {
        throw new Error(data.errors?.[0] || "Import failed");
      }

      setImportResults(data);
      setStep("results");
    } catch (error) {
      setImportResults({
        imported: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : "Import failed"],
      });
      setStep("results");
    } finally {
      setIsImporting(false);
    }
  }, [parsedCsv, columnMapping, importType]);

  const handleClose = useCallback(() => {
    setStep("upload");
    setParsedCsv(null);
    setColumnMapping({});
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  }, [onClose]);

  const handleSuccess = useCallback(() => {
    handleClose();
    onSuccess();
  }, [handleClose, onSuccess]);

  const handleReset = useCallback(() => {
    setStep("upload");
    setParsedCsv(null);
    setColumnMapping({});
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const stepNumber = {
    upload: 1,
    preview: 2,
    mapping: 2,
    importing: 3,
    results: 3,
  }[step];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Import {importType === "customer" ? "Customers" : "Leads"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Step {stepNumber} of 3
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-6">
          <div className="flex gap-2">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={cn(
                  "flex-1 h-1 rounded-full transition",
                  num <= stepNumber ? "bg-green-500" : "bg-gray-200"
                )}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-80">
          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-gray-700">Select a CSV file to import</p>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer",
                  isDragging
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 hover:border-green-400"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-900 font-medium">
                  Drag and drop your CSV file here
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {step === "mapping" && parsedCsv && (
            <div className="space-y-4">
              <div>
                <p className="text-gray-700 font-medium mb-3">
                  Map your CSV columns
                </p>
                <p className="text-gray-600 text-sm mb-4">
                  We detected {parsedCsv.headers.length} columns. Review the
                  mapping below.
                </p>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {parsedCsv.headers.slice(0, 5).map((header) => (
                        <th
                          key={header}
                          className="px-3 py-2 text-left font-medium text-gray-700 truncate"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedCsv.rows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        {parsedCsv.headers.slice(0, 5).map((header) => (
                          <td
                            key={header}
                            className="px-3 py-2 text-gray-600 truncate text-xs"
                          >
                            {row[header]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Column Mapping */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {parsedCsv.headers.map((header) => {
                  const mapping =
                    COLUMN_MAPPINGS[importType as keyof typeof COLUMN_MAPPINGS];
                  const fieldNames = Object.keys(mapping);
                  const currentMapping = columnMapping[header];
                  const isMapped = currentMapping && fieldNames.includes(currentMapping);

                  return (
                    <div key={header} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {header}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={currentMapping || ""}
                          onChange={(e) =>
                            handleColumnMappingChange(header, e.target.value)
                          }
                          className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">-- Unmapped --</option>
                          {fieldNames.map((field) => (
                            <option key={field} value={field}>
                              {field}
                            </option>
                          ))}
                        </select>
                        {isMapped ? (
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center justify-center h-80">
              <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
              <p className="text-gray-900 font-medium">Importing records...</p>
              <p className="text-gray-600 text-sm mt-1">
                Please wait while we process your file
              </p>
            </div>
          )}

          {step === "results" && importResults && (
            <div className="space-y-4">
              <div
                className={cn(
                  "p-4 rounded-lg",
                  importResults.errors.length > 0
                    ? "bg-yellow-50 border border-yellow-200"
                    : "bg-green-50 border border-green-200"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {importResults.errors.length > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <Check className="w-5 h-5 text-green-600" />
                  )}
                  <h3 className="font-medium text-gray-900">Import Complete</h3>
                </div>

                <div className="space-y-1 text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium text-green-600">
                      {importResults.imported}
                    </span>{" "}
                    records imported
                  </p>
                  {importResults.skipped > 0 && (
                    <p className="text-gray-700">
                      <span className="font-medium text-yellow-600">
                        {importResults.skipped}
                      </span>{" "}
                      records skipped
                    </p>
                  )}
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 text-sm mb-2">
                    Errors ({importResults.errors.length})
                  </h4>
                  <ul className="space-y-1 text-xs text-red-800">
                    {importResults.errors.slice(0, 5).map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                    {importResults.errors.length > 5 && (
                      <li className="text-red-700 font-medium">
                        ... and {importResults.errors.length - 5} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="pt-2">
                <p className="text-xs text-gray-600">
                  Total records processed: {importResults.imported + importResults.skipped}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
          {step === "results" ? (
            <>
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Import Another File
              </button>
              <button
                onClick={handleSuccess}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
              >
                Done
              </button>
            </>
          ) : step === "importing" ? (
            <div className="w-full px-4 py-2 text-center text-gray-600">
              Please wait...
            </div>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              {step === "mapping" && (
                <>
                  <button
                    onClick={() => setStep("upload")}
                    className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium flex items-center justify-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={handleImport}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium flex items-center justify-center gap-2"
                  >
                    Import
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Parse CSV text into headers and rows
 */
function parseCsv(text: string): ParsedCsv {
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Auto-detect column mapping based on header names
 */
function autoDetectMapping(
  headers: string[],
  importType: "customer" | "lead"
): ColumnMapping {
  const mapping: ColumnMapping = {};
  const fieldMapping =
    COLUMN_MAPPINGS[importType as keyof typeof COLUMN_MAPPINGS];

  headers.forEach((header) => {
    const headerLower = header.toLowerCase();

    for (const [fieldName, aliases] of Object.entries(fieldMapping)) {
      if (
        aliases.some((alias) =>
          headerLower.includes(alias.toLowerCase())
        )
      ) {
        mapping[header] = fieldName;
        break;
      }
    }
  });

  return mapping;
}

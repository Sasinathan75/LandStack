// server/reports/documentStore.ts

import { GeneratedReport } from "./reportService";

// Simple in‑memory store keyed by report ID
const documentMap: Record<string, GeneratedReport> = {};

export function saveDocument(report: GeneratedReport): void {
  documentMap[report.id] = report;
}

export function getDocument(id: string): GeneratedReport | undefined {
  return documentMap[id];
}

export function listDocuments(parcelId?: string): GeneratedReport[] {
  const all = Object.values(documentMap);
  if (parcelId) {
    return all.filter((doc) => doc.parcelId === parcelId);
  }
  return all;
}

export function deleteDocument(id: string): boolean {
  if (documentMap[id]) {
    delete documentMap[id];
    return true;
  }
  return false;
}

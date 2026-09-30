import { demoParcels } from "./parcels";
import { demoCitizens, primaryCitizen } from "./citizens";
import { validationResults } from "./validations";
import { satelliteObservations } from "./satellite";
import { serviceRequests } from "./requests";
import { demoReviewCases } from "./reviews";
import { notifications } from "./notifications";
import { demoLandRecords, demoTransactions } from "./landRecords";
import type { Parcel } from "@/types/parcel";
import type { AIValidationResult, NotificationRecord, SatelliteObservation, ServiceRequest } from "@/types/platform";
import type { ReviewCase } from "./reviews";
import type { LandRecordItem } from "./landRecords";

export function getParcelById(parcelId: string): Parcel | undefined {
  return demoParcels.find((p) => p.id.toLowerCase() === parcelId.toLowerCase());
}

export function getParcelByUlpin(ulpin: string): Parcel | undefined {
  return demoParcels.find((p) => p.ulpin.toLowerCase() === ulpin.toLowerCase());
}

export function getCitizenById(citizenId: string) {
  return demoCitizens.find((c) => c.id.toLowerCase() === citizenId.toLowerCase()) ?? primaryCitizen;
}

export function getRequestsByCitizenId(citizenId: string): ServiceRequest[] {
  return serviceRequests.filter((r) => r.citizenId.toLowerCase() === citizenId.toLowerCase());
}

export function getRequestsByParcelId(parcelId: string): ServiceRequest[] {
  return serviceRequests.filter((r) => r.parcelId.toLowerCase() === parcelId.toLowerCase());
}

export function getValidationByParcelId(parcelId: string): AIValidationResult | undefined {
  return validationResults.find((v) => v.parcelId.toLowerCase() === parcelId.toLowerCase());
}

export function getValidationsByParcelId(parcelId: string): AIValidationResult[] {
  return validationResults.filter((v) => v.parcelId.toLowerCase() === parcelId.toLowerCase());
}

export function getSatelliteObservationByParcelId(parcelId: string): SatelliteObservation | undefined {
  return satelliteObservations.find((s) => s.parcelId.toLowerCase() === parcelId.toLowerCase());
}

export function getReviewCaseByParcelId(parcelId: string): ReviewCase | undefined {
  return demoReviewCases.find((r) => r.parcelId.toLowerCase() === parcelId.toLowerCase());
}

export function getNotificationsByCitizenId(citizenId?: string): NotificationRecord[] {
  return notifications.filter((n) => n.audience === "citizen");
}

export function getLandRecordsByParcelId(parcelId: string): LandRecordItem[] {
  return demoLandRecords.filter((r) => r.parcelId.toLowerCase() === parcelId.toLowerCase());
}

export function getTransactionsByParcelId(parcelId: string) {
  return demoTransactions.filter((t) => t.parcelId.toLowerCase() === parcelId.toLowerCase());
}

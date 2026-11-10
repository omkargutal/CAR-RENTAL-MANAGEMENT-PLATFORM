/**
 * AutoFleet Pro - Central Policy & Business Configuration
 *
 * This file centralizes verified business contacts, service classifications,
 * and policy placeholders requiring formal legal/business confirmation.
 *
 * IMPORTANT:
 * - AutoFleet Pro is a Cab & Taxi, Corporate Mobility, and Tour Service Provider.
 * - AutoFleet Pro does NOT provide self-drive car rentals.
 * - Items tagged "[Pending Business Confirmation]" or "[Pending Legal Confirmation]"
 *   are illustrative and subject to final management and legal approval.
 */

export interface PolicyScheduleTier {
  timing: string;
  treatment: string;
  status: "Proposed / Pending Confirmation" | "Confirmed";
  notes?: string;
}

export interface BusinessPolicyConfig {
  brandName: string;
  tagline: string;
  legalEntityName: string;
  registeredOffice: string;
  primaryPhone: string;
  whatsappPhone: string;
  supportEmail: string;
  nationalEmergencyNumber: string;
  operatingCountry: string;
  governingJurisdiction: string;
  effectiveDate: string;
  lastUpdated: string;
  businessModelSummary: string;
  coreServices: string[];
  cancellationSchedule: PolicyScheduleTier[];
  proposedTerms: {
    freeCancellationWindowHours: number;
    standardWaitingMinutesAirport: number;
    standardWaitingMinutesLocal: number;
    refundProcessingDays: string;
    noShowPolicySummary: string;
    dispatchFeeSummary: string;
  };
}

export const BUSINESS_POLICY_CONFIG: BusinessPolicyConfig = {
  brandName: "Swaraj Tours & Travel",
  tagline: "Trusted Cab, Taxi, Corporate Mobility & Tour Services",
  legalEntityName: "[Pending Business Confirmation: Swaraj Tours & Travel Pvt. Ltd.]",
  registeredOffice: "[Pending Business Confirmation: Registered Corporate Office, Maharashtra, India]",
  primaryPhone: "+91 8421081570",
  whatsappPhone: "+91 8421081570",
  supportEmail: "swarajcabservice@gmail.com",
  nationalEmergencyNumber: "112",
  operatingCountry: "India",
  governingJurisdiction: "[Pending Legal Confirmation: Competent Courts of Maharashtra, India]",
  effectiveDate: "November 5, 2026",
  lastUpdated: "November 5, 2026",
  businessModelSummary:
    "Cab and passenger travel service provider offering local cabs, outstation one-way and round-trip journeys, airport transfers, corporate employee commute, and curated tours/pilgrimages. We do NOT provide self-drive rentals.",
  coreServices: [
    "Local Cab & Point-to-Point City Rides",
    "Outstation One-Way Cab Services",
    "Outstation Round Trips & Multi-Day Journeys",
    "Guaranteed Airport Pickup & Drop Transfers",
    "Corporate & Employee Transportation",
    "Daily Staff Commute & Office Shuttles",
    "Tours, Travels & Holiday Packages",
    "Spiritual Pilgrimage Trips (Ashtavinayak, Jyotirlinga, etc.)",
    "Family Sightseeing & Weekend Getaway Tours",
    "Customized Group Travel Experiences",
  ],
  cancellationSchedule: [
    {
      timing: "More than 48 hours before scheduled pickup",
      treatment: "Full refund or applicable minor payment processing deductions",
      status: "Proposed / Pending Confirmation",
      notes: "Subject to gateway transaction processing fees where applicable",
    },
    {
      timing: "24 to 48 hours before scheduled pickup",
      treatment: "Partial refund based on fleet category and itinerary arrangements",
      status: "Proposed / Pending Confirmation",
      notes: "Illustrative rate: 50% to 75% refund depending on vehicle tier",
    },
    {
      timing: "Less than 24 hours before scheduled pickup",
      treatment: "Applicable cancellation fee up to 50% of confirmed advance/fare",
      status: "Proposed / Pending Confirmation",
      notes: "Compensates driver scheduling and vehicle lock-in",
    },
    {
      timing: "After driver or vehicle has been dispatched",
      treatment: "Dispatch charges plus applicable cancellation fee",
      status: "Proposed / Pending Confirmation",
      notes: "Driver transit fuel and dead-mileage recovery",
    },
    {
      timing: "Customer No-Show (unreachable or absent after waiting grace period)",
      treatment: "Applicable no-show charge up to 100% of the advance booking fee",
      status: "Proposed / Pending Confirmation",
      notes: "Subject to verification of driver on-site GPS arrival",
    },
  ],
  proposedTerms: {
    freeCancellationWindowHours: 24,
    standardWaitingMinutesAirport: 45,
    standardWaitingMinutesLocal: 15,
    refundProcessingDays: "5 to 7 business days",
    noShowPolicySummary:
      "Customer absent at confirmed pickup location and unreachable after 15 minutes (local) or 45 minutes (airport arrival)",
    dispatchFeeSummary: "Nominal fuel & driver allowance deduction for physical dispatch",
  },
};

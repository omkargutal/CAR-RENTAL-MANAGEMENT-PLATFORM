/**
 * Centralized vehicle sorting and seating capacity utilities.
 * Ensures strict capacity-based sequence everywhere vehicles are displayed:
 * Customer (Explore Cars, Car Detail, Booking Flow), Admin, and Staff dashboards.
 */

export interface VehicleLike {
  id?: string;
  model?: string;
  make?: string;
  brand?: string;
  seats?: number;
  seating_capacity?: number;
  sort_order?: number;
  seating_capacity_label?: string;
  specs?: Record<string, any>;
  [key: string]: any;
}

export const CANONICAL_VEHICLE_SEQUENCE: Array<{
  sort_order: number;
  make: string;
  modelMatch: string;
  canonicalModel: string;
  minSeats: number;
  seating_capacity_label: string;
  localImage: string;
}> = [
  {
    sort_order: 1,
    make: "Mahindra",
    modelMatch: "thar",
    canonicalModel: "Thar 4x4",
    minSeats: 4,
    seating_capacity_label: "4 Seater",
    localImage: "/assets/vehicles/mahindra-thar/mahindra-thar-4x4.png",
  },
  {
    sort_order: 2,
    make: "Hyundai",
    modelMatch: "aura",
    canonicalModel: "Aura",
    minSeats: 5,
    seating_capacity_label: "5 Seater",
    localImage: "/assets/vehicles/hyundai-aura/hyundai-aura.png",
  },
  {
    sort_order: 3,
    make: "Maruti Suzuki",
    modelMatch: "dzire",
    canonicalModel: "White Maruti Suzuki Dzire",
    minSeats: 5,
    seating_capacity_label: "5 Seater",
    localImage: "/assets/vehicles/maruti-suzuki-dzire/white-maruti-suzuki-dzire.png",
  },
  {
    sort_order: 4,
    make: "Maruti Suzuki",
    modelMatch: "ertiga",
    canonicalModel: "Maruti Suzuki Ertiga",
    minSeats: 7,
    seating_capacity_label: "7 Seater",
    localImage: "/assets/vehicles/maruti-suzuki-ertiga/maruti-suzuki-ertiga.png",
  },
  {
    sort_order: 5,
    make: "Toyota",
    modelMatch: "crysta",
    canonicalModel: "Toyota Innova Crysta",
    minSeats: 7,
    seating_capacity_label: "7 Seater",
    localImage: "/assets/vehicles/toyota-innova-crysta/toyota-innova-crysta.png",
  },
  {
    sort_order: 6,
    make: "Toyota",
    modelMatch: "innova",
    canonicalModel: "Toyota Innova",
    minSeats: 8,
    seating_capacity_label: "7+1 Seater",
    localImage: "/assets/vehicles/toyota-innova/toyota-innova-7-plus-1.png",
  },
  {
    sort_order: 7,
    make: "Mahindra",
    modelMatch: "scorpio",
    canonicalModel: "Mahindra Scorpio",
    minSeats: 9,
    seating_capacity_label: "8+1 Seater",
    localImage: "/assets/vehicles/mahindra-scorpio/mahindra-scorpio-8-plus-1.png",
  },
  {
    sort_order: 8,
    make: "Chevrolet",
    modelMatch: "tavera",
    canonicalModel: "Tavera",
    minSeats: 9,
    seating_capacity_label: "8+1 Seater",
    localImage: "/assets/vehicles/tavera/tavera-8-plus-1.png",
  },
  {
    sort_order: 9,
    make: "Force",
    modelMatch: "traveller",
    canonicalModel: "Traveller Van",
    minSeats: 12,
    seating_capacity_label: "12–20 Seater",
    localImage: "/assets/vehicles/traveller-van/traveller-van-12-20.png",
  },
  {
    sort_order: 10,
    make: "BharatBenz",
    modelMatch: "coach",
    canonicalModel: "Luxury Coach Bus",
    minSeats: 31,
    seating_capacity_label: "31–40 Seater",
    localImage: "/assets/vehicles/luxury-coach-bus/luxury-coach-bus-31-40.png",
  },
];

/**
 * Identify canonical sort index for a vehicle.
 */
export function getVehicleCanonicalOrder(v: VehicleLike): number {
  if (typeof v.sort_order === "number" && v.sort_order > 0 && v.sort_order <= 10) {
    return v.sort_order;
  }

  const modelLower = (v.model || "").toLowerCase();
  const makeLower = (v.make || v.brand || "").toLowerCase();
  const nameLower = `${makeLower} ${modelLower}`;

  if (nameLower.includes("thar")) return 1;
  if (nameLower.includes("aura")) return 2;
  if (nameLower.includes("dzire")) return 3;
  if (nameLower.includes("ertiga")) return 4;
  if (nameLower.includes("crysta")) return 5;
  if (nameLower.includes("innova")) return 6;
  if (nameLower.includes("scorpio")) return 7;
  if (nameLower.includes("tavera")) return 8;
  if (nameLower.includes("traveller")) return 9;
  if (nameLower.includes("coach") || nameLower.includes("bus")) return 10;

  // Fallback to numeric seating capacity
  const seats = v.seats || v.seating_capacity || 5;
  return 100 + seats;
}

/**
 * Returns human-readable seating capacity label matching the required specification.
 */
export function getVehicleSeatingLabel(v: VehicleLike): string {
  if (v.seating_capacity_label) return v.seating_capacity_label;
  if (v.specs?.seating_capacity_label) return v.specs.seating_capacity_label;

  const order = getVehicleCanonicalOrder(v);
  if (order === 1) return "4 Seater";
  if (order === 2 || order === 3) return "5 Seater";
  if (order === 4 || order === 5) return "7 Seater";
  if (order === 6) return "7+1 Seater";
  if (order === 7 || order === 8) return "8+1 Seater";
  if (order === 9) return "12–20 Seater";
  if (order === 10) return "31–40 Seater";

  const seats = v.seats || v.seating_capacity || 5;
  return `${seats} Seater`;
}

/**
 * Sorts any list of vehicles into the strict required sequence:
 * 1. Mahindra Thar 4x4 (4 Seater)
 * 2. Hyundai Aura (5 Seater)
 * 3. White Maruti Suzuki Dzire (5 Seater)
 * 4. Maruti Suzuki Ertiga (7 Seater)
 * 5. Toyota Innova Crysta (7 Seater)
 * 6. Toyota Innova (7+1 Seater)
 * 7. Mahindra Scorpio (8+1 Seater)
 * 8. Tavera (8+1 Seater)
 * 9. Traveller Van (12–20 Seater)
 * 10. Luxury Coach Bus (31–40 Seater)
 */
export function sortVehiclesByRequiredSequence<T extends VehicleLike>(vehicles: T[]): T[] {
  return [...vehicles].sort((a, b) => {
    const orderA = getVehicleCanonicalOrder(a);
    const orderB = getVehicleCanonicalOrder(b);
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    const seatsA = a.seats || a.seating_capacity || 0;
    const seatsB = b.seats || b.seating_capacity || 0;
    return seatsA - seatsB;
  });
}

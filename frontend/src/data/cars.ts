import type { Car } from "@/components/CarCard";

export function getVehiclePerKmRate(vehicle: { name?: string; model?: string; sort_order?: number; brand?: string; make?: string }): number {
  const text = `${vehicle.name || ""} ${vehicle.model || ""} ${vehicle.brand || ""} ${vehicle.make || ""}`.toLowerCase();
  
  if (text.includes("aura") || text.includes("dzire")) return 14;
  if (text.includes("ertiga")) return 16;
  if (text.includes("tavera")) return 18;
  if (text.includes("innova") && !text.includes("crysta")) return 18; // Innova (7+1)
  if (text.includes("crysta") || text.includes("scorpio") || text.includes("thar")) return 22;
  if (text.includes("traveller")) return 30;
  if (text.includes("coach") || text.includes("bus")) return 45;

  // Fallback by sort_order
  if (vehicle.sort_order === 1) return 22; // Thar
  if (vehicle.sort_order === 2 || vehicle.sort_order === 3) return 14; // Aura, Dzire
  if (vehicle.sort_order === 4) return 16; // Ertiga
  if (vehicle.sort_order === 5) return 22; // Innova Crysta
  if (vehicle.sort_order === 6) return 18; // Innova 7+1
  if (vehicle.sort_order === 7) return 22; // Scorpio 8+1
  if (vehicle.sort_order === 8) return 18; // Tavera 8+1
  if (vehicle.sort_order === 9) return 30; // Traveller Van 12-20
  if (vehicle.sort_order === 10) return 45; // Luxury Coach Bus 31-40
  
  return 14;
}

export function getVehicleOutstationMinKm(vehicle: { name?: string; model?: string; sort_order?: number; brand?: string; make?: string; specs?: Record<string, any> }): number {
  if (vehicle.specs?.outstation_min_km) {
    const parsed = Number(vehicle.specs.outstation_min_km);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (vehicle.specs?.min_km_per_day) {
    const parsed = Number(vehicle.specs.min_km_per_day);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  const text = `${vehicle.name || ""} ${vehicle.model || ""} ${vehicle.brand || ""} ${vehicle.make || ""}`.toLowerCase();
  if (text.includes("aura") || text.includes("dzire")) return 150;
  if (text.includes("ertiga") || text.includes("innova")) return 200;
  return 250;
}

export const MOCK_CARS: Car[] = [
  {
    id: "1f441ca8-781f-4332-a05f-e024620dacd6",
    name: "Mahindra Thar 4x4",
    brand: "Mahindra",
    category: "SUV",
    image: "/assets/vehicles/mahindra-thar/mahindra-thar-4x4.png",
    pricePerDay: 5500,
    perKmRate: 22,
    rating: 4.9,
    reviewCount: 312,
    seats: 4,
    seatingCapacityLabel: "4 Seater",
    fuel: "Diesel",
    transmission: "Manual",
    available: true,
    badge: "Adventure & Hill Tours",
    featured: true,
    sort_order: 1,
  },
  {
    id: "9aeadbf8-ef83-4a55-9a5c-b3d31dac341c",
    name: "Hyundai Aura",
    brand: "Hyundai",
    category: "Sedan",
    image: "/assets/vehicles/hyundai-aura/hyundai-aura.png",
    pricePerDay: 3500,
    perKmRate: 14,
    rating: 4.8,
    reviewCount: 198,
    seats: 5,
    seatingCapacityLabel: "5 Seater",
    fuel: "Gasoline",
    transmission: "Manual",
    available: true,
    badge: "Best Value",
    featured: true,
    sort_order: 2,
  },
  {
    id: "7c5262ae-cec8-4ccf-a6ff-9d42d4276354",
    name: "White Maruti Suzuki Dzire",
    brand: "Maruti Suzuki",
    category: "Sedan",
    image: "/assets/vehicles/maruti-suzuki-dzire/white-maruti-suzuki-dzire.png",
    pricePerDay: 3500,
    perKmRate: 14,
    rating: 4.9,
    reviewCount: 420,
    seats: 5,
    seatingCapacityLabel: "5 Seater",
    fuel: "Gasoline",
    transmission: "Manual",
    available: true,
    badge: "Most Popular",
    featured: true,
    sort_order: 3,
  },
  {
    id: "303216c5-bf92-4b4b-bd67-8520134c8d32",
    name: "Maruti Suzuki Ertiga",
    brand: "Maruti Suzuki",
    category: "MPV",
    image: "/assets/vehicles/maruti-suzuki-ertiga/maruti-suzuki-ertiga.png",
    pricePerDay: 4000,
    perKmRate: 16,
    rating: 4.8,
    reviewCount: 276,
    seats: 7,
    seatingCapacityLabel: "7 Seater",
    fuel: "Gasoline",
    transmission: "Manual",
    available: true,
    badge: "Family Choice",
    featured: true,
    sort_order: 4,
  },
  {
    id: "95c64444-b520-4ff3-8a80-daa4c15274d3",
    name: "Toyota Innova Crysta",
    brand: "Toyota",
    category: "MPV",
    image: "/assets/vehicles/toyota-innova-crysta/toyota-innova-crysta.png",
    pricePerDay: 5500,
    perKmRate: 22,
    rating: 4.9,
    reviewCount: 512,
    seats: 7,
    seatingCapacityLabel: "7 Seater",
    fuel: "Diesel",
    transmission: "Automatic",
    available: true,
    badge: "Executive Comfort",
    featured: true,
    sort_order: 5,
  },
  {
    id: "8e853f79-935d-4e96-b24a-9955668199fa",
    name: "Toyota Innova",
    brand: "Toyota",
    category: "MPV",
    image: "/assets/vehicles/toyota-innova/toyota-innova-7-plus-1.png",
    pricePerDay: 4500,
    perKmRate: 18,
    rating: 4.8,
    reviewCount: 389,
    seats: 8,
    seatingCapacityLabel: "7+1 Seater",
    fuel: "Diesel",
    transmission: "Manual",
    available: true,
    badge: "Spacious Travel",
    sort_order: 6,
  },
  {
    id: "4ad15c6e-6e2d-40db-9a98-0ec35645e584",
    name: "Mahindra Scorpio",
    brand: "Mahindra",
    category: "SUV",
    image: "/assets/vehicles/mahindra-scorpio/mahindra-scorpio-8-plus-1.png",
    pricePerDay: 5500,
    perKmRate: 22,
    rating: 4.7,
    reviewCount: 245,
    seats: 9,
    seatingCapacityLabel: "8+1 Seater",
    fuel: "Diesel",
    transmission: "Manual",
    available: true,
    badge: "Rugged Power",
    sort_order: 7,
  },
  {
    id: "40641d65-175d-4296-8000-1caf1836c093",
    name: "Tavera",
    brand: "Chevrolet",
    category: "MPV",
    image: "/assets/vehicles/tavera/tavera-8-plus-1.png",
    pricePerDay: 4500,
    perKmRate: 18,
    rating: 4.6,
    reviewCount: 167,
    seats: 9,
    seatingCapacityLabel: "8+1 Seater",
    fuel: "Diesel",
    transmission: "Manual",
    available: true,
    badge: "Group Touring",
    sort_order: 8,
  },
  {
    id: "462320d4-ec6c-4b40-96bd-97f119349ebe",
    name: "Traveller Van",
    brand: "Force",
    category: "Van",
    image: "/assets/vehicles/traveller-van/traveller-van-12-20.png",
    pricePerDay: 7500,
    perKmRate: 30,
    rating: 4.9,
    reviewCount: 180,
    seats: 12,
    seatingCapacityLabel: "12–20 Seater",
    fuel: "Diesel",
    transmission: "Manual",
    available: true,
    badge: "Mini Bus",
    sort_order: 9,
  },
  {
    id: "6b3bc4be-7b11-4fe5-bffe-aaab27a4eac9",
    name: "Luxury Coach Bus",
    brand: "BharatBenz",
    category: "Bus",
    image: "/assets/vehicles/luxury-coach-bus/luxury-coach-bus-31-40.png",
    pricePerDay: 11250,
    perKmRate: 45,
    rating: 5.0,
    reviewCount: 94,
    seats: 31,
    seatingCapacityLabel: "31–40 Seater",
    fuel: "Diesel",
    transmission: "Manual",
    available: true,
    badge: "Luxury Group",
    sort_order: 10,
  },
];

export const CATEGORIES = ["All", "SUV", "Sedan", "MPV", "Van", "Bus"];

export const LOCATIONS_DATA = [
  { id: "mum", name: "Mumbai CSMT & Airport T2 Hub", address: "Terminal 2 & BKC Corridor, Mumbai", vehicles: 48 },
  { id: "pun", name: "Pune Hinjawadi & Station Hub", address: "Infotech Park, Hinjawadi Phase 1, Pune", vehicles: 36 },
  { id: "del", name: "Delhi NCR & IGI Airport T3 Hub", address: "Terminal 3 & Aerocity Corridor, New Delhi", vehicles: 52 },
  { id: "blr", name: "Bengaluru Kempegowda & Central Hub", address: "MG Road & Airport Corridor, Bengaluru", vehicles: 40 },
];

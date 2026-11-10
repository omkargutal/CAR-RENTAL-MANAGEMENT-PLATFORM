import { Link } from "react-router-dom";
import { Star, Users, Fuel, Gauge, ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getVehiclePerKmRate } from "@/data/cars";

export interface Car {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  pricePerDay: number;
  perKmRate?: number;
  rating: number;
  reviewCount: number;
  seats: number;
  seatingCapacityLabel?: string;
  fuel: string;
  transmission: string;
  available: boolean;
  featured?: boolean;
  badge?: string;
  sort_order?: number;
}

interface CarCardProps {
  car: Car;
  className?: string;
}

const getTripSuitability = (sortOrder?: number, seats?: number): string => {
  if (sortOrder === 1) return "Adventure & Hill Tours";
  if (sortOrder === 2) return "Local City & Airport Cab";
  if (sortOrder === 3) return "Most Popular Outstation Cab";
  if (sortOrder === 4) return "Family Tours & Outstation";
  if (sortOrder === 5) return "Executive & Long Distance";
  if (sortOrder === 6) return "Spacious Family Travel";
  if (sortOrder === 7) return "Pilgrimage & Sacred Circuits";
  if (sortOrder === 8) return "Rugged Group Outstation";
  if (sortOrder === 9) return "Large Group & Event Shuttle";
  if (sortOrder === 10) return "Corporate & Large Group Bus";
  if (seats && seats >= 30) return "Corporate & Large Group Bus";
  if (seats && seats >= 12) return "Group Tours & Pilgrimages";
  if (seats && seats >= 7) return "Family & Outstation Travel";
  return "City Rides & Airport Transfers";
};

export function CarCard({ car, className }: CarCardProps) {
  const suitability = getTripSuitability(car.sort_order, car.seats);

  return (
    <div className={cn("group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm card-hover flex flex-col justify-between", className)}>
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/80 flex items-center justify-center p-3">
        <img
          src={car.image}
          alt={car.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `/assets/vehicles/mahindra-thar/mahindra-thar-4x4.png`;
          }}
        />
        {car.badge && (
          <div className="absolute top-3 left-3">
            <Badge variant="default" className="text-xs font-bold shadow-sm">{car.badge}</Badge>
          </div>
        )}
        {!car.available && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
            <Badge variant="secondary" className="text-sm">Assigned / Dispatched</Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between mb-1.5">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-0.5">{car.brand}</p>
              <h3 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">{car.name}</h3>
            </div>
            <Badge variant="secondary" className="shrink-0 ml-2 font-medium">{car.category}</Badge>
          </div>

          {/* Trip Suitability Tag */}
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              <CheckCircle2 className="h-3 w-3" />
              {suitability}
            </span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-3">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-semibold text-slate-800">{car.rating.toFixed(1)}</span>
            <span className="text-xs text-slate-500">({car.reviewCount} trips)</span>
          </div>

          {/* Specs */}
          <div className="flex items-center justify-between text-xs text-slate-600 mb-4 py-2 border-y border-slate-100">
            <div className="flex items-center gap-1 font-semibold text-slate-800">
              <Users className="h-3.5 w-3.5 text-blue-600" />
              <span>{car.seatingCapacityLabel || `${car.seats} Seats`}</span>
            </div>
            <div className="flex items-center gap-1">
              <Fuel className="h-3.5 w-3.5 text-slate-400" />
              <span>{car.fuel}</span>
            </div>
            <div className="flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5 text-slate-400" />
              <span>{car.transmission}</span>
            </div>
          </div>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Trip Fare</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">
                ₹{car.perKmRate || getVehiclePerKmRate(car)}
              </span>
              <span className="text-xs font-semibold text-slate-500">/ km</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold block">Driver & Fuel Included</span>
          </div>
          <Link to={`/cars/${car.id}`}>
            <Button size="sm" disabled={!car.available} className="gap-1.5 font-bold">
              Book Cab <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

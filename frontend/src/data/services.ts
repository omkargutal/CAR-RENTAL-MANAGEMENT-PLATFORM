export interface ServiceOffering {
  id: string;
  title: string;
  supportingHeading: string;
  tagline: string;
  shortDescription: string;
  fullDescription: string;
  image: string;
  anchor: string;
  href: string;
  ctaText: string;
  ctaHref: string;
  badge: string;
  features: string[];
  keyHighlights: {
    title: string;
    description: string;
  }[];
}

export interface TourPackage {
  id: string;
  title: string;
  category: "Pilgrimage Trips" | "Weekend Getaways" | "Sightseeing Tours" | "Outstation Travel" | "Family Tours";
  destination: string;
  image: string;
  tag: string;
  duration: string;
  description: string;
  highlights: string[];
  price?: string;
}

export const SERVICES_DATA: ServiceOffering[] = [
  {
    id: "explore-cars",
    title: "Explore Our Fleet",
    supportingHeading: "Cab & Passenger Fleet",
    tagline: "Vehicles from 4 to 40 seaters",
    shortDescription:
      "Well-maintained, sanitized sedans, SUVs, and luxury coaches for comfortable solo and group travel.",
    fullDescription:
      "Our passenger fleet offers the perfect ride for every journey and group size. From rugged 4x4 SUVs and efficient 5-seater sedans to spacious 7–9 seater family MPVs, 12–20 seater traveller vans, and 31–40 seater luxury coaches, every vehicle is well-maintained, sanitized, fully insured, and driven by experienced drivers for maximum safety and comfort.",
    image: "/assets/offerings/cab-and-passenger-fleet.png",
    anchor: "explore-cars",
    href: "/cars",
    ctaText: "Explore Our Fleet",
    ctaHref: "/cars",
    badge: "Cab & Passenger Fleet",
    features: [
      "Diverse Seating Capacities (4 to 40 Seaters)",
      "Clean, Air-Conditioned & Sanitized Vehicles",
      "Transparent Trip Fares & Zero Surge",
      "Experienced & Background-Verified Drivers",
      "24/7 Roadside Assistance & Dispatch Support",
    ],
    keyHighlights: [
      {
        title: "Exact Seating Sequence",
        description: "Choose from 4-seater Thars, 5-seater sedans, 7–9 seater family movers up to 40-seater luxury coaches.",
      },
      {
        title: "Pristine Fleet Condition",
        description: "Every vehicle undergoes regular mechanical inspections and thorough sanitization prior to every trip.",
      },
      {
        title: "Transparent Trip Fares",
        description: "Clear upfront quotes with no hidden charges, fair distance calculations, and flexible travel policies.",
      },
    ],
  },
  {
    id: "corporate-mobility",
    title: "Corporate Mobility",
    supportingHeading: "Corporate & Employee Transportation",
    tagline: "Reliable transport solutions for your business",
    shortDescription:
      "Punctual employee commutes, airport transfers, and dedicated enterprise transport backed by dedicated account management.",
    fullDescription:
      "Swaraj Tours & Travel delivers reliable, punctual, and safe corporate mobility programs custom-tailored for businesses, IT parks, and enterprises. Whether you require daily employee shift commutes, executive transfers for visiting leadership, or long-term dedicated fleet arrangements, our enterprise solutions streamline workforce mobility while ensuring total duty of care and cost optimization.",
    image: "/assets/offerings/corporate-and-employee-mobility.png",
    anchor: "corporate-mobility",
    href: "/services#corporate-mobility",
    ctaText: "Explore Corporate Solutions",
    ctaHref: "/contact?service=corporate-mobility",
    badge: "Corporate & Employee Mobility",
    features: [
      "Corporate transportation",
      "Employee pickup and drop",
      "Daily staff transportation",
      "Office commute services",
      "Business travel",
      "Dedicated vehicle arrangements",
    ],
    keyHighlights: [
      {
        title: "Punctual Enterprise SLA",
        description: "Time-optimized routes and standby vehicles guarantee zero disruption to your shift operations.",
      },
      {
        title: "Consolidated Billing",
        description: "Transparent monthly invoicing with detailed trip logs, GST compliance, and enterprise credit terms.",
      },
      {
        title: "Verified Drivers & Safety",
        description: "Background-verified drivers, GPS real-time tracking, speed governance, and SOS safety integration.",
      },
      {
        title: "Scalable Fleet Allocation",
        description: "Flexibility to scale from executive sedans to multi-route employee shuttle buses on short notice.",
      },
    ],
  },
  {
    id: "cab-services",
    title: "Cab Services",
    supportingHeading: "Local & Outstation Cab Services",
    tagline: "Safe, comfortable and on-time rides",
    shortDescription:
      "On-demand city rides, guaranteed airport drops, and reliable outstation cabs with verified drivers.",
    fullDescription:
      "Experience hassle-free travel with our premium cab services. Whether you need a swift point-to-point city ride, an early-morning guaranteed airport pickup, or an outstation road trip with family, we provide transparent fares, impeccably maintained cars, and courteous drivers who prioritize your comfort and safety every single kilometer.",
    image: "/assets/offerings/local-and-outstation-cabs.png",
    anchor: "cab-services",
    href: "/services#cab-services",
    ctaText: "Book a Cab",
    ctaHref: "/contact?service=cab-services",
    badge: "Local & Outstation Cabs",
    features: [
      "Local point-to-point rides",
      "One-way cab services",
      "Round-trip journeys",
      "Airport pickup and drop",
      "Outstation cab bookings",
      "Flexible travel arrangements",
    ],
    keyHighlights: [
      {
        title: "Guaranteed Airport Punctuality",
        description: "Live flight tracking ensures our driver awaits you at the terminal arrivals gate without delay.",
      },
      {
        title: "Fair One-Way Outstation Fares",
        description: "Pay exclusively for one-way drops on popular highway corridors with zero dead-heading charges.",
      },
      {
        title: "Transparent All-Inclusive Pricing",
        description: "Clear upfront quotes with no surge pricing, hidden toll markups, or sudden driver cancellations.",
      },
      {
        title: "Clean, Sanitized AC Cabs",
        description: "Air-conditioned, modern sedans and spacious SUVs fitted with phone chargers and luggage space.",
      },
    ],
  },
  {
    id: "tours-travels",
    title: "Tours & Travels",
    supportingHeading: "Tours, Travels & Holiday Packages",
    tagline: "Holiday & pilgrimage travel packages",
    shortDescription:
      "Customized family tours, sacred jyotirlinga pilgrimages, and scenic weekend getaways with experienced drivers.",
    fullDescription:
      "Travel is about creating cherished memories with the people who matter most. Our Tours & Travels division crafts bespoke, stress-free travel packages covering spiritual shrines, scenic hill stations, vibrant coastal metropolises, and historic forts. Enjoy the comfort of traveling in modern vehicles with courteous, experienced highway drivers who know every scenic vantage point, clean highway restaurant, and cultural highlight.",
    image: "/assets/offerings/holiday-and-pilgrimage-packages.png",
    anchor: "tours-travels",
    href: "/services#tours-travels",
    ctaText: "Plan Your Trip",
    ctaHref: "/contact?service=tours-travels",
    badge: "Holiday & Pilgrimage Packages",
    features: [
      "Family tours",
      "Pilgrimage trips",
      "Sightseeing",
      "Weekend getaways",
      "Outstation journeys",
      "Customized travel",
    ],
    keyHighlights: [
      {
        title: "Thoughtfully Planned Itineraries",
        description: "Well-paced journeys designed for families and senior citizens with ample rest breaks and scenic stops.",
      },
      {
        title: "Experienced Drivers",
        description: "Polite, regional-expert drivers accustomed to winding hill routes, ghat passes, and temple timings.",
      },
      {
        title: "Fleet for Every Group Size",
        description: "From 5-seater sedans and 7-seater Innova Crystas to 17-seater Tempo Travellers and 40-seater luxury coaches.",
      },
      {
        title: "Tailored to Your Schedule",
        description: "Customize your pickup location, departure timing, stopovers, and sightseeing order without rigid constraints.",
      },
    ],
  },
];

// The 3 dedicated services shown on the /services page (excluding Explore Cars which has its own /cars page)
export const DEDICATED_SERVICES = SERVICES_DATA.filter((s) => s.id !== "explore-cars");

export const TOUR_PACKAGES: TourPackage[] = [
  {
    id: "ashtavinayak-darshan",
    title: "Ashtavinayak Darshan",
    category: "Pilgrimage Trips",
    destination: "8 Sacred Ganesha Temples",
    image: "/assets/services/tours-travels/pilgrimage/ashtavinayak-darshan.png",
    tag: "Sacred Pilgrimage",
    duration: "2–3 Days Circuit",
    description:
      "A complete spiritual pilgrimage to all eight self-originated shrines of Lord Ganesha across Maharashtra: Mayureshwar, Siddhivinayak, Ballaleshwar, Varadavinayak, Chintamani, Girijatmaj, Vighnahar, and Mahaganapati.",
    highlights: [
      "Complete 8-Temple Holy Circuit",
      "Elderly-Friendly Pacing & Rest Breaks",
      "Comfortable AC Fleet",
      "Doorstep Pickup & Safe Return",
    ],
  },
  {
    id: "jyotirlinga-darshan",
    title: "5 Jyotirlinga Darshan",
    category: "Pilgrimage Trips",
    destination: "Bhimashankar, Trimbakeshwar & Shrines",
    image: "/assets/services/tours-travels/pilgrimage/jyotirlinga-darshan.png",
    tag: "Divine Shiva Circuit",
    duration: "3–4 Days Tour",
    description:
      "A sacred spiritual journey covering Maharashtra's five revered Jyotirlingas: Bhimashankar, Trimbakeshwar, Grishneshwar, Aundha Nagnath, and Parli Vaijnath, with comfortable stopovers.",
    highlights: [
      "Revered Shiva Shrines & Ghat Scenery",
      "Dedicated Highway Driver",
      "Customizable Night Halt Options",
      "Convenient Early-Morning Darshan",
    ],
  },
  {
    id: "lonavala-khandala",
    title: "Lonavala & Khandala",
    category: "Weekend Getaways",
    destination: "Western Ghats Hill Retreat",
    image: "/assets/services/tours-travels/weekend-getaways/lonavala.png",
    tag: "Refreshing Escape",
    duration: "1–2 Days Trip",
    description:
      "Escape city life with a refreshing drive into lush Sahyadri hills. Visit Tiger's Leap, Bhushi Dam, Karla & Bhaja ancient caves, serene Lonavala Lake, and scenic vantage viewpoints.",
    highlights: [
      "Misty Viewpoints & Waterfalls",
      "Karla Caves & Historical Sites",
      "Famous Chikki & Fudge Shopping",
      "Quick & Relaxed Expressway Drive",
    ],
  },
  {
    id: "mahabaleshwar-panchgani",
    title: "Mahabaleshwar Points",
    category: "Sightseeing Tours",
    destination: "Mahabaleshwar & Panchgani",
    image: "/assets/services/tours-travels/sightseeing/mahabaleshwar-points.png",
    tag: "Queen of Hill Stations",
    duration: "2–3 Days Holiday",
    description:
      "Breathtaking views from Arthur's Seat, Elephant's Head Point, Kate's Point, Wilson Point sunrise, Venna Lake boating, and sweet strolls through lush strawberry farms.",
    highlights: [
      "Arthur's Seat & Venna Lake Boating",
      "Fresh Strawberry Farms & Mapro Garden",
      "Pleasant Mountain Climate Year-Round",
      "Spacious Family SUVs & Tempo Travellers",
    ],
  },
  {
    id: "mumbai-tour",
    title: "Mumbai Tour",
    category: "Outstation Travel",
    destination: "Iconic Landmarks & Coastal Drive",
    image: "/assets/services/tours-travels/outstation-travel/mumbai-tour.png",
    tag: "City of Dreams",
    duration: "1–2 Days City & Outstation",
    description:
      "Seamless round-trip or outstation exploration of Mumbai's historic splendor and coastal charm. See the Gateway of India, Marine Drive's Queen's Necklace, and Bandra-Worli Sea Link.",
    highlights: [
      "Iconic Heritage & Coastal Architecture",
      "Bandra-Worli Sea Link Drive",
      "Expressway Journey with Zero Stress",
      "Custom Shopping & Dining Stops",
    ],
  },
  {
    id: "pune-tour",
    title: "Pune Tour",
    category: "Sightseeing Tours",
    destination: "Historical & Cultural Heritage",
    image: "/assets/services/tours-travels/sightseeing/pune-tour.png",
    tag: "Cultural Capital",
    duration: "Full-Day / 2 Days Tour",
    description:
      "Discover the cultural and historical heart of Maharashtra. Tour the grand Shaniwar Wada, Sinhagad Fort, Aga Khan Palace, Dagdusheth Halwai Ganpati Temple, and peaceful hillside gardens.",
    highlights: [
      "Historic Maratha Forts & Palaces",
      "Dagdusheth Temple Blessings",
      "Local Cuisine & Vibrant Street Bazaars",
      "AC Vehicle with Knowledgeable Driver",
    ],
  },
];

export const STORAGE_KEY_TOUR_PACKAGES = "autofleet_tour_packages";

export function getStoredTourPackages(): TourPackage[] {
  if (typeof window === "undefined") return TOUR_PACKAGES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TOUR_PACKAGES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_TOUR_PACKAGES, JSON.stringify(TOUR_PACKAGES));
      return TOUR_PACKAGES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      let modified = false;
      const sanitized = parsed.map((p: TourPackage) => {
        if (p.image && p.image.includes("unsplash.com")) {
          modified = true;
          const defaultMatch = TOUR_PACKAGES.find((d) => d.id === p.id);
          return {
            ...p,
            image: defaultMatch ? defaultMatch.image : "/assets/services/tours-travels/pilgrimage/ashtavinayak-darshan.png",
          };
        }
        return p;
      });
      if (modified) {
        localStorage.setItem(STORAGE_KEY_TOUR_PACKAGES, JSON.stringify(sanitized));
      }
      return sanitized;
    }
    return TOUR_PACKAGES;
  } catch (e) {
    console.error("Failed to load tour packages from localStorage", e);
    return TOUR_PACKAGES;
  }
}

export function saveStoredTourPackages(packages: TourPackage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_TOUR_PACKAGES, JSON.stringify(packages));
    window.dispatchEvent(new Event("tour_packages_updated"));
  } catch (e) {
    console.error("Failed to save tour packages to localStorage", e);
  }
}

export function resetStoredTourPackages(): TourPackage[] {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_TOUR_PACKAGES, JSON.stringify(TOUR_PACKAGES));
      window.dispatchEvent(new Event("tour_packages_updated"));
    } catch (e) {
      console.error("Failed to reset tour packages in localStorage", e);
    }
  }
  return TOUR_PACKAGES;
}


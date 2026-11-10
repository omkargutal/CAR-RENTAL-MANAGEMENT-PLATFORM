import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { testimonialsApi, Testimonial } from "@/core/api";

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  {
    id: "fb-1",
    name: "Sarah Mitchell",
    designation: "Corporate Mobility Lead",
    review: "Swaraj Tours & Travel handles our executive team's airport transfers and daily employee shift shuttles with flawless punctuality and spotless vehicles.",
    rating: 5,
    is_active: true,
    sort_order: 1,
  },
  {
    id: "fb-2",
    name: "Rajesh Deshmukh",
    designation: "Family Outstation Traveler",
    review: "Booked an Innova Crysta for our family's Ashtavinayak pilgrimage tour. The driver was exceptionally polite, knowledgeable of routes, and very patient with senior citizens.",
    rating: 5,
    is_active: true,
    sort_order: 2,
  },
  {
    id: "fb-3",
    name: "Priya Nair",
    designation: "Frequent Airport Commuter",
    review: "Guaranteed airport pickup at 4:30 AM without a second of delay! The cab was sanitized, driver assisted with heavy baggage, and the pricing was completely transparent.",
    rating: 5,
    is_active: true,
    sort_order: 3,
  },
];

export function TestimonialCarousel() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(FALLBACK_TESTIMONIALS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    testimonialsApi.getActive()
      .then((data) => {
        if (data && data.length > 0) {
          setTestimonials(data);
        }
      })
      .catch((err) => {
        console.warn("Could not load dynamic testimonials, using default canonical list:", err);
      });
  }, []);

  const total = testimonials.length;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Auto-play timer (6 seconds), pauses when user hovers or clicks pause
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (isPlaying && !isHovered && total > 1) {
      timerRef.current = setInterval(() => {
        nextSlide();
      }, 6000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isHovered, total, currentIndex]);

  if (!testimonials || testimonials.length === 0) {
    return null;
  }

  const current = testimonials[currentIndex] || testimonials[0];

  return (
    <section className="relative py-20 lg:py-28 bg-slate-950 overflow-hidden text-white">
      {/* Background Ambient Glow Accents */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <Badge className="mb-3.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3.5 py-1 text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
            Passenger Stories
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            What Our Travelers Say
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Genuine experiences from corporate clients, families, and everyday commuters across Maharashtra.
          </p>
        </div>

        {/* Carousel Container with Side Navigation */}
        <div
          className="relative px-2 sm:px-8"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Main Card (Photo-free, elegant centered design) */}
          <div className="relative mx-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-12 lg:p-16 text-center transition-all duration-500">



            {/* Review Quote Text */}
            <blockquote className="text-lg sm:text-xl lg:text-2xl font-medium text-slate-800 dark:text-slate-100 leading-relaxed italic max-w-3xl mx-auto mb-10">
              "{current.review}"
            </blockquote>

            {/* Customer Author Info */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 inline-block">
              <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {current.name}
              </h4>
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">
                {current.designation}
              </p>
            </div>
          </div>

          {/* Previous Arrow Button */}
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous story"
            className="absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-xl flex items-center justify-center hover:bg-blue-600 hover:border-blue-500 hover:scale-105 active:scale-95 transition-all z-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Next Arrow Button */}
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next story"
            className="absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-xl flex items-center justify-center hover:bg-blue-600 hover:border-blue-500 hover:scale-105 active:scale-95 transition-all z-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Carousel Bottom Controls: Pagination Dots & Play/Pause */}
        <div className="mt-8 flex items-center justify-center gap-4">
          {/* Pagination Dots */}
          <div className="flex items-center gap-2">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => goToSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentIndex
                    ? "w-8 h-2.5 bg-blue-500 shadow-md shadow-blue-500/50"
                    : "w-2.5 h-2.5 bg-slate-700 hover:bg-slate-500"
                }`}
              />
            ))}
          </div>

          {/* Play/Pause Auto-slide Toggle */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pause auto-slide" : "Start auto-slide"}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors focus:outline-none"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          </button>
        </div>
      </div>
    </section>
  );
}

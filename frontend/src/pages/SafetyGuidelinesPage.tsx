import { Link } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  PhoneCall,
  UserCheck,
  HeartHandshake,
  CheckCircle2,
  Clock,
  Car,
  Plane,
  Baby,
  Search,
  ExternalLink,
} from "lucide-react";
import { PolicyPageLayout, TocItem } from "@/components/PolicyPageLayout";
import { BUSINESS_POLICY_CONFIG } from "@/data/policyConfig";

const TOC_ITEMS: TocItem[] = [
  { id: "before-journey", label: "A. Before Your Journey" },
  { id: "during-journey", label: "B. During Your Journey" },
  { id: "child-family-safety", label: "C. Child and Family Safety" },
  { id: "airport-outstation-safety", label: "D. Airport & Outstation Safety" },
  { id: "emergency-situations", label: "E. Emergency Situations (Dial 112)", badge: "Priority" },
  { id: "lost-and-found", label: "F. Lost and Found Protocol" },
  { id: "reporting-concerns", label: "G. Reporting a Safety Concern" },
  { id: "our-commitment", label: "H. Our Commitment to You" },
];

export function SafetyGuidelinesPage() {
  return (
    <PolicyPageLayout
      title="Your Safety Is Our Priority"
      subtitle="Every journey matters. We are committed to providing a comfortable, responsible and dependable travel experience through appropriate vehicle, driver and journey safety practices."
      badgeText="Passenger Protection & Safety Protocol"
      badgeIcon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
      seoTitle="Safety Guidelines & Passenger Protocols"
      seoDescription="Comprehensive passenger safety guidelines, verification checklists, child safety policies, and emergency protocols for Swaraj Tours & Travel cab, airport and outstation journeys."
      tocItems={TOC_ITEMS}
      currentPath="/safety"
    >
      {/* Intro Policy Box */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 mt-1">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Cab & Passenger Travel Safety Framework
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Swaraj Tours & Travel operates strictly as a <strong>cab and travel service provider</strong>.
              We do not provide self-drive car rentals. All journeys are executed by professional drivers assigned
              to clean, commercially registered, air-conditioned passenger vehicles. The guidelines below outline our
              mutual safety standards to safeguard you, your loved ones, and our drivers across every kilometer.
            </p>
          </div>
        </div>
      </div>

      {/* Section A: Before Your Journey */}
      <section
        id="before-journey"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section A
          </span>
          <h2 className="text-xl font-bold text-slate-900">Before Your Journey</h2>
        </div>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Thorough preparation ensures a smooth, punctual start. Customers are advised to review the following
          verification steps before boarding any assigned vehicle:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Verify Registration & Driver</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Always match the vehicle license plate number, vehicle model, and driver identity sent via booking SMS/WhatsApp before opening the door or boarding.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Confirm Pickup & Destination</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ensure your pickup point and exact destination are accurate in your booking confirmation. Clearly communicate prominent landmarks if GPS accuracy is constrained.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Share Accurate Passenger Details</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Provide reachable mobile phone numbers for all primary travelers. Keep your device powered and reachable so the driver can coordinate doorstep arrival.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Special & Accessibility Needs</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Inform our dispatch team in advance regarding elderly passengers, wheelchair assistance, oversized luggage, or medical requirements to ensure suitable vehicle allocation.
            </p>
          </div>
        </div>

        <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Capacity Adherence:</strong> Every vehicle operates within strictly mandated manufacturer and legal
            passenger seating limits (e.g., 4 passengers in sedans, 6–7 in SUVs, 12–17 in tempo travellers). Under
            applicable Motor Vehicles regulations, overloading is strictly prohibited.
          </div>
        </div>
      </section>

      {/* Section B: During Your Journey */}
      <section
        id="during-journey"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section B
          </span>
          <h2 className="text-xl font-bold text-slate-900">During Your Journey</h2>
        </div>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Your active cooperation on the road protects everyone inside the vehicle and other road users.
          Please observe the following practices throughout your trip:
        </p>

        <ul className="space-y-3 text-sm text-slate-700">
          <li className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
            <span className="h-2 w-2 rounded-full bg-blue-600 mt-2 shrink-0" />
            <div>
              <strong>Seat Belt Usage:</strong> All passengers—both front and rear—are required by law to wear seat belts
              at all times while the vehicle is in motion.
            </div>
          </li>
          <li className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
            <span className="h-2 w-2 rounded-full bg-blue-600 mt-2 shrink-0" />
            <div>
              <strong>Driver Focus & Road Concentration:</strong> Avoid distracting the driver with loud multimedia,
              sudden movements, or physically obstructing rear-view mirrors.
            </div>
          </li>
          <li className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
            <span className="h-2 w-2 rounded-full bg-blue-600 mt-2 shrink-0" />
            <div>
              <strong>Zero Tolerance for Unsafe Driving Demands:</strong> Never request the driver to exceed legal speed
              limits, violate traffic signals, execute reckless overtakes, or drive through flooded/blocked routes.
            </div>
          </li>
          <li className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
            <span className="h-2 w-2 rounded-full bg-blue-600 mt-2 shrink-0" />
            <div>
              <strong>Belongings Security:</strong> Keep valuables, wallets, mobile phones, laptops, and travel documents
              securely in your personal custody during halts and rest stops.
            </div>
          </li>
          <li className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
            <span className="h-2 w-2 rounded-full bg-blue-600 mt-2 shrink-0" />
            <div>
              <strong>Route Modifications on Highways:</strong> For long-distance and outstation journeys, communicate any
              planned route detours or additional stopovers to our central support team in advance to ensure continuous
              journey tracking and fair pricing.
            </div>
          </li>
        </ul>
      </section>

      {/* Section C: Child and Family Safety */}
      <section
        id="child-family-safety"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section C
          </span>
          <h2 className="text-xl font-bold text-slate-900">Child and Family Safety</h2>
        </div>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Traveling with family and young children requires heightened care. We uphold strict protocols to protect
          young passengers:
        </p>

        <div className="space-y-4 text-sm text-slate-700">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start gap-3.5">
            <Baby className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-slate-900 mb-1">Mandatory Adult Supervision</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Minors under 18 years of age cannot travel unaccompanied without written parental/guardian consent and
                direct coordination with our dispatch management. Children must be accompanied by a responsible adult.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start gap-3.5">
            <UserCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-slate-900 mb-1">Child Safety Seats Policy</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Customers requiring infant or toddler safety seats must request this facility at the time of booking.
                Child restraint seats are provided strictly subject to availability and advance written confirmation.
                Parents/guardians are welcome to bring their own ISOFIX or belt-compatible child car seats.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start gap-3.5">
            <HeartHandshake className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-slate-900 mb-1">Family Seating & Comfort Stops</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                On long-distance pilgrimage trips (such as Ashtavinayak or Jyotirlinga circuits) and hill vacations, our
                drivers schedule regular rest halts at hygienic, family-friendly highway facilities with clean restrooms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section D: Airport and Outstation Travel Safety */}
      <section
        id="airport-outstation-safety"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section D
          </span>
          <h2 className="text-xl font-bold text-slate-900">Airport & Outstation Travel Safety</h2>
        </div>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Highway journeys, overnight travel, and airport connections involve specialized logistics. Ensure the
          following procedures are observed:
        </p>

        <div className="space-y-4 text-sm">
          <div className="border border-slate-200 rounded-xl p-4.5 bg-slate-50">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
              <Plane className="h-4 w-4 text-blue-600" />
              <span>Airport Pickup & Drop-Off Protocol</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-600">
              <li>Share exact flight numbers and airline details so our dispatch team can monitor flight arrival delays.</li>
              <li>Coordinate with your driver to meet at designated terminal arrival pickup zones or multi-level parking lanes.</li>
              <li>Maintain buffer time of at least 3 hours prior to domestic flight departures and 4 hours prior to international flights.</li>
            </ul>
          </div>

          <div className="border border-slate-200 rounded-xl p-4.5 bg-slate-50">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span>Outstation Highway Schedule & Driver Rest</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-600">
              <li>Confirm the agreed route, scheduled tea/meal stops, and night halt locations prior to departure.</li>
              <li>Drivers require adequate continuous rest between long highway driving shifts to prevent fatigue and ensure alert driving.</li>
              <li>Significant mid-trip itinerary additions must be routed through dispatch for safety clearance and updated fare estimation.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section E: Emergency Situations */}
      <section
        id="emergency-situations"
        className="bg-white rounded-2xl border-2 border-red-200 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-white bg-red-600 px-2.5 py-1 rounded-md">
              Section E
            </span>
            <h2 className="text-xl font-bold text-slate-900">Emergency Situations & Immediate Help</h2>
          </div>
          <span className="text-xs font-black uppercase text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
            Dial 112 in India
          </span>
        </div>

        {/* 112 Banner */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-5 mb-6 text-red-950">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-extrabold text-red-900 mb-1">
                National Emergency Response Support System (ERSS): Dial 112
              </h3>
              <p className="text-xs leading-relaxed text-red-800">
                In any acute crisis involving personal safety, physical threat, severe medical distress, or a major
                traffic accident, <strong>dial 112 immediately</strong>. This is the single emergency contact number in
                India for Police, Fire, and Ambulance services. Follow instructions from emergency first-responders.
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          For operational emergencies, notify our central support desk immediately at{" "}
          <strong className="text-slate-900">{BUSINESS_POLICY_CONFIG.primaryPhone}</strong>:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-1">1. Mechanical Vehicle Breakdown</strong>
            <p className="text-slate-600">
              The driver will steer the vehicle safely onto the shoulder/service lane and deploy hazard lights. Dispatch coordinates roadside assistance or replacement vehicle routing based on local proximity.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-1">2. Road Traffic Accident</strong>
            <p className="text-slate-600">
              Prioritize passenger medical assessment. Dial 112 for ambulance services if injuries exist. Move passengers to a safe barrier area away from ongoing highway traffic.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-1">3. Passenger Medical Emergency</strong>
            <p className="text-slate-600">
              Alert the driver immediately. The driver will divert to the nearest verified hospital, clinic, or highway trauma center while contacting our dispatch team.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-1">4. Driver Misconduct or Unsafe Driving</strong>
            <p className="text-slate-600">
              If a driver behaves unprofessionally, displays signs of drowsiness, or drives erratically, call our support line (+91 8421081570) immediately. In severe situations, ask the driver to stop at a secure, well-lit public spot.
            </p>
          </div>
        </div>
      </section>

      {/* Section F: Lost and Found */}
      <section
        id="lost-and-found"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section F
          </span>
          <h2 className="text-xl font-bold text-slate-900">Lost and Found Protocol</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          While travelers are solely responsible for their personal effects, we maintain a systematic protocol to assist
          in tracing and returning forgotten items:
        </p>

        <div className="space-y-3 text-xs text-slate-700">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
            <Search className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block mb-0.5">Pre-Departure Cabin Check</strong>
              <span>Always inspect seat pockets, under-seat areas, doors, and the luggage trunk before dismissing the vehicle.</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
            <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block mb-0.5">Prompt Reporting Timeline</strong>
              <span>Report forgotten belongings within 2 hours of trip completion via support phone (+91 8421081570) or email ({BUSINESS_POLICY_CONFIG.supportEmail}) quoting your Booking ID.</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
            <HeartHandshake className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block mb-0.5">Recovery & Transparent Return Arrangements</strong>
              <span>
                Our team will contact the assigned driver. If recovered, belongings may be collected from our local
                operational hub, or handed over via courier/driver dispatch. Any actual delivery or courier charges will be
                communicated transparently to the customer without markups.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section G: Reporting a Safety Concern */}
      <section
        id="reporting-concerns"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section G
          </span>
          <h2 className="text-xl font-bold text-slate-900">Reporting a Safety Concern</h2>
        </div>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Every safety report is treated with utmost urgency and reviewed by our operations manager. Please reach out
          through any of our verified support touchpoints:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Phone Helpline</span>
              <p className="font-bold text-slate-900 text-sm">{BUSINESS_POLICY_CONFIG.primaryPhone}</p>
              <p className="text-slate-500 mt-1">Direct operations & roadside assistance line.</p>
            </div>
            <a
              href={`tel:${BUSINESS_POLICY_CONFIG.primaryPhone.replace(/\s+/g, "")}`}
              className="mt-4 inline-flex items-center gap-1.5 text-blue-600 font-bold hover:underline"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span>Call Now</span>
            </a>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">WhatsApp Support</span>
              <p className="font-bold text-slate-900 text-sm">{BUSINESS_POLICY_CONFIG.whatsappPhone}</p>
              <p className="text-slate-500 mt-1">Send photos, live location, or messages.</p>
            </div>
            <a
              href={`https://wa.me/${BUSINESS_POLICY_CONFIG.whatsappPhone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-emerald-600 font-bold hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Message on WhatsApp</span>
            </a>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Support Email</span>
              <p className="font-bold text-slate-900 text-sm">{BUSINESS_POLICY_CONFIG.supportEmail}</p>
              <p className="text-slate-500 mt-1">Formal incident reports & documentation.</p>
            </div>
            <a
              href={`mailto:${BUSINESS_POLICY_CONFIG.supportEmail}`}
              className="mt-4 inline-flex items-center gap-1.5 text-blue-600 font-bold hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Send Email</span>
            </a>
          </div>
        </div>
      </section>

      {/* Section H: Our Commitment */}
      <section
        id="our-commitment"
        className="bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-xs font-bold text-blue-300 bg-blue-800/80 px-2.5 py-1 rounded-md">
            Section H
          </span>
          <h2 className="text-xl font-bold text-white">Our Commitment to You</h2>
        </div>
        <blockquote className="text-base sm:text-lg italic font-medium text-blue-100 leading-relaxed mb-4 border-l-4 border-blue-400 pl-4">
          &ldquo;Your comfort, safety and confidence matter to us. We continuously strive to make every journey a dependable and pleasant experience.&rdquo;
        </blockquote>
        <p className="text-xs text-slate-300 leading-relaxed">
          Through routine vehicle maintenance audits, verified driver onboarding, and 24/7 responsive customer
          support, Swaraj Tours & Travel remains dedicated to delivering safe and respectful travel for individuals, families,
          and corporate teams.
        </p>

        <div className="mt-6 pt-4 border-t border-blue-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-blue-200">
          <span>Read along with our binding terms:</span>
          <Link
            to="/terms-and-conditions"
            className="inline-flex items-center gap-1 text-white font-bold underline hover:text-blue-300"
          >
            <span>View Terms & Conditions</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </PolicyPageLayout>
  );
}

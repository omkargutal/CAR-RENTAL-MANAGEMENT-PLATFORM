import { Link } from "react-router-dom";
import {
  FileText,
  Scale,
  Car,
  CheckCircle2,
} from "lucide-react";
import { PolicyPageLayout, TocItem } from "@/components/PolicyPageLayout";
import { BUSINESS_POLICY_CONFIG } from "@/data/policyConfig";

const TOC_ITEMS: TocItem[] = [
  { id: "intro-acceptance", label: "A. Introduction & Acceptance" },
  { id: "services-offered", label: "B. Services Offered & Scope" },
  { id: "booking-confirmation", label: "C. Booking & Confirmation Terms" },
  { id: "customer-responsibilities", label: "D. Customer Responsibilities" },
  { id: "pricing-charges", label: "E. Fares, Tolls & Extra Charges" },
  { id: "payment-terms", label: "F. Payment Methods & Balance Terms" },
  { id: "pickup-journey-conditions", label: "G. Pickup, Drop & Route Conditions" },
  { id: "driver-vehicle-assignment", label: "H. Fleet & Driver Allocation" },
  { id: "outstation-conditions", label: "I. Outstation & Round-Trip Terms" },
  { id: "tours-packages-terms", label: "J. Tours, Pilgrimage & Holidays" },
  { id: "safety-prohibited-activities", label: "K. Prohibited Conduct & Safety" },
  { id: "luggage-belongings", label: "L. Luggage & Baggage Allowance" },
  { id: "cancellation-refunds", label: "M. Cancellations & Refunds" },
  { id: "limitation-liability", label: "N. Limitation of Liability" },
  { id: "force-majeure", label: "O. Force Majeure & Severe Events" },
  { id: "privacy-data", label: "P. Customer Data & Privacy" },
  { id: "complaints-support", label: "Q. Customer Support & Complaints" },
  { id: "governing-law", label: "R. Governing Law & Jurisdiction" },
];

export function TermsAndConditionsPage() {
  return (
    <PolicyPageLayout
      title="Terms & Conditions"
      subtitle="These terms explain the conditions under which our cab, transportation and travel services are booked and provided. By making a booking or using our services, customers agree to the applicable terms."
      badgeText="Binding Service Terms & Contract"
      badgeIcon={<Scale className="h-4 w-4 text-purple-400" />}
      seoTitle="Terms & Conditions | Service Agreement"
      seoDescription="Review the complete Terms and Conditions governing Swaraj Tours & Travel's cab bookings, airport transfers, corporate travel, outstation trips, and tour packages."
      tocItems={TOC_ITEMS}
      currentPath="/terms-and-conditions"
    >
      {/* Intro Notice */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 text-purple-700 mt-1">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Swaraj Tours & Travel Master Service Agreement
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Please read these terms carefully before scheduling any ride or booking a tour package.
              Swaraj Tours & Travel operates as a professional <strong>cab and travel service provider</strong> in India.
              We do not provide self-drive rental vehicles. By placing a booking request, making an
              advance deposit, or boarding an assigned vehicle, you agree to be bound by the terms detailed herein.
            </p>
          </div>
        </div>
      </div>

      {/* Section A: Introduction and Acceptance */}
      <section
        id="intro-acceptance"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section A
          </span>
          <h2 className="text-xl font-bold text-slate-900">Introduction & Acceptance of Terms</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          These Terms and Conditions (&ldquo;Agreement&rdquo;) constitute a legally valid contract between you
          (&ldquo;Customer&rdquo;, &ldquo;Passenger&rdquo;, or &ldquo;You&rdquo;) and{" "}
          <strong>{BUSINESS_POLICY_CONFIG.brandName}</strong> (&ldquo;We&rdquo;, &ldquo;Us&rdquo;, or &ldquo;Our&rdquo;).
        </p>

        <ul className="space-y-2.5 text-xs text-slate-700">
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Binding Contract:</strong> Transmitting a booking inquiry or confirming a reservation on our website
              represents unequivocal acceptance of these terms and related policies.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Periodic Policy Updates:</strong> Swaraj Tours & Travel reserves the right to amend these terms in accordance
              with changing regulatory and operational standards. Updated terms become effective upon publication on this page.
            </span>
          </li>
        </ul>
      </section>

      {/* Section B: Services Offered */}
      <section
        id="services-offered"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section B
          </span>
          <h2 className="text-xl font-bold text-slate-900">Services Offered & Operational Scope</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          Swaraj Tours & Travel provides point-to-point and long-distance passenger travel services across the
          following core categories:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-5">
          {BUSINESS_POLICY_CONFIG.coreServices.map((service, idx) => (
            <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-2.5">
              <Car className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="font-semibold text-slate-900">{service}</span>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
          <strong>Driver-Assisted Rides Only:</strong> All services are provided exclusively with an authorized,
          licensed commercial driver. Under no circumstances do we lease, hand over keys, or rent self-drive
          vehicles for self-drive use.
        </div>
      </section>

      {/* Section C: Booking & Confirmation */}
      <section
        id="booking-confirmation"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section C
          </span>
          <h2 className="text-xl font-bold text-slate-900">Booking & Confirmation Terms</h2>
        </div>
        <ul className="space-y-3 text-xs text-slate-700">
          <li className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-0.5">Booking Requests vs. Confirmed Reservations</strong>
            <span>
              Submitting travel dates or pickup locations online generates a booking request. A reservation is deemed
              officially confirmed only upon successful payment of the advance deposit (where required) and issuance of
              a unique Booking ID.
            </span>
          </li>
          <li className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-0.5">Accuracy of Traveler Information</strong>
            <span>
              The customer must provide accurate names, reachable phone numbers, pickup landmarks, and flight/train
              timings. Inaccurate details leading to missed pickups remain the customer's sole responsibility.
            </span>
          </li>
          <li className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-0.5">Pre-Trip Dispatch Verification</strong>
            <span>
              Swaraj Tours & Travel's operations team may contact passengers via phone or WhatsApp 2 to 4 hours prior to pickup
              to re-verify gate numbers, road access, and dispatch readiness.
            </span>
          </li>
        </ul>
      </section>

      {/* Section D: Customer Responsibilities */}
      <section
        id="customer-responsibilities"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section D
          </span>
          <h2 className="text-xl font-bold text-slate-900">Customer Responsibilities</h2>
        </div>
        <div className="space-y-2 text-xs text-slate-700">
          <p className="leading-relaxed mb-3">Customers and travelers accompanying them agree to:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Punctuality at Pickup</strong>
              <span>Be present at the confirmed pickup point at the scheduled time to avoid waiting charge accruals.</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Seatbelt Compliance</strong>
              <span>Fasten seatbelts throughout the journey as mandated under the Motor Vehicles Act.</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Respecting Seating Capacity</strong>
              <span>Strictly adhere to the licensed seating capacity of the booked vehicle tier. Overloading is not permitted.</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Care for Vehicle Interior</strong>
              <span>Maintain cabin hygiene. Customers are liable for actual cleaning or upholstery repair expenses caused by negligence.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section E: Fare, Pricing and Additional Charges */}
      <section
        id="pricing-charges"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section E
          </span>
          <h2 className="text-xl font-bold text-slate-900">Fare, Pricing & Additional Charges</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          Swaraj Tours & Travel is dedicated to fair, transparent, and surge-free quotes. Trip costs are computed transparently
          based on your selected service category:
        </p>

        <div className="space-y-3 text-xs text-slate-700 mb-5">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-1">Standard Fare Inclusions</strong>
            <p className="text-slate-600">
              Vehicle usage, driver allowance, fuel, and standard air-conditioning throughout the journey.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-1">Variable Route Charges</strong>
            <p className="text-slate-600">
              Highway FASTag toll plaza fees, airport commercial entry fees, state border entry taxes (for interstate
              outstation trips), and municipal parking fees are either included or billed transparently at actuals as
              specified in your booking quote.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-1">Night Driver Allowance</strong>
            <p className="text-slate-600">
              For journeys extending between 10:00 PM and 6:00 AM, a nominal night driver allowance applies to compensate
              for nocturnal driving shifts.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
          <strong>No Hidden Charges:</strong> Every applicable charge is itemized in your booking estimate prior to
          payment. Our drivers do not demand arbitrary tip amounts or off-meter surcharges.
        </div>
      </section>

      {/* Section F: Payment Terms */}
      <section
        id="payment-terms"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section F
          </span>
          <h2 className="text-xl font-bold text-slate-900">Payment Terms & Balance Settlement</h2>
        </div>
        <div className="space-y-3 text-xs text-slate-700">
          <p className="leading-relaxed">
            We support secure electronic payments via integrated gateway solutions (Razorpay), supporting UPI, Visa,
            Mastercard, RuPay, and Net-Banking.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Advance Deposit</strong>
              <span>Required for outstation trips, airport rides, and multi-day packages to guarantee vehicle blocking.</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Remaining Balance</strong>
              <span>Payable to the driver or via our online payment link upon journey commencement or final drop.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section G: Pickup, Drop and Journey Conditions */}
      <section
        id="pickup-journey-conditions"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section G
          </span>
          <h2 className="text-xl font-bold text-slate-900">Pickup, Drop & Journey Conditions</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          Journeys are conducted strictly between agreed pickup and drop coordinates. Any unplanned intermediate stops,
          significant route deviations, or delays caused by waiting beyond complimentary allowances will be billed in
          accordance with actual kilometer and hourly metrics.
        </p>
      </section>

      {/* Section H: Fleet & Driver Allocation */}
      <section
        id="driver-vehicle-assignment"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section H
          </span>
          <h2 className="text-xl font-bold text-slate-900">Fleet & Driver Allocation</h2>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          While bookings confirm a specific vehicle category (e.g., Premium Sedan, Innova Crysta SUV, Tempo Traveller),
          the exact vehicle registration and driver are assigned based on regional proximity and operational
          availability. In the rare event of mechanical maintenance, an equivalent or higher category vehicle will be
          deployed at no extra charge to the customer.
        </p>
      </section>

      {/* Section I: Outstation & Round-Trip Terms */}
      <section
        id="outstation-conditions"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section I
          </span>
          <h2 className="text-xl font-bold text-slate-900">Outstation & Round-Trip Conditions</h2>
        </div>
        <div className="space-y-3 text-xs text-slate-700">
          <p className="leading-relaxed">
            Outstation trips are subject to daily minimum running kilometer benchmarks (typically 250 km to 300 km per
            calendar day depending on regional routing). Cumulative distance exceeding the package quota is billed at the
            confirmed extra per-km rate.
          </p>
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-0.5">Driver Rest on Multi-Day Trips</strong>
            <span>
              For safety reasons, drivers must be allowed adequate continuous rest periods between daily driving
              schedules. Driving continuously without breaks is prohibited.
            </span>
          </div>
        </div>
      </section>

      {/* Section J: Tours, Pilgrimage & Holidays */}
      <section
        id="tours-packages-terms"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section J
          </span>
          <h2 className="text-xl font-bold text-slate-900">Tours, Pilgrimage & Holiday Packages</h2>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed mb-4">
          Tour packages (such as Ashtavinayak Darshan, 5 Jyotirlinga, Mahabaleshwar, and Mumbai Heritage) cover
          cab transportation and agreed point-to-point sightseeing. Only items explicitly mentioned in the
          confirmed itinerary are included. Unless specified, temple VIP darshan tickets, personal guide fees, hotel
          stays, and meals are not included.
        </p>
      </section>

      {/* Section K: Safety & Prohibited Activities */}
      <section
        id="safety-prohibited-activities"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section K
          </span>
          <h2 className="text-xl font-bold text-slate-900">Safety & Prohibited Conduct</h2>
        </div>
        <p className="text-sm text-slate-600 mb-3 leading-relaxed">
          The following activities are strictly prohibited inside our vehicles:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-900 font-medium">
            Smoking or vaping inside vehicles
          </div>
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-900 font-medium">
            Consumption or possession of illicit drugs/substances
          </div>
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-900 font-medium">
            Verbal or physical abuse towards drivers or staff
          </div>
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-900 font-medium">
            Carrying hazardous, flammable, or contraband materials
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Drivers are instructed to report violations to local law enforcement. Please review our full{" "}
          <Link to="/safety" className="text-blue-600 font-bold underline">
            Safety Guidelines
          </Link>{" "}
          for detailed passenger protocols.
        </p>
      </section>

      {/* Section L: Luggage and Personal Belongings */}
      <section
        id="luggage-belongings"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section L
          </span>
          <h2 className="text-xl font-bold text-slate-900">Luggage & Baggage Allowance</h2>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          Luggage must safely fit within the vehicle's dedicated boot/trunk or overhead carrier without obstructing rear
          visibility or compromising passenger seating. Swaraj Tours & Travel is not liable for personal valuables left
          unattended inside the vehicle. Forgotten items are handled under our Lost & Found Protocol.
        </p>
      </section>

      {/* Section M: Cancellations & Refunds */}
      <section
        id="cancellation-refunds"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section M
          </span>
          <h2 className="text-xl font-bold text-slate-900">Cancellations & Refunds</h2>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          All booking modifications, customer cancellations, no-show fees, and refund timelines are governed by our
          dedicated{" "}
          <Link to="/cancellation-policy" className="text-blue-600 font-bold underline">
            Cancellation & Refund Policy
          </Link>
          . Both documents operate cohesively and must be read in conjunction.
        </p>
      </section>

      {/* Section N: Limitation of Liability */}
      <section
        id="limitation-liability"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section N
          </span>
          <h2 className="text-xl font-bold text-slate-900">Limitation of Liability</h2>
        </div>
        <div className="space-y-3 text-xs text-slate-700">
          <p className="leading-relaxed">
            Swaraj Tours & Travel exercises reasonable diligence in planning pickup schedules and maintaining fleet roadworthiness.
            However, to the maximum extent permitted by applicable Indian law:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-600">
            <li>We are not liable for missed flights, train departures, or appointment losses resulting from unforeseen traffic gridlocks, highway accidents, weather conditions, or civic road closures.</li>
            <li>Our aggregate liability for any operational breach shall not exceed the total trip fare received from the customer for that specific booking.</li>
            <li>Nothing in these terms excludes liability for personal injury or death caused directly by proven gross negligence or statutory non-compliance.</li>
          </ul>
        </div>
      </section>

      {/* Section O: Force Majeure */}
      <section
        id="force-majeure"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section O
          </span>
          <h2 className="text-xl font-bold text-slate-900">Force Majeure & Exceptional Events</h2>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          Neither party shall be held liable for failure or delay in performance caused by circumstances beyond reasonable
          control, including but not limited to acts of God, extreme climatic events, regional bandhs, strikes, riots,
          armed conflicts, or government-imposed curfews and transport lockdowns.
        </p>
      </section>

      {/* Section P: Customer Data & Privacy */}
      <section
        id="privacy-data"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section P
          </span>
          <h2 className="text-xl font-bold text-slate-900">Customer Data & Privacy</h2>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          Customer names, telephone numbers, and journey coordinates are collected solely for booking administration,
          dispatch coordination, driver communication, and payment receipt delivery. Information is processed securely
          and shared with assigned drivers strictly for trip execution purposes in compliance with applicable Indian
          data protection regulations.
        </p>
      </section>

      {/* Section Q: Complaints & Customer Support */}
      <section
        id="complaints-support"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section Q
          </span>
          <h2 className="text-xl font-bold text-slate-900">Complaints & Customer Support</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          For complaints, fare disputes, driver feedback, or billing queries, reach our central customer service desk:
        </p>
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
          <p>
            <strong>Customer Care Phone:</strong> {BUSINESS_POLICY_CONFIG.primaryPhone}
          </p>
          <p>
            <strong>WhatsApp Helpline:</strong> {BUSINESS_POLICY_CONFIG.whatsappPhone}
          </p>
          <p>
            <strong>Official Support Email:</strong> {BUSINESS_POLICY_CONFIG.supportEmail}
          </p>
          <p className="text-slate-500 pt-1">
            Complaints are acknowledged within 4 hours and investigated within 24–48 business hours.
          </p>
        </div>
      </section>

      {/* Section R: Governing Law & Jurisdiction */}
      <section
        id="governing-law"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section R
          </span>
          <h2 className="text-xl font-bold text-slate-900">Governing Law & Legal Jurisdiction</h2>
        </div>
        <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
          <p>
            This Agreement and all passenger journeys shall be governed by and construed in accordance with the substantive
            laws of the <strong>Republic of India</strong>.
          </p>
          <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
            <strong>Jurisdiction Confirmation Notice:</strong> Subject to mandatory statutory consumer dispute forums,
            the competent courts located in{" "}
            <strong>{BUSINESS_POLICY_CONFIG.governingJurisdiction}</strong> shall have exclusive jurisdiction over all
            legal claims or proceedings arising hereunder.
          </div>
        </div>
      </section>
    </PolicyPageLayout>
  );
}

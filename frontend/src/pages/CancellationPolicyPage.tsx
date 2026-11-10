import { Link } from "react-router-dom";
import {
  RefreshCw,
  AlertCircle,
  Clock,
  CreditCard,
  FileText,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { PolicyPageLayout, TocItem } from "@/components/PolicyPageLayout";
import { BUSINESS_POLICY_CONFIG } from "@/data/policyConfig";

const TOC_ITEMS: TocItem[] = [
  { id: "customer-cancellation", label: "A. Customer Cancellation Process" },
  { id: "proposed-schedule", label: "B. Cancellation Charges (Proposed)", badge: "Proposed" },
  { id: "business-cancellation", label: "C. Cancellation by Swaraj Tours & Travel" },
  { id: "refund-process", label: "D. Refund Processing & Timelines" },
  { id: "trip-modifications", label: "E. Rescheduling & Trip Changes" },
  { id: "no-show-policy", label: "F. Customer No-Show Protocol" },
  { id: "waiting-charges", label: "G. Waiting Periods & Journey Delays" },
  { id: "outstation-tour-cancellation", label: "H. Outstation & Tour Packages" },
  { id: "payment-disputes", label: "I. Payment Gateway & Refund Disputes" },
];

export function CancellationPolicyPage() {
  return (
    <PolicyPageLayout
      title="Cancellation & Refund Policy"
      subtitle="We understand that travel plans can change. Our cancellation and refund policy is designed to provide clarity and transparency whenever a booking needs to be modified or cancelled."
      badgeText="Booking Modifications & Refund Terms"
      badgeIcon={<RefreshCw className="h-4 w-4 text-blue-400" />}
      seoTitle="Cancellation & Refund Policy | Transparent Terms"
      seoDescription="Review Swaraj Tours & Travel's cancellation terms, refund processes, rescheduling procedures, and payment dispute guidelines for local cabs, outstation trips, airport rides, and tour packages."
      tocItems={TOC_ITEMS}
      currentPath="/cancellation-policy"
    >
      {/* Policy Governance Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 mt-1">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800 uppercase tracking-wide mb-2">
              <span>Proposed Policy Guidelines</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Transparent Cancellation Principles
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Swaraj Tours & Travel offers a variety of cab journeys—ranging from quick local city pickups to multi-day
              outstation pilgrimages and group coach tours. Because vehicle scheduling and driver commitments differ by
              service category, cancellation rules depend on the timing of your notice and the confirmed service tier.
              The schedules below reflect our operational guidelines and proposed terms.
            </p>
          </div>
        </div>
      </div>

      {/* Section A: Customer Cancellation */}
      <section
        id="customer-cancellation"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section A
          </span>
          <h2 className="text-xl font-bold text-slate-900">Booking Cancellation by Customer</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          Customers may request cancellation of a confirmed booking through our official channels. To ensure immediate
          processing, please follow these steps:
        </p>

        <ul className="space-y-3 text-sm text-slate-700">
          <li className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
            <CheckCircle2 className="h-4 w-4 text-blue-600 mt-1 shrink-0" />
            <div>
              <strong>Official Channels:</strong> Submit cancellation requests via the online customer portal under{" "}
              <Link to="/bookings" className="text-blue-600 font-bold underline">
                My Bookings
              </Link>
              , or by notifying our support desk via telephone (+91 8421081570) or verified WhatsApp.
            </div>
          </li>
          <li className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
            <CheckCircle2 className="h-4 w-4 text-blue-600 mt-1 shrink-0" />
            <div>
              <strong>Mandatory Booking Reference:</strong> Always specify your unique{" "}
              <strong>Booking Reference ID</strong> (e.g., <em>BK-2026-XXXX</em>) and registered passenger phone number
              with your request.
            </div>
          </li>
          <li className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
            <CheckCircle2 className="h-4 w-4 text-blue-600 mt-1 shrink-0" />
            <div>
              <strong>Confirmation of Cancellation:</strong> A cancellation is deemed final only when an official SMS,
              WhatsApp, or email cancellation notice has been transmitted by our system.
            </div>
          </li>
          <li className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
            <CheckCircle2 className="h-4 w-4 text-blue-600 mt-1 shrink-0" />
            <div>
              <strong>Applicable Platform Deductions:</strong> Minor gateway or administrative handling charges may apply
              based on the cancellation timestamp and confirmed vehicle tier.
            </div>
          </li>
        </ul>
      </section>

      {/* Section B: Cancellation Charges Table */}
      <section
        id="proposed-schedule"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
              Section B
            </span>
            <h2 className="text-xl font-bold text-slate-900">Cancellation Charges (Proposed Structure)</h2>
          </div>
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            Subject to Final Confirmation
          </span>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 mb-6 text-xs text-amber-900">
          <p className="leading-relaxed">
            <strong>Important Notice:</strong> The following cancellation schedule represents our proposed operational
            framework. Exact deduction percentages, administrative fees, and free cancellation windows remain subject
            to final business confirmation and may vary for customized multi-day tours or corporate peak-season dates.
          </p>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-900 text-white uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5 font-bold">Cancellation Timing</th>
                <th className="px-4 py-3.5 font-bold">Proposed Treatment</th>
                <th className="px-4 py-3.5 font-bold hidden sm:table-cell">Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {BUSINESS_POLICY_CONFIG.cancellationSchedule.map((tier, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                  <td className="px-4 py-3.5 font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span>{tier.timing}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">
                    <div>{tier.treatment}</div>
                    {tier.notes && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{tier.notes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      {tier.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section C: Cancellation by Business */}
      <section
        id="business-cancellation"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section C
          </span>
          <h2 className="text-xl font-bold text-slate-900">Cancellation by Swaraj Tours & Travel</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          While we make every reasonable effort to fulfill confirmed bookings, unforeseen operational or safety events
          may occasionally necessitate a cancellation initiated by Swaraj Tours & Travel:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-6">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-1">Vehicle or Driver Unavailability</strong>
            <p className="text-slate-600">
              Unforeseen mechanical breakdown, sudden driver medical emergencies, or safety-related ground issues.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-1">Adverse Weather & Highway Closures</strong>
            <p className="text-slate-600">
              Torrential rain, landslides on ghat corridors, flooded highway underpasses, or official police road blocks.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-1">Government Restrictions</strong>
            <p className="text-slate-600">
              VIP security movement, sudden curfews, civic bandhs, or regional transportation authority mandates.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-1">Force Majeure Circumstances</strong>
            <p className="text-slate-600">
              Natural disasters, seismic events, or disruptions entirely outside reasonable business control.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
          <p>
            <strong>Customer Notification & Remedy:</strong> When a business-initiated cancellation occurs, our team
            will inform the customer promptly via phone call and SMS/WhatsApp. In all such cases, the customer will
            receive a <strong>100% full refund</strong> of all advance monies paid.
          </p>
          <p className="text-slate-500 italic">
            *Please note: While our team will endeavour to coordinate alternative travel where practicable, replacement
            vehicles or substitute services cannot be guaranteed under acute regional disruptions.
          </p>
        </div>
      </section>

      {/* Section D: Refund Process */}
      <section
        id="refund-process"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section D
          </span>
          <h2 className="text-xl font-bold text-slate-900">Refund Processing & Timelines</h2>
        </div>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Refund requests are verified against the trip status and the cancellation timestamp recorded in our booking
          system.
        </p>

        <div className="space-y-3 text-xs text-slate-700">
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <CreditCard className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block mb-0.5">Original Payment Method</strong>
              <span>
                All eligible refunds are routed directly back to the original source instrument (credit card, debit
                card, UPI ID, or net-banking account) through our payment gateway integration.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block mb-0.5">
                Processing Timeline:{" "}
                <span className="text-amber-700 font-semibold">
                  {BUSINESS_POLICY_CONFIG.proposedTerms.refundProcessingDays} (Proposed / Subject to Bank Clearing)
                </span>
              </strong>
              <span>
                Once approved, gateway clearing typically takes 5 to 7 working days. Actual crediting may depend on your
                issuing bank or card provider. A unique refund reference ARN will be provided upon dispatch.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <FileText className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block mb-0.5">Refund Query Contacts</strong>
              <span>
                For status tracking on an initiated refund, reach our finance desk at{" "}
                <strong>{BUSINESS_POLICY_CONFIG.supportEmail}</strong> or telephone{" "}
                <strong>{BUSINESS_POLICY_CONFIG.primaryPhone}</strong> quoting your Booking ID and payment receipt.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section E: Trip Modifications */}
      <section
        id="trip-modifications"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section E
          </span>
          <h2 className="text-xl font-bold text-slate-900">Rescheduling & Trip Modifications</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          Need to change your pickup time or travel date? We accommodate rescheduling requests wherever operational
          schedules permit:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="font-bold text-slate-900 block mb-0.5">Pickup Date & Time Adjustments</span>
            <span className="text-slate-600">
              Feasible if requested at least 12 hours prior to scheduled pickup for local trips and 24 hours for outstation.
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="font-bold text-slate-900 block mb-0.5">Vehicle Tier Upgrades / Changes</span>
            <span className="text-slate-600">
              Subject to fleet availability. Any applicable difference in base fare will be billed transparently.
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="font-bold text-slate-900 block mb-0.5">Destination & Route Changes</span>
            <span className="text-slate-600">
              Changes in distance or toll corridors will be recalculated based on actual revised kilometer benchmarks.
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="font-bold text-slate-900 block mb-0.5">Airport Flight Time Updates</span>
            <span className="text-slate-600">
              Provide updated flight arrival times as soon as airlines announce delays so your driver schedule can be shifted.
            </span>
          </div>
        </div>
      </section>

      {/* Section F: Customer No-Show */}
      <section
        id="no-show-policy"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section F
          </span>
          <h2 className="text-xl font-bold text-slate-900">Customer No-Show Protocol</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          A booking is categorized as a <strong>No-Show</strong> when all of the following conditions are met:
        </p>

        <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700 mb-5">
          <li>The assigned vehicle and driver arrive at the confirmed pickup location at or before the scheduled time.</li>
          <li>The customer is absent from the pickup address.</li>
          <li>
            Our driver and dispatch team have made at least two telephone call attempts and sent a text notification.
          </li>
          <li>
            The agreed waiting period (proposed 15 minutes for local cabs or 45 minutes for airport arrivals) has expired.
          </li>
        </ul>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
          <p>
            <strong>No-Show Charges:</strong> In verified no-show scenarios, the driver has committed fuel, time, and
            opportunity cost. The booking advance or an applicable no-show fee (proposed up to 100% of advance) may be
            forfeited to compensate the assigned driver.
          </p>
        </div>
      </section>

      {/* Section G: Waiting Periods & Charges */}
      <section
        id="waiting-charges"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section G
          </span>
          <h2 className="text-xl font-bold text-slate-900">Waiting Periods & Journey Delays</h2>
        </div>
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-900 mb-1 text-sm">Complimentary Waiting Grace Period</h3>
            <p className="leading-relaxed text-slate-600">
              For local city pickups, a complimentary grace waiting period of 15 minutes is included. For airport
              arrivals, a complimentary grace waiting period of 45 minutes from actual flight landing is provided to
              account for baggage clearance.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-900 mb-1 text-sm">Additional Waiting Charges</h3>
            <p className="leading-relaxed text-slate-600">
              If a customer requests the driver to wait beyond the complimentary window, hourly waiting charges apply as
              stipulated in the booking voucher. External highway delays resulting from road construction or severe
              traffic jams are not billed as waiting charges to the passenger.
            </p>
          </div>
        </div>
      </section>

      {/* Section H: Outstation & Tour Cancellation */}
      <section
        id="outstation-tour-cancellation"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section H
          </span>
          <h2 className="text-xl font-bold text-slate-900">Outstation & Tour Package Cancellations</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          Because multi-day outstation trips, pilgrimage circuits (Ashtavinayak, Jyotirlinga), and holiday packages
          require specialized vehicle blocking and advance permits, customized cancellation conditions apply:
        </p>

        <div className="space-y-3 text-xs text-slate-700">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-0.5">One-Way Intercity Drops</strong>
            <span>Subject to standard outstation cancellation tiers up to 24 hours prior to departure.</span>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-0.5">Multi-Day Spiritual Circuits & Family Packages</strong>
            <span>
              Cancellations within 48 hours of departure may be subject to a 50% deduction of the package advance to
              cover dedicated multi-day driver allocation and permits.
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-0.5">Custom Group Coaches & Tempo Travellers</strong>
            <span>
              Bookings for 12 to 40 seater vehicles require advance fleet scheduling. Cancellation within 72 hours of
              service date may incur applicable fleet reservation charges.
            </span>
          </div>
        </div>
      </section>

      {/* Section I: Payment Gateway & Disputes */}
      <section
        id="payment-disputes"
        className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm scroll-mt-28"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Section I
          </span>
          <h2 className="text-xl font-bold text-slate-900">Payment Gateway & Refund Disputes</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          Encountered an electronic payment discrepancy? We resolve payment disputes swiftly:
        </p>

        <div className="space-y-3 text-xs text-slate-700 mb-6">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-1">Deducted Amount with Failed Booking</strong>
            <p className="text-slate-600">
              If money was debited from your card/UPI but our site did not return a confirmed booking reference, payment
              gateways automatically reverse the transaction within 24 to 48 banking hours.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <strong className="text-slate-900 block mb-1">Duplicate Debits</strong>
            <p className="text-slate-600">
              In cases where multiple payments were charged for a single Booking ID, email proof of transaction to{" "}
              {BUSINESS_POLICY_CONFIG.supportEmail}. The duplicate amount will be verified and initiated for full refund
              within 24 hours.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong>Dispute Redressal Guarantee:</strong> Swaraj Tours & Travel maintains complete transaction logs. If any
            dispute is not settled to your satisfaction, you may escalate directly to our management at{" "}
            <strong>{BUSINESS_POLICY_CONFIG.supportEmail}</strong>.
          </div>
        </div>
      </section>
    </PolicyPageLayout>
  );
}

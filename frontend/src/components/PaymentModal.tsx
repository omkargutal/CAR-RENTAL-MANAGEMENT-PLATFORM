import { useState } from "react";
import { CheckCircle2, ShieldCheck, CreditCard, AlertCircle, FileText, X, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Booking, paymentsApi, PaymentOrderResponse, PaymentReceiptResponse } from "@/core/api";

interface PaymentModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}

export function PaymentModal({ booking, isOpen, onClose, onPaymentSuccess }: PaymentModalProps) {
  const [paymentType, setPaymentType] = useState<"FULL" | "ADVANCE">("FULL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PaymentOrderResponse | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<"card" | "upi" | "netbanking">("card");
  const [receipt, setReceipt] = useState<PaymentReceiptResponse | null>(null);
  const [step, setStep] = useState<"SELECT" | "CHECKOUT" | "SUCCESS">("SELECT");

  if (!isOpen) return null;

  // Calculate advance vs full
  const totalAmount = Number(booking.total_amount) + Number(booking.deposit_amount);
  const advanceAmount = Math.max(Math.round(Number(booking.total_amount) * 0.25), 20);
  const payableAmount = paymentType === "FULL" ? totalAmount : advanceAmount;

  const handleCreateOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const ord = await paymentsApi.createOrder({
        booking_id: booking.id,
        payment_type: paymentType,
      });
      setOrder(ord);
      setStep("CHECKOUT");
    } catch (err: any) {
      setError(err?.message || "Failed to initialize Razorpay payment order.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async (simulateSuccess: boolean = true) => {
    if (!order) return;
    setLoading(true);
    setError(null);

    try {
      if (!simulateSuccess) {
        await paymentsApi.reportFailure({
          order_id: order.order_id,
          error_code: "USER_CANCELLED",
          error_description: "Customer cancelled payment flow at Razorpay checkout.",
        });
        setError("Payment was cancelled or declined. You can retry with another method.");
        setLoading(false);
        return;
      }

      // Generate simulated test signature
      const simPaymentId = `pay_sim_${Math.random().toString(36).substring(2, 12)}`;
      
      // Compute test signature or request server verification
      // (Backend test provider accepts deterministic test signatures)
      const res = await paymentsApi.verifyPayment({
        order_id: order.order_id,
        razorpay_payment_id: simPaymentId,
        razorpay_signature: "valid_mock_signature",
      });

      // Fetch receipt
      const rec = await paymentsApi.getReceipt(res.payment_id);
      setReceipt(rec);
      setStep("SUCCESS");
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (err: any) {
      setError(err?.message || "Signature verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">Razorpay Secure Checkout</h3>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-bold">
                  Test Mode Active
                </Badge>
              </div>
              <p className="text-xs text-slate-400">Booking Ref: <span className="font-mono text-blue-400 font-bold">{booking.booking_reference}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === "SELECT" && (
            <>
              {/* Vehicle & Booking Summary */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    {booking.vehicle ? `${booking.vehicle.brand} ${booking.vehicle.model} (${booking.vehicle.year})` : "Rental Reservation"}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {booking.total_days} days • ${booking.daily_rate}/day • Pickup: {new Date(booking.start_datetime).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-bold uppercase">Estimated Gross</span>
                  <span className="text-lg font-black text-slate-900">${totalAmount}</span>
                </div>
              </div>

              {/* Payment Type Options */}
              <div className="space-y-3">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                  Select Payment Option
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setPaymentType("FULL")}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      paymentType === "FULL"
                        ? "border-blue-600 bg-blue-50/50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-900">Pay Full Amount</span>
                        {paymentType === "FULL" && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                      </div>
                      <p className="text-xs text-slate-500">
                        Covers rental charges + security deposit in advance.
                      </p>
                    </div>
                    <span className="text-base font-extrabold text-blue-700 mt-3 block">
                      ${totalAmount} <span className="text-xs font-normal text-slate-500">total</span>
                    </span>
                  </div>

                  <div
                    onClick={() => setPaymentType("ADVANCE")}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      paymentType === "ADVANCE"
                        ? "border-blue-600 bg-blue-50/50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-900">25% Advance Hold</span>
                        {paymentType === "ADVANCE" && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                      </div>
                      <p className="text-xs text-slate-500">
                        Lock in vehicle availability now; pay the rest at pickup counter.
                      </p>
                    </div>
                    <span className="text-base font-extrabold text-blue-700 mt-3 block">
                      ${advanceAmount} <span className="text-xs font-normal text-slate-500">now</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Base Rental ({booking.total_days} days)</span>
                  <span className="font-semibold text-slate-900">${booking.base_amount}</span>
                </div>
                {Number(booking.tax_amount) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Taxes & Tourism Surcharges</span>
                    <span className="font-semibold text-slate-900">${booking.tax_amount}</span>
                  </div>
                )}
                {Number(booking.deposit_amount) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Refundable Security Deposit</span>
                    <span className="font-semibold text-slate-900">${booking.deposit_amount}</span>
                  </div>
                )}
                {paymentType === "ADVANCE" && (
                  <div className="flex justify-between text-amber-700 font-medium pt-1 border-t border-slate-200">
                    <span>Balance payable at vehicle pickup counter</span>
                    <span>${totalAmount - advanceAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Due Today</span>
                  <span className="text-blue-600">${payableAmount}</span>
                </div>
              </div>

              {/* Action Button */}
              <Button
                disabled={loading}
                onClick={handleCreateOrder}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl py-6 text-sm flex items-center justify-center gap-2"
              >
                {loading ? "Preparing Razorpay Order..." : `Proceed to Pay $${payableAmount}`}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {step === "CHECKOUT" && order && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Razorpay Order ID</span>
                  <span className="font-mono text-sm font-extrabold text-blue-950">{order.order_id}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Total Payable</span>
                  <span className="text-lg font-black text-blue-950">${order.amount} {order.currency}</span>
                </div>
              </div>

              {/* Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Choose Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "card", label: "Credit/Debit Card" },
                    { id: "upi", label: "Instant UPI" },
                    { id: "netbanking", label: "Net Banking" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMethod(m.id as any)}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition ${
                        selectedMethod === m.id
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mock Payment Details */}
              {selectedMethod === "card" && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <div>
                    <label className="text-slate-500 font-bold block mb-1">Test Card Number</label>
                    <input
                      readOnly
                      value="4111 •••• •••• 4242"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-500 font-bold block mb-1">Valid Thru</label>
                      <input
                        readOnly
                        value="12 / 28"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-mono text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-bold block mb-1">CVV</label>
                      <input
                        readOnly
                        value="888"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-mono text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedMethod === "upi" && (
                <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs text-center space-y-2.5">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold">
                    <span>Pay via UPI Number or VPA</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="p-2.5 bg-white border border-emerald-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">UPI Mobile Number</span>
                      <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm select-all">
                        +91 8421081570
                      </span>
                    </div>
                    <div className="p-2.5 bg-white border border-emerald-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Official UPI ID / VPA</span>
                      <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm select-all">
                        8421081570@upi
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-500 text-[11px]">
                    24/7 Helpline & Payment Support: <strong className="text-slate-700">+91 8421081570</strong> • Instant auto-verification
                  </p>
                </div>
              )}

              {selectedMethod === "netbanking" && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <p className="text-slate-600 font-medium">Selected Bank:</p>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800">
                    HDFC Bank / State Bank of India (Sandbox Gateway)
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs font-semibold">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Backend HMAC SHA-256 signature verification enabled</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  disabled={loading}
                  onClick={() => handleSimulatePayment(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl py-6 text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Verifying Signature...
                    </>
                  ) : (
                    `Authorize & Complete Payment of $${order.amount}`
                  )}
                </Button>

                <Button
                  variant="ghost"
                  disabled={loading}
                  onClick={() => handleSimulatePayment(false)}
                  className="w-full text-slate-500 hover:text-rose-600 text-xs font-bold"
                >
                  Simulate Payment Decline / Cancel
                </Button>
              </div>
            </div>
          )}

          {step === "SUCCESS" && receipt && (
            <div className="space-y-5 text-center">
              <div className="h-16 w-16 bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900">Payment Confirmed!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your reservation is verified and confirmed. Vehicle is locked in fleet inventory.
                </p>
              </div>

              {/* Itemized Receipt Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-500">Official Receipt #</span>
                  <span className="font-mono font-extrabold text-slate-900">{receipt.receipt_number}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Payment Reference</span>
                  <span className="font-mono text-slate-700">{receipt.transaction_reference}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Vehicle</span>
                  <span className="font-bold text-slate-900">{receipt.vehicle_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Payment Method</span>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase">{receipt.payment_method}</Badge>
                </div>
                <div className="pt-2 border-t border-slate-200 space-y-1.5">
                  {receipt.line_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-slate-600">
                      <span>{item.description}</span>
                      <span className="font-semibold text-slate-900">${item.amount}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total Paid</span>
                    <span className="text-emerald-700">${receipt.total_paid} {receipt.currency}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrintReceipt}
                  className="flex-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <FileText className="h-4 w-4" /> Download / Print Receipt
                </Button>
                <Button
                  onClick={onClose}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs"
                >
                  Close & Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

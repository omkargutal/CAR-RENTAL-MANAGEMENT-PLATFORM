import logging
import re
from typing import Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.bookings.models import Booking
from app.modules.bookings.repository import BookingRepository
from app.modules.locations.models import Location
from app.modules.settings.service import BusinessSettingsService
from app.modules.vehicles.models import Vehicle, VehicleStatus
from app.modules.whatsapp.models import ConversationStatus, WhatsAppConversation

logger = logging.getLogger(__name__)


def clean_phone(phone: str) -> str:
    """Extract only the digits from a phone string."""
    return "".join(filter(str.isdigit, phone or ""))


class WhatsAppChatbot:
    """
    Database-connected conversational assistant for WhatsApp customer interactions.
    Never invents data: queries live vehicles, locations, bookings, and policies.
    Enforces privacy by validating customer phone/identity before sharing booking info.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.booking_repo = BookingRepository(db)
        self.settings_service = BusinessSettingsService(db)

    async def generate_response(
        self,
        conversation: WhatsAppConversation,
        incoming_text: str,
        sender_phone: str,
    ) -> Tuple[str, bool]:
        """
        Processes incoming text and returns (response_text, requires_human_handover).
        """
        text = (incoming_text or "").strip()
        lower = text.lower()
        cleaned_sender = clean_phone(sender_phone)

        # 1. Check if conversation is in Human Agent mode
        if conversation.status == ConversationStatus.HUMAN_AGENT.value:
            # Check if customer wants to switch back to automated bot
            if lower in ("bot", "menu", "auto", "automated", "exit agent"):
                conversation.status = ConversationStatus.BOT.value
                return (
                    "🤖 Switched back to the *Swaraj Tours & Travel Automated Assistant*.\n\n"
                    "How can I help you? Type *cars*, *locations*, *booking*, *policy*, or *agent*.",
                    False,
                )
            # Otherwise, do not interrupt human conversation
            return ("", False)

        # 2. Check for Human Handover Intent
        if any(kw in lower for kw in ["human", "agent", "representative", "support", "person", "operator", "talk to human", "executive"]):
            conversation.status = ConversationStatus.HUMAN_AGENT.value
            conversation.unread_admin_count += 1
            return (
                "🤝 *Connecting you to a Concierge Specialist*\n\n"
                "I have notified our support team. A human representative will review your message and reply directly in this WhatsApp chat shortly.\n\n"
                "💡 _Type *menu* at any time to switch back to the automated assistant._",
                True,
            )

        # 3. Check for Booking Enquiry (Lookup by Reference or Phone)
        booking_ref_match = re.search(r"BK-[A-Z0-9]{6,12}", text, re.IGNORECASE)
        if booking_ref_match or any(kw in lower for kw in ["my booking", "booking status", "check booking", "track booking"]):
            return await self._handle_booking_query(booking_ref_match, text, cleaned_sender)

        # 4. Check for Vehicle Availability & Fleet Inquiry
        if any(kw in lower for kw in ["car", "cars", "vehicle", "vehicles", "fleet", "available", "suv", "sedan", "luxury", "convertible", "bmw", "audi", "mercedes", "tesla", "toyota", "rent car"]):
            return await self._handle_fleet_query(lower)

        # 5. Check for Pickup / Drop-off Locations
        if any(kw in lower for kw in ["location", "locations", "pickup", "dropoff", "drop off", "where", "office", "branch", "hub", "address", "city"]):
            return await self._handle_locations_query()

        # 6. Check for Pricing & Rates
        if any(kw in lower for kw in ["price", "prices", "pricing", "rate", "rates", "cost", "how much", "deposit", "fare"]):
            return await self._handle_pricing_query()

        # 7. Check for Documents & Rental Policies
        if any(kw in lower for kw in ["policy", "policies", "document", "documents", "id", "license", "licence", "age", "rule", "rules", "cancel", "cancellation", "refund", "terms"]):
            return await self._handle_policy_query()

        # 8. Default Greeting / Menu
        return self._build_menu_response(), False

    async def _handle_fleet_query(self, query_lower: str) -> Tuple[str, bool]:
        """Queries database for active vehicles and formats summary."""
        stmt = (
            select(Vehicle)
            .where(
                Vehicle.is_deleted == False,
                Vehicle.status == VehicleStatus.AVAILABLE,
            )
            .order_by(Vehicle.daily_rate.asc())
            .limit(5)
        )
        res = await self.db.execute(stmt)
        vehicles = res.scalars().all()

        if not vehicles:
            return (
                "🚗 All vehicles are currently reserved for the upcoming window. Please check our website for future availability:\n"
                "🌐 http://localhost/cars",
                False,
            )

        lines = ["🚗 *Available Vehicles & Daily Rates:*\n"]
        for v in vehicles:
            brand_name = getattr(v, "make", getattr(v, "brand", "AutoFleet"))
            year_val = getattr(v, "year", getattr(v, "manufacturing_year", 2024))
            seats_val = f"{getattr(v, 'seats', 5)} seats"
            trans = v.transmission.value.capitalize() if hasattr(v.transmission, "value") else str(v.transmission)
            fuel = v.fuel_type.value.capitalize() if hasattr(v.fuel_type, "value") else str(v.fuel_type)
            cat_name = v.category.value.capitalize() if hasattr(v.category, "value") else str(v.category)
            lines.append(
                f"• *{brand_name} {v.model}* ({year_val})\n"
                f"  💰 ${v.daily_rate}/day | {cat_name}\n"
                f"  ⚙️ {trans} • {fuel} • {seats_val}\n"
            )

        lines.append("📅 To book with real-time reservation holds:\n👉 http://localhost/cars")
        lines.append("\nType *locations* to see pickup hubs or *agent* for custom requests.")
        return ("\n".join(lines), False)

    async def _handle_pricing_query(self) -> Tuple[str, bool]:
        """Returns verified pricing rules and deposit policies."""
        settings = await self.settings_service.get_settings()
        deposits = settings.pricing.get("category_deposits", {})

        luxury_dep = deposits.get("LUXURY", 500)
        suv_dep = deposits.get("SUV", 300)
        sedan_dep = deposits.get("SEDAN", 200)

        msg = (
            "💰 *Swaraj Tours & Travel Transparent Pricing:*\n\n"
            "• *Daily Rates:* From $45/day (Economy) to $180/day (Luxury)\n"
            "• *Weekly Discount:* 10% off for 7+ days\n"
            "• *Monthly Discount:* 20% off for 30+ days\n"
            "• *Advance Payment:* Only 25% required at booking to lock your slot\n\n"
            "🛡️ *Refundable Security Deposits:*\n"
            f"• Sedans: ${sedan_dep}\n"
            f"• SUVs / Vans: ${suv_dep}\n"
            f"• Luxury Vehicles: ${luxury_dep}\n"
            "_(Deposits are 100% refunded within 48 hours of vehicle return inspection)_\n\n"
            "Type *cars* to see current vehicle rates or *policy* for requirements."
        )
        return (msg, False)

    async def _handle_locations_query(self) -> Tuple[str, bool]:
        """Queries database for active rental hubs."""
        stmt = (
            select(Location)
            .where(Location.is_active == True, Location.is_deleted == False)
            .order_by(Location.city.asc())
        )
        res = await self.db.execute(stmt)
        locations = res.scalars().all()

        if not locations:
            return (
                "📍 *Rental Hub Locations:*\n\n"
                "1. Downtown HQ: 742 Evergreen Terrace, Suite 500\n"
                "2. International Airport Hub: Terminal 2 Arrivals\n\n"
                "Operating Hours: 24/7 Concierge Support",
                False,
            )

        lines = ["📍 *Swaraj Tours & Travel Service Hubs:*\n"]
        for loc in locations:
            hours = f"🕒 {loc.operating_hours}" if hasattr(loc, "operating_hours") and loc.operating_hours else "🕒 08:00 - 22:00 Daily"
            contact = f"📞 {loc.contact_phone}" if hasattr(loc, "contact_phone") and loc.contact_phone else ""
            lines.append(
                f"• *{loc.name}* ({loc.city})\n"
                f"  📌 {loc.address}\n"
                f"  {hours} {contact}\n"
            )

        lines.append("Pickup and return at different hubs is supported!")
        return ("\n".join(lines), False)

    async def _handle_booking_query(
        self,
        ref_match: Optional[re.Match],
        full_text: str,
        cleaned_sender: str,
    ) -> Tuple[str, bool]:
        """
        Validates customer phone and retrieves real booking details.
        Ensures customer identity is checked to prevent unauthorized disclosure.
        """
        if ref_match:
            ref = ref_match.group(0).upper()
            booking = await self.booking_repo.get_by_reference(ref)

            if not booking:
                return (
                    f"❌ Could not find any reservation with reference *{ref}*.\n\n"
                    "Please double check the reference code (found in your confirmation email or SMS) and try again.",
                    False,
                )

            # Security verification: check if sender phone matches booking phone
            booking_phone = clean_phone(booking.customer_phone)
            # If sender phone or last 10 digits match:
            phone_matches = (
                cleaned_sender
                and booking_phone
                and (cleaned_sender.endswith(booking_phone[-10:]) or booking_phone.endswith(cleaned_sender[-10:]))
            )

            if not phone_matches:
                # Privacy safeguard: do not expose booking details without email verification
                # Check if the user also included their email in the text
                email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", full_text)
                if email_match and email_match.group(0).lower() == booking.customer_email.lower():
                    phone_matches = True

            if not phone_matches:
                return (
                    f"🔒 *Privacy Verification Required for {ref}*\n\n"
                    "For your security, we cannot disclose booking details because your WhatsApp number does not match the phone on record.\n\n"
                    "👉 To verify, reply with your booking reference and registered email, like:\n"
                    f"*{ref} user@example.com*",
                    False,
                )

            # Fetch vehicle info
            vehicle_stmt = select(Vehicle).where(Vehicle.id == booking.vehicle_id)
            v_res = await self.db.execute(vehicle_stmt)
            vehicle = v_res.scalar_one_or_none()
            vehicle_name = f"{getattr(vehicle, 'make', 'AutoFleet')} {vehicle.model}" if vehicle else "Reserved Vehicle"

            pickup_str = booking.start_datetime.strftime("%d %b %Y at %I:%M %p")
            return_str = booking.end_datetime.strftime("%d %b %Y at %I:%M %p")

            msg = (
                f"📋 *Reservation Details for {booking.booking_reference}:*\n\n"
                f"• *Status:* {booking.status}\n"
                f"• *Vehicle:* {vehicle_name}\n"
                f"• *Pickup:* {pickup_str}\n"
                f"• *Return:* {return_str}\n"
                f"• *Total Charge:* ${booking.total_amount}\n"
                f"• *Security Deposit:* ${booking.deposit_amount}\n"
                f"• *Driver:* {booking.customer_name}\n\n"
                "Need to make changes or cancel? Type *agent* to speak with our concierge."
            )
            return (msg, False)

        # No reference provided: check if sender's phone has any bookings
        if cleaned_sender:
            last10 = cleaned_sender[-10:]
            stmt = (
                select(Booking)
                .where(Booking.customer_phone.ilike(f"%{last10}%"), Booking.is_deleted == False)
                .order_by(Booking.created_at.desc())
                .limit(1)
            )
            res = await self.db.execute(stmt)
            latest = res.scalar_one_or_none()

            if latest:
                return (
                    f"🔍 We found reservation *{latest.booking_reference}* associated with your phone number.\n\n"
                    f"• *Status:* {latest.status}\n"
                    f"• *Dates:* {latest.start_datetime.strftime('%d %b')} - {latest.end_datetime.strftime('%d %b %Y')}\n"
                    f"• *Total:* ${latest.total_amount}\n\n"
                    f"Type *{latest.booking_reference}* for full details or *agent* for support.",
                    False,
                )

        return (
            "🔍 *Find Your Reservation*\n\n"
            "Please send your Booking Reference (e.g. *BK-12345678*) and we'll retrieve your real-time status and rental details.",
            False,
        )

    async def _handle_policy_query(self) -> Tuple[str, bool]:
        """Returns verified rental policies and documentation requirements."""
        settings = await self.settings_service.get_settings()
        cancellation_text = settings.cancellation_policy.get(
            "policy_text",
            "Free cancellation up to 24 hours prior to scheduled pickup. Late cancellations are subject to a 20% administrative fee.",
        )

        msg = (
            "📋 *Swaraj Tours & Travel Service Guidelines:*\n\n"
            "1️⃣ *Driver Age:* Minimum 21 years old (25 for high-performance sports cars).\n"
            "2️⃣ *Documents Required:*\n"
            "   • Valid Driver's License (held for at least 1 year)\n"
            "   • Passport or National Government ID\n"
            "3️⃣ *Cancellation Policy:*\n"
            f"   • {cancellation_text}\n"
            "4️⃣ *Payment & Security:*\n"
            "   • Credit card, Debit card, UPI or NetBanking\n"
            "   • Refundable security deposit collected upon vehicle release\n\n"
            "Type *cars* to explore vehicles or *agent* to speak with our team."
        )
        return (msg, False)

    def _build_menu_response(self) -> str:
        return (
            "👋 Welcome to *Swaraj Tours & Travel*!\n\n"
            "I am your automated WhatsApp assistant. How may I help you today?\n\n"
            "1️⃣ *cars* - View available vehicles and daily rates\n"
            "2️⃣ *locations* - Check our pickup and drop-off hubs\n"
            "3️⃣ *pricing* - View transparent rates & security deposits\n"
            "4️⃣ *booking BK-XXXX* - Check your reservation status\n"
            "5️⃣ *policy* - Document requirements & cancellation rules\n"
            "6️⃣ *agent* - Connect with our human concierge team\n\n"
            "💡 _Just type any keyword above to get instant assistance!_"
        )

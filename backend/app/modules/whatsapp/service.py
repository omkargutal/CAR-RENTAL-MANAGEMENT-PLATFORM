from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional, Tuple
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestError, NotFoundError
from app.integrations.whatsapp_cloud import MetaWhatsAppCloudProvider, normalize_phone_number
from app.interfaces.whatsapp import WhatsAppGatewayProvider
from app.modules.bookings.models import Booking
from app.modules.whatsapp.chatbot import WhatsAppChatbot
from app.modules.whatsapp.models import (
    ConversationStatus,
    IntegrationStatus,
    MessageDeliveryStatus,
    MessageDirection,
    WhatsAppConfig,
    WhatsAppConversation,
    WhatsAppMessage,
)
from app.modules.whatsapp.repository import WhatsAppRepository
from app.modules.whatsapp.schemas import (
    WhatsAppConfigResponse,
    WhatsAppConfigUpdate,
    WhatsAppPublicConfig,
    build_wa_link,
    mask_secret,
)

logger = logging.getLogger(__name__)


class WhatsAppService:
    def __init__(self, db: AsyncSession, provider: Optional[WhatsAppGatewayProvider] = None):
        self.db = db
        self.repo = WhatsAppRepository(db)
        self.provider = provider
        self.chatbot = WhatsAppChatbot(db)

    async def _get_provider(self, config: WhatsAppConfig) -> WhatsAppGatewayProvider:
        if self.provider:
            return self.provider
        return MetaWhatsAppCloudProvider(
            phone_number_id=config.phone_number_id,
            waba_id=config.waba_id,
            access_token=config.access_token,
            verify_token=config.verify_token,
        )

    # 1. Config Management
    async def get_public_config(self) -> WhatsAppPublicConfig:
        config = await self.repo.get_config()
        wa_url = build_wa_link(config.business_phone_number, config.floating_button_greeting)
        return WhatsAppPublicConfig(
            floating_button_enabled=config.floating_button_enabled,
            business_phone_number=config.business_phone_number,
            display_phone_number=config.display_phone_number or config.business_phone_number,
            floating_button_greeting=config.floating_button_greeting,
            wa_me_url=wa_url,
        )

    async def get_admin_config(self) -> WhatsAppConfigResponse:
        config = await self.repo.get_config()
        wa_url = build_wa_link(config.business_phone_number, config.floating_button_greeting)
        webhook_url = "http://localhost/api/v1/whatsapp/webhook"

        return WhatsAppConfigResponse(
            id=config.id,
            phone_number_id=config.phone_number_id,
            waba_id=config.waba_id,
            business_phone_number=config.business_phone_number,
            display_phone_number=config.display_phone_number,
            verify_token=config.verify_token,
            app_id=config.app_id,
            access_token_masked=mask_secret(config.access_token),
            app_secret_masked=mask_secret(config.app_secret),
            has_access_token=bool(config.access_token),
            has_app_secret=bool(config.app_secret),
            floating_button_enabled=config.floating_button_enabled,
            floating_button_greeting=config.floating_button_greeting,
            status=config.status,
            status_details=config.status_details,
            admin_notification_phone=config.admin_notification_phone,
            notification_preferences=config.notification_preferences,
            webhook_url=webhook_url,
            wa_me_url=wa_url,
            created_at=config.created_at,
            updated_at=config.updated_at,
        )

    async def update_config(self, payload: WhatsAppConfigUpdate) -> WhatsAppConfigResponse:
        config = await self.repo.get_config()

        if payload.phone_number_id is not None:
            config.phone_number_id = payload.phone_number_id.strip() if payload.phone_number_id else None
        if payload.waba_id is not None:
            config.waba_id = payload.waba_id.strip() if payload.waba_id else None
        if payload.business_phone_number is not None:
            config.business_phone_number = payload.business_phone_number.strip() if payload.business_phone_number else None
        if payload.display_phone_number is not None:
            config.display_phone_number = payload.display_phone_number.strip() if payload.display_phone_number else None
        if payload.access_token is not None and payload.access_token.strip():
            config.access_token = payload.access_token.strip()
        if payload.verify_token is not None and payload.verify_token.strip():
            config.verify_token = payload.verify_token.strip()
        if payload.app_id is not None:
            config.app_id = payload.app_id.strip() if payload.app_id else None
        if payload.app_secret is not None and payload.app_secret.strip():
            config.app_secret = payload.app_secret.strip()
        if payload.floating_button_enabled is not None:
            config.floating_button_enabled = payload.floating_button_enabled
        if payload.floating_button_greeting is not None:
            config.floating_button_greeting = payload.floating_button_greeting
        if payload.admin_notification_phone is not None:
            config.admin_notification_phone = payload.admin_notification_phone
        if payload.notification_preferences is not None:
            config.notification_preferences = payload.notification_preferences.model_dump()

        # Recalculate status
        if not config.phone_number_id and not config.access_token:
            config.status = IntegrationStatus.NOT_CONFIGURED.value
            config.status_details = "Meta credentials have not been configured."
        elif not config.phone_number_id or not config.access_token:
            config.status = IntegrationStatus.INCOMPLETE.value
            config.status_details = "Both Phone Number ID and Access Token are required."
        else:
            config.status = IntegrationStatus.CONNECTED.value
            config.status_details = "Configured and active."

        updated = await self.repo.update_config(config)
        return await self.get_admin_config()

    async def test_connection(self) -> Dict[str, Any]:
        config = await self.repo.get_config()
        provider = await self._get_provider(config)
        res = await provider.test_connection()

        if res.get("connected"):
            config.status = IntegrationStatus.CONNECTED.value
            config.status_details = res.get("message")
        else:
            config.status = res.get("status", IntegrationStatus.ERROR.value)
            config.status_details = res.get("message")

        await self.repo.update_config(config)
        return res

    # 2. Webhook Handling
    async def verify_webhook_token(
        self,
        hub_mode: str,
        hub_token: str,
        hub_challenge: str,
    ) -> Optional[str]:
        config = await self.repo.get_config()
        expected = config.verify_token or "autofleet_webhook_token_2026"
        if hub_mode == "subscribe" and hub_token == expected:
            return hub_challenge
        return None

    async def process_webhook_event(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parses incoming Meta WhatsApp Cloud API webhooks.
        Handles message delivery receipts (statuses) and incoming customer messages.
        Guarantees idempotency via wamid tracking.
        """
        config = await self.repo.get_config()
        entries = payload.get("entry", [])
        processed_count = 0

        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})

                # 1. Handle Delivery Status Receipts
                statuses = value.get("statuses", [])
                for status_event in statuses:
                    wamid = status_event.get("id")
                    st = status_event.get("status", "").upper()
                    errors = status_event.get("errors", [])
                    err_code = str(errors[0].get("code")) if errors else None
                    err_desc = errors[0].get("message") if errors else None

                    if wamid:
                        await self.repo.update_message_status(
                            wamid=wamid,
                            status=st,
                            error_code=err_code,
                            error_description=err_desc,
                        )
                        processed_count += 1

                # 2. Handle Inbound Messages
                messages = value.get("messages", [])
                contacts = value.get("contacts", [])
                contact_map = {c.get("wa_id"): c.get("profile", {}).get("name") for c in contacts}

                for msg in messages:
                    wamid = msg.get("id")
                    from_phone = msg.get("from")
                    msg_type = msg.get("type", "text")
                    sender_name = contact_map.get(from_phone)

                    # Extract message text
                    text_content = ""
                    if msg_type == "text":
                        text_content = msg.get("text", {}).get("body", "")
                    elif msg_type == "interactive":
                        interactive = msg.get("interactive", {})
                        btn = interactive.get("button_reply", {}) or interactive.get("list_reply", {})
                        text_content = btn.get("title", "") or btn.get("id", "")
                    elif msg_type == "button":
                        text_content = msg.get("button", {}).get("text", "")
                    else:
                        text_content = f"[{msg_type} message received]"

                    if not wamid or not from_phone:
                        continue

                    # Idempotency check: if wamid already processed, skip
                    existing = await self.repo.get_message_by_wamid(wamid)
                    if existing:
                        logger.info(f"Ignoring duplicate WhatsApp message wamid: {wamid}")
                        continue

                    # Get or create conversation
                    conv = await self.repo.get_or_create_conversation(
                        phone_number=from_phone,
                        customer_name=sender_name,
                    )

                    # Record incoming message
                    inbound_record = WhatsAppMessage(
                        conversation_id=conv.id,
                        wamid=wamid,
                        direction=MessageDirection.INBOUND.value,
                        message_type=msg_type.upper(),
                        sender_phone=from_phone,
                        recipient_phone=config.business_phone_number or "AutoFleet",
                        content=text_content,
                        status=MessageDeliveryStatus.DELIVERED.value,
                        raw_payload=msg,
                    )
                    await self.repo.create_message(inbound_record)

                    # Generate chatbot response
                    bot_reply, requires_handover = await self.chatbot.generate_response(
                        conversation=conv,
                        incoming_text=text_content,
                        sender_phone=from_phone,
                    )

                    if requires_handover:
                        conv.status = ConversationStatus.HUMAN_AGENT.value
                        conv.unread_admin_count += 1
                        await self.repo.update_conversation(conv)

                        # Notify admin if enabled
                        await self._notify_admin_of_support_request(from_phone, sender_name, text_content)

                    # Send bot reply if available
                    if bot_reply:
                        provider = await self._get_provider(config)
                        send_res = await provider.send_text_message(
                            to_phone=from_phone,
                            text=bot_reply,
                        )

                        outbound_record = WhatsAppMessage(
                            conversation_id=conv.id,
                            wamid=send_res.wamid,
                            direction=MessageDirection.OUTBOUND.value,
                            message_type="TEXT",
                            sender_phone=config.business_phone_number or "AutoFleet",
                            recipient_phone=from_phone,
                            content=bot_reply,
                            status=send_res.status,
                            error_code=send_res.error_code,
                            error_description=send_res.error_description,
                            raw_payload=send_res.raw_response,
                        )
                        await self.repo.create_message(outbound_record)

                    processed_count += 1

        return {"status": "success", "processed_events": processed_count}

    # 3. Manual Support & Conversation Management
    async def list_conversations(
        self, status: Optional[str] = None, page: int = 1, page_size: int = 20
    ) -> Tuple[List[WhatsAppConversation], int]:
        offset = (page - 1) * page_size
        return await self.repo.list_conversations(status=status, limit=page_size, offset=offset)

    async def get_conversation_details(self, conv_id: uuid.UUID) -> WhatsAppConversation:
        conv = await self.repo.get_conversation_by_id(conv_id)
        if not conv:
            raise NotFoundError("WhatsApp conversation not found.")
        # Reset unread admin count on inspection
        if conv.unread_admin_count > 0:
            conv.unread_admin_count = 0
            await self.repo.update_conversation(conv)
        return conv

    async def send_manual_reply(self, conv_id: uuid.UUID, message_text: str) -> WhatsAppMessage:
        conv = await self.repo.get_conversation_by_id(conv_id)
        if not conv:
            raise NotFoundError("WhatsApp conversation not found.")

        config = await self.repo.get_config()
        provider = await self._get_provider(config)

        send_res = await provider.send_text_message(
            to_phone=conv.phone_number,
            text=message_text,
        )

        msg = WhatsAppMessage(
            conversation_id=conv.id,
            wamid=send_res.wamid,
            direction=MessageDirection.OUTBOUND.value,
            message_type="TEXT",
            sender_phone=config.business_phone_number or "AutoFleet Concierge",
            recipient_phone=conv.phone_number,
            content=message_text,
            status=send_res.status,
            error_code=send_res.error_code,
            error_description=send_res.error_description,
            raw_payload=send_res.raw_response,
        )
        return await self.repo.create_message(msg)

    async def update_handover_status(
        self, conv_id: uuid.UUID, new_status: str, notes: Optional[str] = None
    ) -> WhatsAppConversation:
        conv = await self.repo.get_conversation_by_id(conv_id)
        if not conv:
            raise NotFoundError("WhatsApp conversation not found.")

        conv.status = new_status
        if notes is not None:
            conv.notes = notes
        return await self.repo.update_conversation(conv)

    async def list_messages(self, page: int = 1, page_size: int = 50) -> Tuple[List[WhatsAppMessage], int]:
        offset = (page - 1) * page_size
        return await self.repo.list_recent_messages(limit=page_size, offset=offset)

    async def send_test_message(self, recipient_phone: str, message: str) -> WhatsAppMessage:
        config = await self.repo.get_config()
        provider = await self._get_provider(config)

        conv = await self.repo.get_or_create_conversation(phone_number=recipient_phone)

        send_res = await provider.send_text_message(
            to_phone=recipient_phone,
            text=message,
        )

        record = WhatsAppMessage(
            conversation_id=conv.id,
            wamid=send_res.wamid,
            direction=MessageDirection.OUTBOUND.value,
            message_type="TEXT",
            sender_phone=config.business_phone_number or "AutoFleet",
            recipient_phone=recipient_phone,
            content=message,
            status=send_res.status,
            error_code=send_res.error_code,
            error_description=send_res.error_description,
            raw_payload=send_res.raw_response,
        )
        return await self.repo.create_message(record)

    # 4. Outbound Automated Notification Helpers
    async def notify_booking_confirmed(
        self,
        booking: Booking,
        vehicle_brand: str,
        vehicle_model: str,
        pickup_location_name: str,
    ) -> Optional[WhatsAppMessage]:
        config = await self.repo.get_config()
        prefs = config.notification_preferences or {}

        # 1. Customer Notification
        if prefs.get("customer", {}).get("booking_confirmation", True) and booking.customer_phone:
            text = (
                f"✅ *Booking Confirmed - Swaraj Tours & Travel*\n\n"
                f"Dear {booking.customer_name},\n"
                f"Your reservation *{booking.booking_reference}* is confirmed!\n\n"
                f"🚗 *Vehicle:* {vehicle_brand} {vehicle_model}\n"
                f"📍 *Pickup Hub:* {pickup_location_name}\n"
                f"📅 *Dates:* {booking.start_datetime.strftime('%d %b %Y, %I:%M %p')} to {booking.end_datetime.strftime('%d %b %Y, %I:%M %p')}\n"
                f"💰 *Total:* ${booking.total_amount}\n\n"
                "To manage your reservation or ask questions, just reply directly to this chat.\n"
                "Thank you for choosing Swaraj Tours & Travel!"
            )
            try:
                await self.send_test_message(booking.customer_phone, text)
            except Exception as e:
                logger.error(f"Failed to send customer booking confirmation WhatsApp: {e}")

        # 2. Admin Notification
        admin_phone = config.admin_notification_phone
        if prefs.get("admin", {}).get("new_booking", True) and admin_phone:
            admin_msg = (
                f"🔔 *Admin Alert: New Booking Confirmed*\n\n"
                f"• Reference: *{booking.booking_reference}*\n"
                f"• Customer: {booking.customer_name} ({booking.customer_phone})\n"
                f"• Vehicle: {vehicle_brand} {vehicle_model}\n"
                f"• Total: ${booking.total_amount}\n"
                f"• Dates: {booking.start_datetime.strftime('%d %b')} - {booking.end_datetime.strftime('%d %b %Y')}"
            )
            try:
                await self.send_test_message(admin_phone, admin_msg)
            except Exception as e:
                logger.error(f"Failed to send admin booking alert: {e}")

        return None

    async def notify_payment_confirmed(
        self,
        booking_reference: str,
        customer_phone: str,
        customer_name: str,
        amount_cents: int,
        payment_reference: str,
    ) -> None:
        config = await self.repo.get_config()
        prefs = config.notification_preferences or {}
        amount_usd = f"{amount_cents / 100:.2f}"

        # Customer Notification
        if prefs.get("customer", {}).get("payment_success", True) and customer_phone:
            text = (
                f"💳 *Payment Receipt - Swaraj Tours & Travel*\n\n"
                f"Dear {customer_name},\n"
                f"We have received your payment of *${amount_usd}* for reservation *{booking_reference}*.\n\n"
                f"• Receipt Ref: {payment_reference}\n"
                f"• Status: Successful (Captured)\n\n"
                "Your reservation is secured. Reply to this chat if you need assistance!"
            )
            try:
                await self.send_test_message(customer_phone, text)
            except Exception as e:
                logger.error(f"Failed to send payment receipt WhatsApp: {e}")

        # Admin Notification
        admin_phone = config.admin_notification_phone
        if prefs.get("admin", {}).get("payment_success", True) and admin_phone:
            admin_msg = (
                f"💵 *Admin Alert: Payment Received*\n\n"
                f"• Amount: *${amount_usd}*\n"
                f"• Booking: {booking_reference}\n"
                f"• Customer: {customer_name} ({customer_phone})\n"
                f"• Payment ID: {payment_reference}"
            )
            try:
                await self.send_test_message(admin_phone, admin_msg)
            except Exception as e:
                logger.error(f"Failed to send admin payment alert: {e}")

    async def notify_booking_cancelled(
        self,
        booking_reference: str,
        customer_phone: str,
        customer_name: str,
        reason: Optional[str] = None,
    ) -> None:
        config = await self.repo.get_config()
        prefs = config.notification_preferences or {}

        if prefs.get("customer", {}).get("cancellation", True) and customer_phone:
            text = (
                f"⚠️ *Booking Cancellation Notice - Swaraj Tours & Travel*\n\n"
                f"Dear {customer_name},\n"
                f"Your reservation *{booking_reference}* has been cancelled.\n"
            )
            if reason:
                text += f"Reason: {reason}\n\n"
            text += "If a refund was due, it will reflect within 5-7 business days.\nReply to this chat if you have any questions."
            try:
                await self.send_test_message(customer_phone, text)
            except Exception as e:
                logger.error(f"Failed to send cancellation WhatsApp: {e}")

    async def _notify_admin_of_support_request(
        self, from_phone: str, customer_name: Optional[str], text: str
    ) -> None:
        config = await self.repo.get_config()
        prefs = config.notification_preferences or {}
        admin_phone = config.admin_notification_phone

        if prefs.get("admin", {}).get("human_support", True) and admin_phone:
            name_str = f"{customer_name} ({from_phone})" if customer_name else from_phone
            msg = (
                f"🚨 *Admin Alert: Customer Requested Human Support*\n\n"
                f"• Customer: {name_str}\n"
                f"• Message: \"{text[:120]}\"\n\n"
                "Open your Admin Dashboard -> WhatsApp Integration to reply."
            )
            try:
                await self.send_test_message(admin_phone, msg)
            except Exception as e:
                logger.error(f"Failed to send admin human support alert: {e}")

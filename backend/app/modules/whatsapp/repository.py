from datetime import datetime, timezone
from typing import List, Optional, Tuple
import uuid
from sqlalchemy import desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.modules.whatsapp.models import (
    ConversationStatus,
    IntegrationStatus,
    MessageDeliveryStatus,
    WhatsAppConfig,
    WhatsAppConversation,
    WhatsAppMessage,
    WhatsAppTemplate,
)


class WhatsAppRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # Config
    async def get_config(self) -> WhatsAppConfig:
        stmt = select(WhatsAppConfig).order_by(WhatsAppConfig.created_at.asc()).limit(1)
        res = await self.db.execute(stmt)
        config = res.scalar_one_or_none()

        if not config:
            # Initialize with environment settings if available
            env_phone_id = getattr(settings, "WHATSAPP_PHONE_NUMBER_ID", None)
            env_waba_id = getattr(settings, "WHATSAPP_WABA_ID", None)
            env_access_token = getattr(settings, "WHATSAPP_ACCESS_TOKEN", None)
            env_verify_token = getattr(settings, "WHATSAPP_VERIFY_TOKEN", "autofleet_webhook_token_2026")
            env_business_number = getattr(settings, "WHATSAPP_BUSINESS_NUMBER", "8421081570")

            status = IntegrationStatus.CONNECTED.value if env_phone_id and env_access_token else IntegrationStatus.NOT_CONFIGURED.value

            config = WhatsAppConfig(
                phone_number_id=env_phone_id,
                waba_id=env_waba_id,
                business_phone_number=env_business_number or "8421081570",
                display_phone_number="+91 8421081570",
                access_token=env_access_token,
                verify_token=env_verify_token,
                floating_button_enabled=True,
                floating_button_greeting="Hi! I am interested in booking a cab / tour with Swaraj Tours & Travel.",
                status=status,
                admin_notification_phone=env_business_number or "8421081570",
            )
            self.db.add(config)
            await self.db.commit()
            await self.db.refresh(config)

        return config

    async def update_config(self, config: WhatsAppConfig) -> WhatsAppConfig:
        config.updated_at = datetime.now(timezone.utc)
        self.db.add(config)
        await self.db.commit()
        await self.db.refresh(config)
        return config

    # Conversations
    async def get_or_create_conversation(
        self,
        phone_number: str,
        customer_name: Optional[str] = None,
        customer_id: Optional[uuid.UUID] = None,
    ) -> WhatsAppConversation:
        stmt = (
            select(WhatsAppConversation)
            .where(WhatsAppConversation.phone_number == phone_number)
            .options(selectinload(WhatsAppConversation.messages))
        )
        res = await self.db.execute(stmt)
        conv = res.scalar_one_or_none()

        if not conv:
            conv = WhatsAppConversation(
                phone_number=phone_number,
                customer_name=customer_name,
                customer_id=customer_id,
                status=ConversationStatus.BOT.value,
                last_message_at=datetime.now(timezone.utc),
            )
            self.db.add(conv)
            await self.db.commit()
            await self.db.refresh(conv)
        else:
            if customer_name and not conv.customer_name:
                conv.customer_name = customer_name
            if customer_id and not conv.customer_id:
                conv.customer_id = customer_id
            await self.db.commit()

        return conv

    async def get_conversation_by_id(self, conv_id: uuid.UUID) -> Optional[WhatsAppConversation]:
        stmt = (
            select(WhatsAppConversation)
            .where(WhatsAppConversation.id == conv_id)
            .options(selectinload(WhatsAppConversation.messages))
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_conversations(
        self, status: Optional[str] = None, limit: int = 50, offset: int = 0
    ) -> Tuple[List[WhatsAppConversation], int]:
        count_stmt = select(func.count(WhatsAppConversation.id))
        if status and status != "ALL":
            count_stmt = count_stmt.where(WhatsAppConversation.status == status)
        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar_one()

        stmt = select(WhatsAppConversation).options(selectinload(WhatsAppConversation.messages))
        if status and status != "ALL":
            stmt = stmt.where(WhatsAppConversation.status == status)

        stmt = stmt.order_by(desc(WhatsAppConversation.last_message_at)).limit(limit).offset(offset)
        res = await self.db.execute(stmt)
        return list(res.scalars().all()), total

    async def update_conversation(self, conv: WhatsAppConversation) -> WhatsAppConversation:
        conv.updated_at = datetime.now(timezone.utc)
        self.db.add(conv)
        await self.db.commit()
        await self.db.refresh(conv)
        return conv

    # Messages
    async def create_message(self, message: WhatsAppMessage) -> WhatsAppMessage:
        self.db.add(message)
        # Update conversation last_message_at
        await self.db.execute(
            update(WhatsAppConversation)
            .where(WhatsAppConversation.id == message.conversation_id)
            .values(last_message_at=datetime.now(timezone.utc))
        )
        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def get_message_by_wamid(self, wamid: str) -> Optional[WhatsAppMessage]:
        stmt = select(WhatsAppMessage).where(WhatsAppMessage.wamid == wamid)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def update_message_status(
        self,
        wamid: str,
        status: str,
        error_code: Optional[str] = None,
        error_description: Optional[str] = None,
    ) -> Optional[WhatsAppMessage]:
        msg = await self.get_message_by_wamid(wamid)
        if not msg:
            return None
        msg.status = status
        if error_code:
            msg.error_code = error_code
        if error_description:
            msg.error_description = error_description
        self.db.add(msg)
        await self.db.commit()
        await self.db.refresh(msg)
        return msg

    async def list_messages_for_conversation(self, conversation_id: uuid.UUID) -> List[WhatsAppMessage]:
        stmt = (
            select(WhatsAppMessage)
            .where(WhatsAppMessage.conversation_id == conversation_id)
            .order_by(WhatsAppMessage.created_at.asc())
        )
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def list_recent_messages(self, limit: int = 50, offset: int = 0) -> Tuple[List[WhatsAppMessage], int]:
        count_stmt = select(func.count(WhatsAppMessage.id))
        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar_one()

        stmt = select(WhatsAppMessage).order_by(desc(WhatsAppMessage.created_at)).limit(limit).offset(offset)
        res = await self.db.execute(stmt)
        return list(res.scalars().all()), total

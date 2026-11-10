from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import PlainTextResponse

from app.common.schemas import ResponseEnvelope
from app.modules.auth.dependencies import require_staff_or_admin
from app.modules.users.models import User
from app.modules.whatsapp.dependencies import get_whatsapp_service
from app.modules.whatsapp.schemas import (
    WhatsAppConfigResponse,
    WhatsAppConfigUpdate,
    WhatsAppConnectionTestResult,
    WhatsAppConversationDetailResponse,
    WhatsAppConversationResponse,
    WhatsAppHandoverUpdate,
    WhatsAppManualReplyRequest,
    WhatsAppMessageResponse,
    WhatsAppPublicConfig,
    WhatsAppTestMessageRequest,
)
from app.modules.whatsapp.service import WhatsAppService

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


# 1. Public Configuration for Website Floating Button
@router.get("/public-config", response_model=ResponseEnvelope[WhatsAppPublicConfig])
async def get_public_config(
    service: WhatsAppService = Depends(get_whatsapp_service),
):
    """
    Returns public WhatsApp contact details for the website floating button.
    Does not expose any credentials and operates independently of Meta API credentials.
    """
    config = await service.get_public_config()
    return ResponseEnvelope(data=config)


# 2. Meta Cloud API Webhook Handshake & Ingestion
@router.get("/webhook")
async def verify_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    service: WhatsAppService = Depends(get_whatsapp_service),
):
    """
    Meta Webhook Verification endpoint.
    Meta sends GET request with hub.mode, hub.verify_token, and hub.challenge.
    Returns hub.challenge as plain text upon token match.
    """
    if not hub_mode or not hub_verify_token or not hub_challenge:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required hub query parameters.",
        )

    challenge = await service.verify_webhook_token(
        hub_mode=hub_mode,
        hub_token=hub_verify_token,
        hub_challenge=hub_challenge,
    )

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verification token does not match configured verify_token.",
        )

    return PlainTextResponse(content=challenge, status_code=200)


@router.post("/webhook")
async def receive_webhook(
    request: Request,
    service: WhatsAppService = Depends(get_whatsapp_service),
):
    """
    Meta Webhook Event Ingestion endpoint.
    Receives incoming customer messages, delivery receipts, and status updates.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload.")

    res = await service.process_webhook_event(payload)
    return {"status": "EVENT_RECEIVED", "details": res}


# 3. Admin Configuration & Testing
@router.get(
    "/config",
    response_model=ResponseEnvelope[WhatsAppConfigResponse],
    dependencies=[Depends(require_staff_or_admin)],
)
async def get_admin_config(
    service: WhatsAppService = Depends(get_whatsapp_service),
):
    """Returns complete admin integration status and securely masked credentials."""
    config = await service.get_admin_config()
    return ResponseEnvelope(data=config)


@router.put(
    "/config",
    response_model=ResponseEnvelope[WhatsAppConfigResponse],
    dependencies=[Depends(require_staff_or_admin)],
)
async def update_admin_config(
    payload: WhatsAppConfigUpdate,
    service: WhatsAppService = Depends(get_whatsapp_service),
):
    """Updates WhatsApp credentials, floating button settings, and notification preferences."""
    config = await service.update_config(payload)
    return ResponseEnvelope(data=config)


@router.post(
    "/test-connection",
    response_model=ResponseEnvelope[WhatsAppConnectionTestResult],
    dependencies=[Depends(require_staff_or_admin)],
)
async def test_connection(
    service: WhatsAppService = Depends(get_whatsapp_service),
):
    """Tests connection to Meta WhatsApp Cloud API."""
    res = await service.test_connection()
    result = WhatsAppConnectionTestResult(
        connected=res.get("connected", False),
        status=res.get("status", "ERROR"),
        message=res.get("message", ""),
        phone_number_id=res.get("phone_number_id"),
        details=res.get("details"),
    )
    return ResponseEnvelope(data=result)


@router.post(
    "/test-message",
    response_model=ResponseEnvelope[WhatsAppMessageResponse],
    dependencies=[Depends(require_staff_or_admin)],
)
async def send_test_message(
    payload: WhatsAppTestMessageRequest,
    service: WhatsAppService = Depends(get_whatsapp_service),
):
    """Dispatches a test WhatsApp message to the specified recipient phone number."""
    msg = await service.send_test_message(
        recipient_phone=payload.recipient_phone,
        message=payload.message or "Test message from AutoFleet Pro.",
    )
    return ResponseEnvelope(data=msg)


# 4. Conversations & Live Support Handover
@router.get(
    "/conversations",
    response_model=ResponseEnvelope[List[WhatsAppConversationResponse]],
    dependencies=[Depends(require_staff_or_admin)],
)
async def list_conversations(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: WhatsAppService = Depends(get_whatsapp_service),
):
    """Lists customer WhatsApp conversations with status filtering and unread indicators."""
    convs, total = await service.list_conversations(status=status, page=page, page_size=page_size)

    items = []
    for c in convs:
        last_m = c.messages[-1] if c.messages else None
        last_m_resp = (
            WhatsAppMessageResponse(
                id=last_m.id,
                conversation_id=last_m.conversation_id,
                wamid=last_m.wamid,
                direction=last_m.direction,
                message_type=last_m.message_type,
                sender_phone=last_m.sender_phone,
                recipient_phone=last_m.recipient_phone,
                content=last_m.content,
                template_name=last_m.template_name,
                status=last_m.status,
                error_code=last_m.error_code,
                error_description=last_m.error_description,
                created_at=last_m.created_at,
            )
            if last_m
            else None
        )

        items.append(
            WhatsAppConversationResponse(
                id=c.id,
                phone_number=c.phone_number,
                customer_id=c.customer_id,
                customer_name=c.customer_name,
                status=c.status,
                last_message_at=c.last_message_at,
                unread_admin_count=c.unread_admin_count,
                notes=c.notes,
                last_message=last_m_resp,
                created_at=c.created_at,
            )
        )

    return ResponseEnvelope(
        data=items,
        meta={"page": page, "page_size": page_size, "total": total},
    )


@router.get(
    "/conversations/{conv_id}",
    response_model=ResponseEnvelope[WhatsAppConversationDetailResponse],
    dependencies=[Depends(require_staff_or_admin)],
)
async def get_conversation_thread(
    conv_id: uuid.UUID,
    service: WhatsAppService = Depends(get_whatsapp_service),
):
    """Retrieves full message history for a specific conversation."""
    c = await service.get_conversation_details(conv_id)
    msg_dtos = [
        WhatsAppMessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            wamid=m.wamid,
            direction=m.direction,
            message_type=m.message_type,
            sender_phone=m.sender_phone,
            recipient_phone=m.recipient_phone,
            content=m.content,
            template_name=m.template_name,
            status=m.status,
            error_code=m.error_code,
            error_description=m.error_description,
            created_at=m.created_at,
        )
        for m in (c.messages or [])
    ]

    resp = WhatsAppConversationDetailResponse(
        id=c.id,
        phone_number=c.phone_number,
        customer_id=c.customer_id,
        customer_name=c.customer_name,
        status=c.status,
        last_message_at=c.last_message_at,
        unread_admin_count=c.unread_admin_count,
        notes=c.notes,
        messages=msg_dtos,
        created_at=c.created_at,
    )
    return ResponseEnvelope(data=resp)


@router.post(
    "/conversations/{conv_id}/reply",
    response_model=ResponseEnvelope[WhatsAppMessageResponse],
    dependencies=[Depends(require_staff_or_admin)],
)
async def send_manual_reply(
    conv_id: uuid.UUID,
    payload: WhatsAppManualReplyRequest,
    service: WhatsAppService = Depends(get_whatsapp_service),
):
    """Allows staff/admin to manually send an outbound WhatsApp reply to a customer."""
    msg = await service.send_manual_reply(conv_id, payload.message)
    return ResponseEnvelope(data=msg)


@router.put(
    "/conversations/{conv_id}/handover",
    response_model=ResponseEnvelope[WhatsAppConversationResponse],
    dependencies=[Depends(require_staff_or_admin)],
)
async def update_handover_status(
    conv_id: uuid.UUID,
    payload: WhatsAppHandoverUpdate,
    service: WhatsAppService = Depends(get_whatsapp_service),
):
    """Toggles conversation status between automated BOT and HUMAN_AGENT handover."""
    c = await service.update_handover_status(conv_id, payload.status, payload.notes)
    return ResponseEnvelope(
        data=WhatsAppConversationResponse(
            id=c.id,
            phone_number=c.phone_number,
            customer_id=c.customer_id,
            customer_name=c.customer_name,
            status=c.status,
            last_message_at=c.last_message_at,
            unread_admin_count=c.unread_admin_count,
            notes=c.notes,
            created_at=c.created_at,
        )
    )


# 5. Message Audit Logs
@router.get(
    "/messages",
    response_model=ResponseEnvelope[List[WhatsAppMessageResponse]],
    dependencies=[Depends(require_staff_or_admin)],
)
async def list_messages(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    service: WhatsAppService = Depends(get_whatsapp_service),
):
    """Paginated list of all inbound and outbound WhatsApp messages and delivery statuses."""
    msgs, total = await service.list_messages(page=page, page_size=page_size)
    dtos = [
        WhatsAppMessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            wamid=m.wamid,
            direction=m.direction,
            message_type=m.message_type,
            sender_phone=m.sender_phone,
            recipient_phone=m.recipient_phone,
            content=m.content,
            template_name=m.template_name,
            status=m.status,
            error_code=m.error_code,
            error_description=m.error_description,
            created_at=m.created_at,
        )
        for m in msgs
    ]
    return ResponseEnvelope(
        data=dtos,
        meta={"page": page, "page_size": page_size, "total": total},
    )

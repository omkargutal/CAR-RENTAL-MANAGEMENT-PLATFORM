from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.modules.auth.router import router as auth_router
from app.modules.availability.router import router as availability_router
from app.modules.bookings.router import router as bookings_router
from app.modules.customers.router import router as customers_router
from app.modules.locations.router import router as locations_router
from app.modules.notifications.router import router as notifications_router
from app.modules.payments.router import router as payments_router
from app.modules.reports.router import router as reports_router
from app.modules.reviews.router import router as reviews_router
from app.modules.settings.router import router as settings_router
from app.modules.testimonials.router import router as testimonials_router
from app.modules.users.router import router as users_router
from app.modules.vehicles.router import router as vehicles_router
from app.modules.whatsapp.router import router as whatsapp_router

api_v1_router = APIRouter()

# Core Health & System check
api_v1_router.include_router(health_router)

# Independently organized business modules
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(locations_router)
api_v1_router.include_router(vehicles_router)
api_v1_router.include_router(customers_router)
api_v1_router.include_router(bookings_router)
api_v1_router.include_router(availability_router)
api_v1_router.include_router(payments_router)
api_v1_router.include_router(notifications_router)
api_v1_router.include_router(whatsapp_router)
api_v1_router.include_router(reviews_router)
api_v1_router.include_router(testimonials_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(settings_router)

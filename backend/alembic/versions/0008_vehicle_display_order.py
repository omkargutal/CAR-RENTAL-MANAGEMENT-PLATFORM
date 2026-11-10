"""vehicle display order, seating capacity sequence, and fleet update

Revision ID: 0008_vehicle_display_order_and_fleet_update
Revises: 0007_whatsapp_integration
Create Date: 2026-11-03 12:15:00.000000

"""
import json
from typing import Sequence, Union
import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0008_vehicle_display_order"
down_revision: Union[str, None] = "0007_whatsapp_integration"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The 10 canonical vehicles in required seating capacity sequence:
VEHICLES_FLEET = [
    {
        "id": "1f441ca8-781f-4332-a05f-e024620dacd6",
        "make": "Mahindra",
        "model": "Thar 4x4",
        "category": "SUV",
        "seats": 4,
        "sort_order": 1,
        "fuel_type": "DIESEL",
        "transmission": "MANUAL",
        "doors": 3,
        "suitcases": 2,
        "daily_rate": 65.00,
        "image_url": "/assets/vehicles/mahindra-thar/mahindra-thar-4x4.png",
        "description": "Iconic 4x4 off-road SUV built for rugged terrain, adventure road trips, and modern highway touring.",
        "features": ["4x4 All-Wheel Drive", "Removable Hardtop", "Touchscreen Infotainment", "All-Terrain Tyres", "Cruise Control"],
        "specs": {
            "seating_capacity_label": "4 Seater",
            "engine": "2.2L mHawk Turbo Diesel",
            "power": "130 bhp",
            "drivetrain": "4x4 with Low Ratio",
        },
    },
    {
        "id": "9aeadbf8-ef83-4a55-9a5c-b3d31dac341c",
        "make": "Hyundai",
        "model": "Aura",
        "category": "SEDAN",
        "seats": 5,
        "sort_order": 2,
        "fuel_type": "GASOLINE",
        "transmission": "MANUAL",
        "doors": 4,
        "suitcases": 2,
        "daily_rate": 35.00,
        "image_url": "/assets/vehicles/hyundai-aura/hyundai-aura.png",
        "description": "Compact and fuel-efficient premium sedan ideal for city commutes, business trips, and comfortable family journeys.",
        "features": ["Apple CarPlay & Android Auto", "Wireless Phone Charger", "Rear AC Vents", "Cruise Control", "High Fuel Economy"],
        "specs": {
            "seating_capacity_label": "5 Seater",
            "engine": "1.2L Kappa Dual VTVT",
            "power": "82 bhp",
            "boot_space": "402 Litres",
        },
    },
    {
        "id": "7c5262ae-cec8-4ccf-a6ff-9d42d4276354",
        "make": "Maruti Suzuki",
        "model": "White Dzire",
        "category": "SEDAN",
        "seats": 5,
        "sort_order": 3,
        "fuel_type": "GASOLINE",
        "transmission": "MANUAL",
        "doors": 4,
        "suitcases": 2,
        "daily_rate": 38.00,
        "image_url": "/assets/vehicles/maruti-suzuki-dzire/white-maruti-suzuki-dzire.png",
        "description": "India's most popular executive sedan in pure Arctic White. Unbeatable fuel efficiency, generous legroom, and refined comfort.",
        "features": ["Keyless Push Start", "SmartPlay Pro Infotainment", "Automatic Climate Control", "LED Projector Headlamps", "Rear Armrest with Cupholders"],
        "specs": {
            "seating_capacity_label": "5 Seater",
            "engine": "1.2L DualJet Dual VVT",
            "power": "89 bhp",
            "boot_space": "378 Litres",
        },
    },
    {
        "id": "303216c5-bf92-4b4b-bd67-8520134c8d32",
        "make": "Maruti Suzuki",
        "model": "Ertiga",
        "category": "VAN",
        "seats": 7,
        "sort_order": 4,
        "fuel_type": "GASOLINE",
        "transmission": "MANUAL",
        "doors": 4,
        "suitcases": 3,
        "daily_rate": 52.00,
        "image_url": "/assets/vehicles/maruti-suzuki-ertiga/maruti-suzuki-ertiga.png",
        "description": "Ergonomic 7-seater MPV offering flexible row arrangements, dual-blower air conditioning, and supreme highway efficiency.",
        "features": ["7-Seater Flexi Seating", "Roof-Mounted Rear AC", "Smart Hybrid Technology", "Paddle Shifters", "Cooled Cupholders"],
        "specs": {
            "seating_capacity_label": "7 Seater",
            "engine": "1.5L K15C Smart Hybrid",
            "power": "102 bhp",
            "fuel_efficiency": "20.5 km/l",
        },
    },
    {
        "id": "95c64444-b520-4ff3-8a80-daa4c15274d3",
        "make": "Toyota",
        "model": "Innova Crysta",
        "category": "VAN",
        "seats": 7,
        "sort_order": 5,
        "fuel_type": "DIESEL",
        "transmission": "AUTOMATIC",
        "doors": 4,
        "suitcases": 4,
        "daily_rate": 75.00,
        "image_url": "/assets/vehicles/toyota-innova-crysta/toyota-innova-crysta.png",
        "description": "The gold standard in luxury group travel. Captain seats, commanding ride height, and legendary Toyota reliability.",
        "features": ["Captain Seat Configuration", "Ambient Mood Lighting", "8-Way Power Driver Seat", "Triple Zone Climate Control", "Hill Start Assist Control"],
        "specs": {
            "seating_capacity_label": "7 Seater",
            "engine": "2.4L GD Turbo Diesel",
            "power": "148 bhp",
            "torque": "343 Nm",
        },
    },
    {
        "id": "8e853f79-935d-4e96-b24a-9955668199fa",
        "make": "Toyota",
        "model": "Innova (7+1)",
        "category": "VAN",
        "seats": 8,
        "sort_order": 6,
        "fuel_type": "DIESEL",
        "transmission": "MANUAL",
        "doors": 4,
        "suitcases": 4,
        "daily_rate": 68.00,
        "image_url": "/assets/vehicles/toyota-innova/toyota-innova-7-plus-1.png",
        "description": "The dependable 7+1 passenger carrier. Designed for outstation tours, airport group transfers, and long-distance road trips.",
        "features": ["7+1 Seating Layout", "Dual Air Conditioning", "Power Windows on All Doors", "Spacious Luggage Area", "Foldable 3rd Row"],
        "specs": {
            "seating_capacity_label": "7+1 Seater",
            "engine": "2.5L D-4D Turbo Diesel",
            "power": "101 bhp",
            "payload_capacity": "650 kg",
        },
    },
    {
        "id": "4ad15c6e-6e2d-40db-9a98-0ec35645e584",
        "make": "Mahindra",
        "model": "Scorpio (8+1)",
        "category": "SUV",
        "seats": 9,
        "sort_order": 7,
        "fuel_type": "DIESEL",
        "transmission": "MANUAL",
        "doors": 5,
        "suitcases": 4,
        "daily_rate": 62.00,
        "image_url": "/assets/vehicles/mahindra-scorpio/mahindra-scorpio-8-plus-1.png",
        "description": "Muscular 8+1 passenger SUV engineered to conquer steep hill climbs, rugged country roads, and challenging cross-country routes.",
        "features": ["8+1 Seating Configuration", "High Ground Clearance (209mm)", "Hydraulic Power Steering", "Rear Footstep Access", "Heavy Duty Suspension"],
        "specs": {
            "seating_capacity_label": "8+1 Seater",
            "engine": "2.2L mHawk CRDe Diesel",
            "power": "130 bhp",
            "ground_clearance": "209 mm",
        },
    },
    {
        "id": "40641d65-175d-4296-8000-1caf1836c093",
        "make": "Chevrolet",
        "model": "Tavera (8+1)",
        "category": "VAN",
        "seats": 9,
        "sort_order": 8,
        "fuel_type": "DIESEL",
        "transmission": "MANUAL",
        "doors": 4,
        "suitcases": 4,
        "daily_rate": 55.00,
        "image_url": "/assets/vehicles/tavera/tavera-8-plus-1.png",
        "description": "Rugged, cost-effective 8+1 utility vehicle offering unmatched interior volume and comfortable seating for large groups on budget tours.",
        "features": ["8+1 Passenger Capacity", "Roof Luggage Carrier Compatible", "Side-Facing Rear Benches", "Independent Front Suspension", "Dual Blower AC"],
        "specs": {
            "seating_capacity_label": "8+1 Seater",
            "engine": "2.5L Direct Injection Turbo Diesel",
            "power": "78 bhp",
            "turning_radius": "5.2 m",
        },
    },
    {
        "id": "462320d4-ec6c-4b40-96bd-97f119349ebe",
        "make": "Force",
        "model": "Traveller Van (12–20)",
        "category": "VAN",
        "seats": 12,
        "sort_order": 9,
        "fuel_type": "DIESEL",
        "transmission": "MANUAL",
        "doors": 3,
        "suitcases": 8,
        "daily_rate": 95.00,
        "image_url": "/assets/vehicles/traveller-van/traveller-van-12-20.png",
        "description": "Spacious luxury mini-bus for group vacations, pilgrimage tours, corporate outings, and wedding guest transportation with high ceiling aisle.",
        "features": ["12–20 Adjustable Pushback Seats", "Individual Reading Lights & AC Vents", "High Roof Stand-Up Aisle", "Large Dedicated Luggage Boot", "PA System & Mic"],
        "specs": {
            "seating_capacity_label": "12–20 Seater",
            "engine": "2.6L FM 2.6 CR ED Turbo Diesel",
            "power": "115 bhp",
            "wheelbase": "3350 mm",
        },
    },
    {
        "id": "6b3bc4be-7b11-4fe5-bffe-aaab27a4eac9",
        "make": "BharatBenz",
        "model": "Luxury Coach Bus (31–40)",
        "category": "VAN",
        "seats": 31,
        "sort_order": 10,
        "fuel_type": "DIESEL",
        "transmission": "MANUAL",
        "doors": 2,
        "suitcases": 25,
        "daily_rate": 220.00,
        "image_url": "/assets/vehicles/luxury-coach-bus/luxury-coach-bus-31-40.png",
        "description": "Intercity executive luxury coach for grand corporate retreats, tourist expeditions, and large tour delegations. Air suspension and reclining push-back seating.",
        "features": ["31–40 Reclining Calf-Support Seats", "Full Pneumatic Air Suspension", "Under-Floor Luggage Hold", "High Definition Entertainment Screens", "On-board USB Charging Ports"],
        "specs": {
            "seating_capacity_label": "31–40 Seater",
            "engine": "4.2L 4D34i Turbocharged Intercooled",
            "power": "170 bhp",
            "suspension": "Full Air Suspension",
        },
    },
]


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Add sort_order column to vehicles table if not exists
    res = conn.execute(sa.text("""
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'sort_order'
    """)).scalar()

    if not res:
        op.add_column("vehicles", sa.Column("sort_order", sa.Integer(), nullable=False, server_default="100"))
        op.create_index("ix_vehicles_sort_order", "vehicles", ["sort_order"])

    # 2. Update the 10 canonical vehicles
    canonical_ids = []
    for veh in VEHICLES_FLEET:
        v_id = veh["id"]
        canonical_ids.append(f"'{v_id}'")

        features_json = json.dumps(veh["features"])
        specs_json = json.dumps(veh["specs"])

        conn.execute(sa.text(f"""
            UPDATE vehicles SET
                make = :make,
                model = :model,
                category = :category,
                seats = :seats,
                sort_order = :sort_order,
                fuel_type = :fuel_type,
                transmission = :transmission,
                doors = :doors,
                suitcases = :suitcases,
                daily_rate = :daily_rate,
                weekly_rate = :weekly_rate,
                monthly_rate = :monthly_rate,
                image_url = :image_url,
                description = :description,
                features = '{features_json}'::jsonb,
                specs = '{specs_json}'::jsonb,
                status = 'AVAILABLE',
                is_deleted = false
            WHERE id = '{v_id}';
        """), {
            "make": veh["make"],
            "model": veh["model"],
            "category": veh["category"],
            "seats": veh["seats"],
            "sort_order": veh["sort_order"],
            "fuel_type": veh["fuel_type"],
            "transmission": veh["transmission"],
            "doors": veh["doors"],
            "suitcases": veh["suitcases"],
            "daily_rate": veh["daily_rate"],
            "weekly_rate": round(veh["daily_rate"] * 6, 2),
            "monthly_rate": round(veh["daily_rate"] * 22, 2),
            "image_url": veh["image_url"],
            "description": veh["description"],
        })

        # Update or insert primary image in vehicle_images
        conn.execute(sa.text(f"DELETE FROM vehicle_images WHERE vehicle_id = '{v_id}';"))
        conn.execute(sa.text(f"""
            INSERT INTO vehicle_images (id, vehicle_id, url, is_primary, display_order, caption, created_at)
            VALUES (gen_random_uuid(), '{v_id}', :image_url, true, 0, :caption, now());
        """), {
            "image_url": veh["image_url"],
            "caption": f"{veh['make']} {veh['model']} Exterior",
        })

    # 3. Soft-delete the remaining vehicles so only the 10 canonical vehicles appear in active queries
    id_list = ",".join(canonical_ids)
    conn.execute(sa.text(f"""
        UPDATE vehicles 
        SET is_deleted = true, sort_order = 999
        WHERE id NOT IN ({id_list});
    """))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE vehicles SET is_deleted = false;"))
    op.drop_index("ix_vehicles_sort_order", "vehicles")
    op.drop_column("vehicles", "sort_order")

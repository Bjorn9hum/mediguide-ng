from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai
import os
import json
import requests
import math

load_dotenv()


# =================================
# Gemini AI
# =================================

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


# =================================
# FastAPI App
# =================================

app = FastAPI(
    title="MediGuide NG",
    description="AI-powered healthcare navigation assistant",
    version="1.0.0"
)


# =================================
# CORS
# =================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =================================
# Request Models
# =================================

class SymptomRequest(BaseModel):
    symptoms: str


class HealthcareSearchRequest(BaseModel):
    location: str = ""
    service: str
    latitude: float | None = None
    longitude: float | None = None


# =================================
# Health Check
# =================================

@app.get("/health")
async def health_check():

    return {
        "status": "healthy",
        "service": "MediGuide NG"
    }


# =================================
# AI HEALTH GUIDANCE
# =================================

@app.post("/api/guidance")
async def get_guidance(
    request: SymptomRequest
):

    symptoms = request.symptoms.strip()

    if not symptoms:

        return {
            "success": False,
            "message": "Please describe what you are experiencing."
        }

    try:

        response = client.models.generate_content(

            model="gemini-3.6-flash",

            contents=f"""
You are MediGuide NG, a healthcare navigation assistant.

The user described:

{symptoms}

Provide general health information only.
Do NOT diagnose the user.

Choose exactly ONE urgency level:

- Emergency
- Urgent
- Routine

Emergency means symptoms may require immediate medical attention.

Urgent means the person should seek medical attention soon.

Routine means there are no obvious emergency warning signs
from the information provided.

Return ONLY valid JSON in this exact structure:

{{
    "urgency": "Emergency",
    "guidance": "Your general health guidance here.",
    "warning": "When the person should seek urgent medical attention."
}}

Safety rules:

- Never diagnose a disease.
- Never claim certainty.
- Do not prescribe medication.
- Do not give dangerous treatment instructions.
- If emergency warning signs are present, clearly say to seek
  immediate medical attention.
- Keep the language simple and easy to understand.
"""
        )

        raw_text = response.text.strip()

        if raw_text.startswith("```"):

            raw_text = (
                raw_text
                .replace("```json", "")
                .replace("```", "")
                .strip()
            )

        result = json.loads(raw_text)

        return {
            "success": True,
            "urgency": result.get(
                "urgency",
                "Routine"
            ),
            "message": result.get(
                "guidance",
                ""
            ),
            "warning": result.get(
                "warning",
                ""
            )
        }

    except Exception as error:

        print(
            "Gemini error:",
            error
        )

        return {
            "success": False,
            "message": (
                "Sorry, MediGuide NG could not process "
                "your request right now. Please try again."
            )
        }


# =================================
# DISTANCE CALCULATION
# =================================

def calculate_distance(
    lat1,
    lon1,
    lat2,
    lon2
):

    earth_radius_km = 6371.0

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)

    delta_lat = math.radians(
        lat2 - lat1
    )

    delta_lon = math.radians(
        lon2 - lon1
    )

    a = (
        math.sin(delta_lat / 2) ** 2
        +
        math.cos(lat1_rad)
        *
        math.cos(lat2_rad)
        *
        math.sin(delta_lon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return earth_radius_km * c


# =================================
# HEALTHCARE FACILITY SEARCH
# =================================

@app.post("/api/healthcare-search")
async def healthcare_search(
    request: HealthcareSearchRequest
):

    location = request.location.strip()
    service = request.service.strip().lower()

    # =================================
    # Determine Search Coordinates
    # =================================

    try:

        # ---------------------------------
        # GPS SEARCH
        # ---------------------------------

        if (
            request.latitude is not None
            and request.longitude is not None
        ):

            search_latitude = float(
                request.latitude
            )

            search_longitude = float(
                request.longitude
            )

            search_source = "gps"

        # ---------------------------------
        # MANUAL LOCATION SEARCH
        # ---------------------------------

        else:

            if not location:

                return {
                    "success": False,
                    "message": (
                        "Please enter a city or area."
                    )
                }

            geocode_url = (
                "https://nominatim.openstreetmap.org/search"
            )

            geocode_params = {
                "q": f"{location}, Nigeria",
                "format": "json",
                "limit": 1
            }

            headers = {
                "User-Agent": "MediGuide-NG/1.0"
            }

            geocode_response = requests.get(
                geocode_url,
                params=geocode_params,
                headers=headers,
                timeout=10
            )

            geocode_response.raise_for_status()

            geocode_data = (
                geocode_response.json()
            )

            if not geocode_data:

                return {
                    "success": False,
                    "message": (
                        f"We could not find the location "
                        f"'{location}'."
                    )
                }

            search_latitude = float(
                geocode_data[0]["lat"]
            )

            search_longitude = float(
                geocode_data[0]["lon"]
            )

            search_source = "manual"

        # =================================
        # Determine Healthcare Category
        # =================================

        if "pharmacy" in service:

            category = "amenity=pharmacy"

        elif "lab" in service:

            category = "healthcare=laboratory"

        elif (
            "hospital" in service
            or "clinic" in service
            or "care" in service
        ):

            category = "amenity=hospital"

        else:

            category = "amenity=hospital"

        # =================================
        # OpenStreetMap / Overpass
        # =================================

        overpass_url = (
            "https://overpass-api.de/api/interpreter"
        )

        query = f"""
        [out:json][timeout:20];

        (
            node[{category}](
                around:10000,
                {search_latitude},
                {search_longitude}
            );

            way[{category}](
                around:10000,
                {search_latitude},
                {search_longitude}
            );
        );

        out center tags;
        """

        headers = {
            "User-Agent": "MediGuide-NG/1.0"
        }

        overpass_response = requests.post(
            overpass_url,
            data=query,
            headers=headers,
            timeout=30
        )

        overpass_response.raise_for_status()

        data = overpass_response.json()

        # =================================
        # Format Facilities
        # =================================

        facilities = []

        for element in data.get(
            "elements",
            []
        ):

            tags = element.get(
                "tags",
                {}
            )

            name = tags.get(
                "name",
                "Healthcare Facility"
            )

            # ---------------------------------
            # Facility Coordinates
            # ---------------------------------

            if element.get("type") == "node":

                facility_latitude = element.get(
                    "lat"
                )

                facility_longitude = element.get(
                    "lon"
                )

            else:

                center = element.get(
                    "center",
                    {}
                )

                facility_latitude = center.get(
                    "lat"
                )

                facility_longitude = center.get(
                    "lon"
                )

            # ---------------------------------
            # Address
            # ---------------------------------

            address_parts = []

            for key in [
                "addr:housenumber",
                "addr:street",
                "addr:city"
            ]:

                if tags.get(key):

                    address_parts.append(
                        tags[key]
                    )

            address = ", ".join(
                address_parts
            )

            # ---------------------------------
            # Contact
            # ---------------------------------

            phone = tags.get(
                "phone",
                tags.get(
                    "contact:phone",
                    ""
                )
            )

            website = tags.get(
                "website",
                tags.get(
                    "contact:website",
                    ""
                )
            )

            # =================================
            # TRUE GPS DISTANCE
            # =================================

            distance_km = None

            if (
                facility_latitude is not None
                and facility_longitude is not None
            ):

                distance_km = calculate_distance(
                    search_latitude,
                    search_longitude,
                    float(facility_latitude),
                    float(facility_longitude)
                )

            facilities.append({

                "name": name,

                "address": address,

                "phone": phone,

                "website": website,

                "latitude": facility_latitude,

                "longitude": facility_longitude,

                "distance_km": distance_km

            })

        # =================================
        # Sort Nearest First
        # =================================

        facilities.sort(
            key=lambda facility:
                facility["distance_km"]
                if facility["distance_km"]
                is not None
                else float("inf")
        )

        # =================================
        # Limit Results
        # =================================

        facilities = facilities[:20]

        return {

            "success": True,

            "location": (
                location
                if location
                else "Your current location"
            ),

            "service": service,

            "search_source": search_source,

            "latitude": search_latitude,

            "longitude": search_longitude,

            "count": len(facilities),

            "facilities": facilities

        }

    except requests.exceptions.RequestException as error:

        print(
            "Healthcare search error:",
            error
        )

        return {

            "success": False,

            "message": (
                "The healthcare directory is temporarily "
                "unavailable. Please try again."
            )

        }

    except Exception as error:

        print(
            "Unexpected healthcare search error:",
            error
        )

        return {

            "success": False,

            "message": (
                "Something went wrong while searching "
                "for healthcare facilities."
            )

        }
# Serve MediGuide NG frontend
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app.mount(
    "/",
    StaticFiles(
        directory=FRONTEND_DIR,
        html=True
    ),
    name="frontend"
)

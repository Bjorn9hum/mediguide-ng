from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai

import os
import json
import requests
import math


# ==========================================
# ENVIRONMENT
# ==========================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)

load_dotenv(
    os.path.join(BASE_DIR, ".env")
)


# ==========================================
# GEMINI CLIENT
# ==========================================

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


# ==========================================
# FASTAPI APP
# ==========================================

app = FastAPI(
    title="MediGuide NG",
    description="AI-powered healthcare navigation assistant",
    version="1.0.0"
)


# ==========================================
# FRONTEND
# ==========================================

@app.get("/")
async def serve_frontend():
    return FileResponse(
        os.path.join(PROJECT_DIR, "index.html")
    )


@app.get("/favicon.ico")
async def favicon():
    return FileResponse(
        os.path.join(PROJECT_DIR, "favicon.ico")
    )


app.mount(
    "/css",
    StaticFiles(
        directory=os.path.join(PROJECT_DIR, "css")
    ),
    name="css"
)

app.mount(
    "/js",
    StaticFiles(
        directory=os.path.join(PROJECT_DIR, "js")
    ),
    name="js"
)


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://mediguide-ng.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ==========================================
# HEALTH CHECK
# ==========================================

@app.get("/health")
async def health_check():

    return {
        "status": "healthy",
        "service": "MediGuide NG"
    }


# ==========================================
# REQUEST MODELS
# ==========================================

class SymptomRequest(BaseModel):

    symptoms: str


class HealthcareSearchRequest(BaseModel):

    location: str = ""

    service: str

    latitude: float | None = None

    longitude: float | None = None


# ==========================================
# AI HEALTH GUIDANCE
# ==========================================

@app.post("/api/guidance")
async def get_guidance(
    request: SymptomRequest
):

    symptoms = request.symptoms.strip()

    if not symptoms:

        return {
            "success": False,
            "message": "Please enter your symptoms."
        }

    try:

        response = client.models.generate_content(

            model="gemini-3.6-flash",

            contents=f"""
You are MediGuide NG, a healthcare guidance assistant.

The user has described these symptoms:

{symptoms}

Provide general health information only.

IMPORTANT:
- Do NOT diagnose the user.
- Do NOT claim certainty about a medical condition.
- Encourage professional medical care when appropriate.
- Clearly identify emergency situations.
- Keep the response practical and easy to understand.

Return ONLY valid JSON using exactly this structure:

{{
    "urgency": "Emergency" or "Urgent" or "Routine",
    "guidance": "General health guidance",
    "warning": "When the person should seek medical attention"
}}
"""
        )

        raw_text = response.text.strip()

        if raw_text.startswith("```json"):

            raw_text = raw_text[
                7:
            ]

        if raw_text.endswith("```"):

            raw_text = raw_text[
                :-3
            ]

        raw_text = raw_text.strip()

        result = json.loads(
            raw_text
        )

        return {

            "success": True,

            "urgency": result.get(
                "urgency",
                "Routine"
            ),

            "message": result.get(
                "guidance",
                "Please consult a healthcare professional for appropriate advice."
            ),

            "warning": result.get(
                "warning",
                "Seek medical attention if symptoms worsen or become concerning."
            )
        }

    except Exception as e:

        print(
            "AI guidance error:",
            str(e)
        )

        return {

            "success": False,

            "message": (
                "The healthcare guidance service "
                "is temporarily unavailable. "
                "Please try again."
            )
        }


# ==========================================
# DISTANCE CALCULATION
# ==========================================

def calculate_distance(
    lat1,
    lon1,
    lat2,
    lon2
):

    earth_radius = 6371

    lat1_rad = math.radians(
        lat1
    )

    lat2_rad = math.radians(
        lat2
    )

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

    c = (
        2
        *
        math.atan2(
            math.sqrt(a),
            math.sqrt(1 - a)
        )
    )

    return earth_radius * c


# ==========================================
# HEALTHCARE SEARCH
# ==========================================

@app.post("/api/healthcare-search")
async def healthcare_search(
    request: HealthcareSearchRequest
):

    location = request.location.strip()

    service = request.service.lower().strip()

    try:

        # ==================================
        # DETERMINE SEARCH LOCATION
        # ==================================

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

        else:

            if not location:

                return {

                    "success": False,

                    "message": (
                        "Please enter a city or area."
                    )
                }

            # ==================================
            # NOMINATIM LOCATION GEOCODING
            # ==================================

            geocode_url = (
                "https://nominatim.openstreetmap.org/search"
            )

            geocode_params = {

                "q": f"{location}, Nigeria",

                "format": "json",

                "limit": 1

            }

            headers = {

                "User-Agent":
                    "MediGuide-NG/1.0"
            }

            geocode_response = requests.get(

                geocode_url,

                params=geocode_params,

                headers=headers,

                timeout=15
            )

            geocode_response.raise_for_status()

            geocode_data = (
                geocode_response.json()
            )

            if not geocode_data:

                return {

                    "success": False,

                    "message": (
                        f"We could not find the "
                        f"location '{location}'."
                    )
                }

            search_latitude = float(
                geocode_data[0]["lat"]
            )

            search_longitude = float(
                geocode_data[0]["lon"]
            )

            search_source = "manual"

        # ==================================
        # DETERMINE HEALTHCARE TYPE
        # ==================================

        if "pharmacy" in service:

            search_query = "pharmacy"

        elif (
            "lab" in service
            or "laboratory" in service
        ):

            search_query = (
                "medical laboratory"
            )

        elif (
            "emergency" in service
            or "hospital" in service
            or "clinic" in service
            or "care" in service
        ):

            search_query = "hospital"

        else:

            search_query = "hospital"

        # ==================================
        # NOMINATIM HEALTHCARE SEARCH
        # ==================================

        nominatim_url = (
            "https://nominatim.openstreetmap.org/search"
        )

        # Approximately 10km around location.
        # 0.10 degrees is roughly 11km.
        lat_offset = 0.10
        lon_offset = 0.10

        west = (
            search_longitude
            - lon_offset
        )

        north = (
            search_latitude
            + lat_offset
        )

        east = (
            search_longitude
            + lon_offset
        )

        south = (
            search_latitude
            - lat_offset
        )

        viewbox = (
            f"{west},{north},{east},{south}"
        )

        search_params = {

            "q": search_query,

            "format": "json",

            "limit": 50,

            "viewbox": viewbox,

            "bounded": 1,

            "addressdetails": 1,

            "extratags": 1
        }

        headers = {

            "User-Agent":
                "MediGuide-NG/1.0"
        }

        search_response = requests.get(

            nominatim_url,

            params=search_params,

            headers=headers,

            timeout=20
        )

        search_response.raise_for_status()

        data = search_response.json()

        # ==================================
        # FORMAT FACILITIES
        # ==================================

        facilities = []

        for element in data:

            name = element.get(
                "name"
            )

            if not name:

                name = "Healthcare Facility"

            latitude = element.get(
                "lat"
            )

            longitude = element.get(
                "lon"
            )

            if (
                latitude is None
                or longitude is None
            ):

                continue

            facility_latitude = float(
                latitude
            )

            facility_longitude = float(
                longitude
            )

            # ==================================
            # DISTANCE
            # ==================================

            distance_km = calculate_distance(

                search_latitude,

                search_longitude,

                facility_latitude,

                facility_longitude
            )

            # Keep facilities within 10km
            if distance_km > 10:

                continue

            # ==================================
            # ADDRESS
            # ==================================

            address = element.get(
                "display_name",
                ""
            )

            address_data = element.get(
                "address",
                {}
            )

            if address_data:

                readable_parts = []

                for key in [

                    "house_number",

                    "road",

                    "suburb",

                    "city",

                    "state"

                ]:

                    value = address_data.get(
                        key
                    )

                    if value:

                        readable_parts.append(
                            value
                        )

                if readable_parts:

                    address = ", ".join(
                        readable_parts
                    )

            # ==================================
            # CONTACT INFORMATION
            # ==================================

            extra_tags = element.get(
                "extratags",
                {}
            )

            phone = extra_tags.get(
                "phone",
                extra_tags.get(
                    "contact:phone",
                    ""
                )
            )

            website = extra_tags.get(
                "website",
                extra_tags.get(
                    "contact:website",
                    ""
                )
            )

            facilities.append({

                "name": name,

                "address": address,

                "phone": phone,

                "website": website,

                "latitude":
                    facility_latitude,

                "longitude":
                    facility_longitude,

                "distance_km":
                    round(
                        distance_km,
                        2
                    )
            })

        # ==================================
        # SORT BY DISTANCE
        # ==================================

        facilities.sort(
            key=lambda item:
                item["distance_km"]
                if item["distance_km"]
                is not None
                else 999999
        )

        # Return maximum 20
        facilities = facilities[:20]

        # ==================================
        # NO RESULTS
        # ==================================

        if not facilities:

            return {

                "success": True,

                "source": search_source,

                "count": 0,

                "facilities": [],

                "message": (
                    f"No {search_query} facilities "
                    f"were found within approximately "
                    f"10km of the selected location."
                )
            }

        # ==================================
        # SUCCESS
        # ==================================

        return {

            "success": True,

            "source": search_source,

            "count": len(
                facilities
            ),

            "facilities": facilities
        }

    except requests.exceptions.Timeout:

        print(
            "Healthcare search timed out."
        )

        return {

            "success": False,

            "message": (
                "The healthcare search took "
                "too long to respond. "
                "Please try again."
            )
        }

    except requests.exceptions.RequestException as e:

        print(
            "Healthcare search network error:",
            str(e)
        )

        return {

            "success": False,

            "message": (
                "The healthcare search service "
                "is temporarily unavailable. "
                "Please try again."
            )
        }

    except Exception as e:

        print(
            "Healthcare search error:",
            str(e)
        )

        return {

            "success": False,

            "message": (
                "We could not complete the "
                "healthcare search. "
                "Please try again."
            )
        }


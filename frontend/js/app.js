alert("MediGuide JavaScript loaded!");

const getStartedButton = document.querySelector("#getStartedBtn");
const analyzeButton = document.querySelector("#analyzeBtn");
const symptomInput = document.querySelector("#symptomInput");
const guidanceResult = document.querySelector("#guidanceResult");


// =================================
// Get Started
// =================================

getStartedButton.addEventListener("click", () => {

    symptomInput.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    symptomInput.focus();

});


// =================================
// AI Health Guidance
// =================================

analyzeButton.addEventListener("click", async () => {

    const symptoms = symptomInput.value.trim();

    if (!symptoms) {

        guidanceResult.innerHTML = `
            <p>Please describe what you're experiencing first.</p>
        `;

        return;
    }

    guidanceResult.innerHTML = `
        <p>Analyzing your information...</p>
    `;

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/api/guidance",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    symptoms: symptoms
                })
            }
        );

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        let urgencyClass = "routine";
        let urgencyIcon = "🟢";

        if (data.urgency === "Urgent") {

            urgencyClass = "urgent";
            urgencyIcon = "🟠";

        }

        if (data.urgency === "Emergency") {

            urgencyClass = "emergency";
            urgencyIcon = "🔴";

        }

        guidanceResult.innerHTML = `
            <div class="guidance-card ${urgencyClass}">

                <div class="urgency">
                    ${urgencyIcon}
                    ${escapeHTML(data.urgency)}
                </div>

                <h3>General Guidance</h3>

                <p>
                    ${escapeHTML(data.message)}
                </p>

                <div class="warning">

                    <strong>
                        When to seek medical attention
                    </strong>

                    <p>
                        ${escapeHTML(data.warning)}
                    </p>

                </div>

                <small>
                    MediGuide NG provides general health information.
                    This is not a medical diagnosis.
                </small>

            </div>
        `;

    } catch (error) {

        console.error("Guidance error:", error);

        guidanceResult.innerHTML = `
            <div class="guidance-card">

                <h3>Connection Error</h3>

                <p>
                    MediGuide NG could not process your request right now.
                    Please try again.
                </p>

            </div>
        `;
    }

});


// =================================
// Healthcare Service Buttons
// =================================

const serviceButtons =
    document.querySelectorAll(".service-btn");

serviceButtons.forEach((button) => {

    button.addEventListener("click", () => {

        const service =
            button.dataset.service;

        if (service === "Emergency Care") {

            showEmergencyPanel();

            return;
        }

        if (service === "Hospitals & Clinics") {

            showHealthcareSearch(
                "Hospitals & Clinics",
                "Find hospitals and clinics in your area.",
                "🏥"
            );

            return;
        }

        if (service === "Pharmacies") {

            showHealthcareSearch(
                "Pharmacies",
                "Find pharmacies in your area.",
                "💊"
            );

            return;
        }

        if (service === "Laboratories") {

            showHealthcareSearch(
                "Laboratories",
                "Find laboratory services in your area.",
                "🧪"
            );

        }

    });

});


// =================================
// Use My Location Buttons
// =================================

const locationButtons =
    document.querySelectorAll(".location-btn");

locationButtons.forEach((button) => {

    button.addEventListener("click", () => {

        const service =
            button.dataset.service;

        if (service === "Emergency Care") {

            useMyLocationForEmergency();

            return;
        }

        if (service === "Hospitals & Clinics") {

            showHealthcareSearchWithLocation(
                "Hospitals & Clinics",
                "Find hospitals and clinics near your current location.",
                "🏥"
            );

            return;
        }

        if (service === "Pharmacies") {

            showHealthcareSearchWithLocation(
                "Pharmacies",
                "Find pharmacies near your current location.",
                "💊"
            );

            return;
        }

        if (service === "Laboratories") {

            showHealthcareSearchWithLocation(
                "Laboratories",
                "Find laboratory services near your current location.",
                "🧪"
            );

        }

    });

});


// =================================
// Standard Healthcare Search Panel
// =================================

function showHealthcareSearch(
    serviceName,
    description,
    icon
) {

    const existingPanel =
        document.querySelector("#healthcareSearchPanel");

    if (existingPanel) {
        existingPanel.remove();
    }

    const panel =
        document.createElement("section");

    panel.id = "healthcareSearchPanel";

    panel.innerHTML = `
        <div class="healthcare-search-card">

            <button
                class="close-search"
                type="button"
                aria-label="Close"
            >
                ×
            </button>

            <div class="search-icon">
                ${icon}
            </div>

            <span class="section-label">
                Healthcare Finder
            </span>

            <h2>
                Find ${escapeHTML(serviceName)}
            </h2>

            <p>
                ${escapeHTML(description)}
            </p>

            <label for="healthcareLocation">
                Your city or area
            </label>

            <input
                id="healthcareLocation"
                type="text"
                placeholder="Example: Onitsha"
            >

            <button
                id="searchHealthcareBtn"
                type="button"
            >
                Find ${escapeHTML(serviceName)} →
            </button>

            <button
                id="panelUseLocationBtn"
                class="location-panel-btn"
                type="button"
            >
                📍 Use My Location
            </button>

            <div id="healthcareResults"></div>

        </div>
    `;

    document
        .querySelector(".services-section")
        .after(panel);

    panel.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    const closeButton =
        panel.querySelector(".close-search");

    const searchButton =
        panel.querySelector("#searchHealthcareBtn");

    const useLocationButton =
        panel.querySelector("#panelUseLocationBtn");

    const locationInput =
        panel.querySelector("#healthcareLocation");

    const results =
        panel.querySelector("#healthcareResults");


    // Close

    closeButton.addEventListener("click", () => {
        panel.remove();
    });


    // Manual Search

    searchButton.addEventListener(
        "click",
        async () => {

            const location =
                locationInput.value.trim();

            if (!location) {

                results.innerHTML = `
                    <div class="search-message">

                        <strong>
                            Enter your location
                        </strong>

                        <p>
                            Please enter your city or area first.
                        </p>

                    </div>
                `;

                locationInput.focus();

                return;
            }

            await performHealthcareSearch(
                location,
                serviceName,
                icon,
                results
            );

        }
    );


    // Use Location

    useLocationButton.addEventListener(
        "click",
        async () => {

            await getCurrentLocationAndSearch(
                serviceName,
                icon,
                results,
                useLocationButton
            );

        }
    );


    // Enter Key

    locationInput.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {
                searchButton.click();
            }

        }
    );

}


// =================================
// Healthcare Search With GPS
// =================================

function showHealthcareSearchWithLocation(
    serviceName,
    description,
    icon
) {

    showHealthcareSearch(
        serviceName,
        description,
        icon
    );

    const panel =
        document.querySelector("#healthcareSearchPanel");

    if (!panel) {
        return;
    }

    const results =
        panel.querySelector("#healthcareResults");

    const locationButton =
        panel.querySelector("#panelUseLocationBtn");

    getCurrentLocationAndSearch(
        serviceName,
        icon,
        results,
        locationButton
    );

}


// =================================
// TRUE GPS LOCATION SEARCH
// =================================

function getCurrentLocationAndSearch(
    serviceName,
    icon,
    results,
    button
) {

    if (!navigator.geolocation) {

        results.innerHTML = `
            <div class="search-message">

                <strong>
                    Location unavailable
                </strong>

                <p>
                    Your browser does not support location services.
                    Please enter your city or area manually.
                </p>

            </div>
        `;

        return;
    }


    if (button) {

        button.disabled = true;

        button.textContent =
            "📍 Getting your location...";

    }


    results.innerHTML = `
        <div class="search-message">

            <strong>
                Getting your exact location...
            </strong>

            <p>
                Please allow location access in your browser.
            </p>

        </div>
    `;


    navigator.geolocation.getCurrentPosition(

        async (position) => {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;


            console.log(
                "Exact GPS location:",
                latitude,
                longitude
            );


            try {

                await performHealthcareSearch(
                    "",
                    serviceName,
                    icon,
                    results,
                    latitude,
                    longitude
                );

            } catch (error) {

                console.error(
                    "GPS healthcare search error:",
                    error
                );

                results.innerHTML = `
                    <div class="search-message">

                        <strong>
                            Location search failed
                        </strong>

                        <p>
                            We couldn't search around your
                            current location.
                        </p>

                    </div>
                `;

            } finally {

                if (button) {

                    button.disabled = false;

                    button.textContent =
                        "📍 Use My Location";

                }

            }

        },

        (error) => {

            console.error(
                "Geolocation error:",
                error
            );


            let message =
                "We could not access your location.";


            if (error.code === 1) {

                message =
                    "Location permission was denied. Please allow location access or enter your area manually.";

            }


            if (error.code === 2) {

                message =
                    "Your location could not be determined. Please try again or enter your area manually.";

            }


            if (error.code === 3) {

                message =
                    "Location request timed out. Please try again or enter your area manually.";

            }


            results.innerHTML = `
                <div class="search-message">

                    <strong>
                        Location unavailable
                    </strong>

                    <p>
                        ${escapeHTML(message)}
                    </p>

                </div>
            `;


            if (button) {

                button.disabled = false;

                button.textContent =
                    "📍 Use My Location";

            }

        },

        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000
        }
    );

}


// =================================
// Perform Healthcare Search
// =================================

async function performHealthcareSearch(
    location,
    serviceName,
    icon,
    results,
    latitude = null,
    longitude = null
) {

    const usingGPS =
        latitude !== null &&
        longitude !== null;


    results.innerHTML = `
        <div class="search-message">

            <strong>
                Searching...
            </strong>

            <p>
                ${
                    usingGPS
                        ? "Finding healthcare facilities around your exact location."
                        : `Finding healthcare facilities around ${escapeHTML(location)}.`
                }
            </p>

        </div>
    `;


    try {

        const response =
            await fetch(
                "http://127.0.0.1:8000/api/healthcare-search",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        location: location,

                        service: serviceName,

                        latitude: latitude,

                        longitude: longitude

                    })
                }
            );


        const data =
            await response.json();


        if (!data.success) {

            results.innerHTML = `
                <div class="search-message">

                    <strong>
                        Search unavailable
                    </strong>

                    <p>
                        ${escapeHTML(
                            data.message ||
                            "No results were found."
                        )}
                    </p>

                </div>
            `;

            return;
        }


        if (
            !data.facilities ||
            data.facilities.length === 0
        ) {

            results.innerHTML = `
                <div class="search-message">

                    <strong>
                        No facilities found
                    </strong>

                    <p>
                        We couldn't find mapped
                        ${escapeHTML(
                            serviceName.toLowerCase()
                        )}
                        ${
                            usingGPS
                                ? "near your current location."
                                : `around ${escapeHTML(location)}.`
                        }
                    </p>

                    <small>
                        Try another nearby city or area.
                    </small>

                </div>
            `;

            return;
        }


        let resultsHTML = `

            <div class="search-summary">

                <strong>
                    ${data.count}
                    ${escapeHTML(
                        serviceName.toLowerCase()
                    )}
                    found
                </strong>

                <span>
                    ${
                        usingGPS
                            ? "Nearest facilities first"
                            : `Around ${escapeHTML(location)}`
                    }
                </span>

            </div>

            <div class="facility-list">
        `;


        data.facilities.forEach((facility) => {

            const safeName =
                escapeHTML(
                    facility.name ||
                    "Healthcare Facility"
                );


            const safeAddress =
                escapeHTML(
                    facility.address ||
                    "Address not available"
                );


            const safePhone =
                escapeHTML(
                    facility.phone || ""
                );


            const safeWebsite =
                escapeHTML(
                    facility.website || ""
                );


            let mapLink = "#";

            let googleMapsLink = "#";


            if (
                facility.latitude !== null &&
                facility.latitude !== undefined &&
                facility.longitude !== null &&
                facility.longitude !== undefined
            ) {

                mapLink =
                    `https://www.openstreetmap.org/?mlat=${facility.latitude}&mlon=${facility.longitude}#map=18/${facility.latitude}/${facility.longitude}`;


                googleMapsLink =
                    `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`;

            }


            let distanceText =
                "Distance unavailable";


            if (
                facility.distance_km !== null &&
                facility.distance_km !== undefined
            ) {

                const distance =
                    Number(
                        facility.distance_km
                    );


                if (!Number.isNaN(distance)) {

                    if (distance < 1) {

                        distanceText =
                            `${Math.round(
                                distance * 1000
                            )} m away`;

                    } else {

                        distanceText =
                            `${distance.toFixed(
                                1
                            )} km away`;

                    }

                }

            }


            let phoneButton = "";


            if (safePhone) {

                phoneButton = `
                    <a
                        href="tel:${safePhone}"
                        class="facility-link"
                    >
                        📞 Call
                    </a>
                `;

            }


            let websiteButton = "";


            if (safeWebsite) {

                websiteButton = `
                    <a
                        href="${safeWebsite}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="facility-link"
                    >
                        🌐 Website
                    </a>
                `;

            }


            resultsHTML += `

                <div class="facility-card">

                    <div class="facility-icon">
                        ${icon}
                    </div>

                    <div class="facility-info">

                        <div class="facility-heading">

                            <h3>
                                ${safeName}
                            </h3>

                            <span class="facility-distance">
                                📍 ${distanceText}
                            </span>

                        </div>

                        <p>
                            📌 ${safeAddress}
                        </p>

                        ${
                            safePhone
                                ? `
                                    <p>
                                        📞 ${safePhone}
                                    </p>
                                  `
                                : ""
                        }

                        <div class="facility-actions">

                            <a
                                href="${mapLink}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="facility-link"
                            >
                                🗺️ View Map
                            </a>

                            <a
                                href="${googleMapsLink}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="facility-link"
                            >
                                📍 Google Maps
                            </a>

                            ${phoneButton}

                            ${websiteButton}

                        </div>

                    </div>

                </div>

            `;

        });


        resultsHTML += `
            </div>
        `;


        results.innerHTML =
            resultsHTML;


        results.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });


    } catch (error) {

        console.error(
            "Healthcare search error:",
            error
        );


        results.innerHTML = `
            <div class="search-message">

                <strong>
                    Connection Error
                </strong>

                <p>
                    MediGuide NG could not connect
                    to the healthcare directory.
                </p>

                <small>
                    Make sure the backend server
                    is still running.
                </small>

            </div>
        `;

    }

}


// =================================
// Emergency Care
// =================================

function showEmergencyPanel() {

    const existingPanel =
        document.querySelector("#healthcareSearchPanel");

    if (existingPanel) {
        existingPanel.remove();
    }


    const panel =
        document.createElement("section");

    panel.id =
        "healthcareSearchPanel";


    panel.innerHTML = `
        <div class="healthcare-search-card emergency-panel">

            <button
                class="close-search"
                type="button"
                aria-label="Close"
            >
                ×
            </button>

            <div class="search-icon">
                🚨
            </div>

            <span class="section-label">
                Emergency Care
            </span>

            <h2>
                Find Emergency Care
            </h2>

            <p>
                If you believe you are experiencing a medical
                emergency, seek immediate professional medical help.
            </p>

            <div class="emergency-notice">

                <strong>
                    Important
                </strong>

                <p>
                    MediGuide NG does not provide emergency
                    medical treatment or replace emergency services.
                    If this is an emergency, seek immediate
                    professional medical attention.
                </p>

            </div>

            <label for="emergencyLocation">
                Your city or area
            </label>

            <input
                id="emergencyLocation"
                type="text"
                placeholder="Example: Onitsha"
            >

            <button
                id="emergencyLocationBtn"
                type="button"
            >
                Find Emergency Hospitals →
            </button>

            <button
                id="emergencyUseLocationBtn"
                class="location-panel-btn"
                type="button"
            >
                📍 Use My Location
            </button>

            <div id="emergencyResult"></div>

        </div>
    `;


    document
        .querySelector(".services-section")
        .after(panel);


    panel.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });


    const closeButton =
        panel.querySelector(".close-search");


    closeButton.addEventListener(
        "click",
        () => {
            panel.remove();
        }
    );


    const emergencyButton =
        panel.querySelector(
            "#emergencyLocationBtn"
        );


    const useLocationButton =
        panel.querySelector(
            "#emergencyUseLocationBtn"
        );


    const locationInput =
        panel.querySelector(
            "#emergencyLocation"
        );


    const result =
        panel.querySelector(
            "#emergencyResult"
        );


    // =================================
    // Manual Emergency Search
    // =================================

    emergencyButton.addEventListener(
        "click",
        async () => {

            const location =
                locationInput.value.trim();


            if (!location) {

                result.innerHTML = `
                    <div class="search-message">

                        <strong>
                            Enter your location
                        </strong>

                        <p>
                            Please enter your city or area
                            so we can find nearby hospitals.
                        </p>

                    </div>
                `;

                locationInput.focus();

                return;
            }


            await performEmergencySearch(
                location,
                result
            );

        }
    );


    // =================================
    // Emergency Use My Location
    // =================================

    useLocationButton.addEventListener(
        "click",
        async () => {

            await getEmergencyCurrentLocation(
                result,
                useLocationButton,
                locationInput
            );

        }
    );


    // =================================
    // Enter Key
    // =================================

    locationInput.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {
                emergencyButton.click();
            }

        }
    );

}


// =================================
// Emergency GPS
// =================================

function useMyLocationForEmergency() {

    showEmergencyPanel();

    const panel =
        document.querySelector(
            "#healthcareSearchPanel"
        );

    if (!panel) {
        return;
    }


    const result =
        panel.querySelector(
            "#emergencyResult"
        );


    const button =
        panel.querySelector(
            "#emergencyUseLocationBtn"
        );


    const input =
        panel.querySelector(
            "#emergencyLocation"
        );


    getEmergencyCurrentLocation(
        result,
        button,
        input
    );

}


// =================================
// Get Emergency GPS Location
// =================================

function getEmergencyCurrentLocation(
    result,
    button,
    locationInput
) {

    if (!navigator.geolocation) {

        result.innerHTML = `
            <div class="search-message">

                <strong>
                    Location unavailable
                </strong>

                <p>
                    Your browser does not support
                    location services.
                </p>

            </div>
        `;

        return;
    }


    button.disabled = true;

    button.textContent =
        "📍 Getting your location...";


    result.innerHTML = `
        <div class="search-message">

            <strong>
                Getting your exact location...
            </strong>

            <p>
                Please allow location access in your browser.
            </p>

        </div>
    `;


    navigator.geolocation.getCurrentPosition(

        async (position) => {

            const latitude =
                position.coords.latitude;


            const longitude =
                position.coords.longitude;


            console.log(
                "Exact emergency GPS:",
                latitude,
                longitude
            );


            try {

                await performEmergencySearch(
                    "",
                    result,
                    latitude,
                    longitude
                );

            } catch (error) {

                console.error(
                    "Emergency GPS error:",
                    error
                );

                result.innerHTML = `
                    <div class="search-message">

                        <strong>
                            Location search failed
                        </strong>

                        <p>
                            We couldn't find emergency
                            hospitals around your location.
                        </p>

                    </div>
                `;

            } finally {

                button.disabled = false;

                button.textContent =
                    "📍 Use My Location";

            }

        },


        (error) => {

            console.error(
                "Emergency geolocation error:",
                error
            );


            let message =
                "We could not access your location.";


            if (error.code === 1) {

                message =
                    "Location permission was denied. Please allow location access or enter your area manually.";

            }


            if (error.code === 2) {

                message =
                    "Your location could not be determined. Please try again.";

            }


            if (error.code === 3) {

                message =
                    "Location request timed out. Please try again.";

            }


            result.innerHTML = `
                <div class="search-message">

                    <strong>
                        Location unavailable
                    </strong>

                    <p>
                        ${escapeHTML(message)}
                    </p>

                </div>
            `;


            button.disabled = false;

            button.textContent =
                "📍 Use My Location";

        },


        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000
        }

    );

}


// =================================
// Emergency Search
// =================================

async function performEmergencySearch(
    location,
    result,
    latitude = null,
    longitude = null
) {

    const usingGPS =
        latitude !== null &&
        longitude !== null;


    result.innerHTML = `
        <div class="search-message">

            <strong>
                Searching for emergency hospitals...
            </strong>

            <p>
                ${
                    usingGPS
                        ? "Finding hospitals around your exact location."
                        : `Finding hospitals around ${escapeHTML(location)}.`
                }
            </p>

        </div>
    `;


    try {

        const response =
            await fetch(
                "http://127.0.0.1:8000/api/healthcare-search",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        location: location,

                        service: "Hospitals & Clinics",

                        latitude: latitude,

                        longitude: longitude

                    })
                }
            );


        const data =
            await response.json();


        if (!data.success) {

            result.innerHTML = `
                <div class="search-message">

                    <strong>
                        Search unavailable
                    </strong>

                    <p>
                        ${escapeHTML(
                            data.message ||
                            "Unable to find emergency hospitals."
                        )}
                    </p>

                </div>
            `;

            return;
        }


        if (
            !data.facilities ||
            data.facilities.length === 0
        ) {

            result.innerHTML = `
                <div class="search-message">

                    <strong>
                        No hospitals found
                    </strong>

                    <p>
                        ${
                            usingGPS
                                ? "We couldn't find mapped hospitals near your current location."
                                : `We couldn't find mapped hospitals around ${escapeHTML(location)}.`
                        }
                    </p>

                    <small>
                        Try another nearby city or area.
                    </small>

                </div>
            `;

            return;
        }


        let emergencyHTML = `

            <div class="search-summary">

                <strong>
                    ${data.count}
                    hospitals found
                </strong>

                <span>
                    Nearest hospitals first
                </span>

            </div>

            <div class="facility-list">
        `;


        data.facilities.forEach((facility) => {

            const safeName =
                escapeHTML(
                    facility.name ||
                    "Hospital"
                );


            const safeAddress =
                escapeHTML(
                    facility.address ||
                    "Address not available"
                );


            const safePhone =
                escapeHTML(
                    facility.phone || ""
                );


            const safeWebsite =
                escapeHTML(
                    facility.website || ""
                );


            let mapLink = "#";

            let googleMapsLink = "#";


            if (
                facility.latitude !== null &&
                facility.latitude !== undefined &&
                facility.longitude !== null &&
                facility.longitude !== undefined
            ) {

                mapLink =
                    `https://www.openstreetmap.org/?mlat=${facility.latitude}&mlon=${facility.longitude}#map=18/${facility.latitude}/${facility.longitude}`;


                googleMapsLink =
                    `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`;

            }


            let distanceText =
                "Distance unavailable";


            if (
                facility.distance_km !== null &&
                facility.distance_km !== undefined
            ) {

                const distance =
                    Number(
                        facility.distance_km
                    );


                if (!Number.isNaN(distance)) {

                    if (distance < 1) {

                        distanceText =
                            `${Math.round(
                                distance * 1000
                            )} m away`;

                    } else {

                        distanceText =
                            `${distance.toFixed(
                                1
                            )} km away`;

                    }

                }

            }


            let phoneButton = "";


            if (safePhone) {

                phoneButton = `
                    <a
                        href="tel:${safePhone}"
                        class="facility-link"
                    >
                        📞 Call
                    </a>
                `;

            }


            let websiteButton = "";


            if (safeWebsite) {

                websiteButton = `
                    <a
                        href="${safeWebsite}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="facility-link"
                    >
                        🌐 Website
                    </a>
                `;

            }


            emergencyHTML += `

                <div class="facility-card">

                    <div class="facility-icon">
                        🚨
                    </div>

                    <div class="facility-info">

                        <div class="facility-heading">

                            <h3>
                                ${safeName}
                            </h3>

                            <span class="facility-distance">
                                📍 ${distanceText}
                            </span>

                        </div>

                        <p>
                            📌 ${safeAddress}
                        </p>

                        ${
                            safePhone
                                ? `
                                    <p>
                                        📞 ${safePhone}
                                    </p>
                                  `
                                : ""
                        }

                        <div class="facility-actions">

                            <a
                                href="${googleMapsLink}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="facility-link"
                            >
                                📍 Google Maps
                            </a>

                            <a
                                href="${mapLink}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="facility-link"
                            >
                                🗺️ View Map
                            </a>

                            ${phoneButton}

                            ${websiteButton}

                        </div>

                    </div>

                </div>

            `;

        });


        emergencyHTML += `
            </div>
        `;


        result.innerHTML =
            emergencyHTML;


        result.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });


    } catch (error) {

        console.error(
            "Emergency search error:",
            error
        );


        result.innerHTML = `
            <div class="search-message">

                <strong>
                    Connection Error
                </strong>

                <p>
                    MediGuide NG could not connect
                    to the healthcare directory.
                </p>

                <small>
                    Make sure the backend server
                    is still running.
                </small>

            </div>
        `;

    }

}


// =================================
// HTML Safety
// =================================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
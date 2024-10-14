let map;
let marker;
let autocomplete;
let directionsService;
let directionsRenderer;

function initMap() {
    const hongKong = { lat: 22.3193, lng: 114.1694 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 11,
        center: hongKong,
    });

    // Initialize the autocomplete object
    autocomplete = new google.maps.places.Autocomplete(
        document.getElementById('address'),
        {
            types: ['geocode'],
            componentRestrictions: { country: 'hk' }
        }
    );

    // Bias the autocomplete results to the current map's viewport
    autocomplete.bindTo('bounds', map);

    // Initialize DirectionsService and DirectionsRenderer
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
}

document.addEventListener('DOMContentLoaded', function() {
    initMap();
    fetchMTRStatus();

    const addressForm = document.getElementById('address-form');
    const resultDiv = document.getElementById('result');

    addressForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const place = autocomplete.getPlace();
        if (!place || !place.geometry) {
            resultDiv.innerHTML = '<p class="text-danger">Please select a valid address from the suggestions.</p>';
            return;
        }
        findNearestMTR(place.formatted_address, place.geometry.location.lat(), place.geometry.location.lng());
    });

    function findNearestMTR(address, lat, lng) {
        fetch('/find_nearest_mtr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address: address, lat: lat, lng: lng }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            } else {
                displayResult(data);
                updateMap(data);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            resultDiv.innerHTML = `<p class="text-danger">An error occurred: ${error.message}. Please try again.</p>`;
        });
    }

    function displayResult(data) {
        let directionsHtml = '<ol>';
        data.walking_directions.forEach(step => {
            directionsHtml += `<li>${step.instruction} (${step.distance})</li>`;
        });
        directionsHtml += '</ol>';

        let accessibilityHtml = '<h4>Accessibility Information:</h4>';
        if (Object.keys(data.accessibility.exits).length > 0) {
            accessibilityHtml += '<ul>';
            for (const [exit, features] of Object.entries(data.accessibility.exits)) {
                accessibilityHtml += `<li>Exit ${exit}: ${features.join(', ')}</li>`;
            }
            accessibilityHtml += '</ul>';
        } else {
            accessibilityHtml += '<p>No accessibility information available for this station.</p>';
        }

        resultDiv.innerHTML = `
            <h3>Nearest MTR Station:</h3>
            <p>${data.station_name}</p>
            <h4>Walking Directions:</h4>
            ${directionsHtml}
            ${accessibilityHtml}
        `;
    }

    function updateMap(data) {
        const origin = new google.maps.LatLng(data.input_lat, data.input_lng);
        const destination = new google.maps.LatLng(data.station_lat, data.station_lng);

        const request = {
            origin: origin,
            destination: destination,
            travelMode: 'WALKING'
        };

        directionsService.route(request, function(result, status) {
            if (status === 'OK') {
                directionsRenderer.setDirections(result);
            }
        });

        map.setCenter(origin);
        map.setZoom(15);

        if (marker) {
            marker.setMap(null);
        }

        marker = new google.maps.Marker({
            position: origin,
            map: map,
            title: 'Your Location'
        });

        new google.maps.Marker({
            position: destination,
            map: map,
            title: data.station_name,
            icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        });
    }
});

function fetchMTRStatus() {
    const statusDiv = document.getElementById('mtr-status');
    fetch('/mtr_status')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                statusDiv.innerHTML = `<p class="text-danger">Error fetching MTR status: ${data.error}</p>`;
            } else {
                statusDiv.innerHTML = `
                    <p><strong>MTR Status:</strong> ${data.status}</p>
                    <p><small>Last updated: ${data.timestamp}</small></p>
                `;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            statusDiv.innerHTML = '<p class="text-danger">Failed to fetch MTR status. Please try again later.</p>';
        });
}

// Fetch MTR status every 5 minutes
setInterval(fetchMTRStatus, 5 * 60 * 1000);

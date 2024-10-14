let map;
let marker;
let autocomplete;

function initMap() {
    const hongKong = { lat: 22.3193, lng: 114.1694 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 11,
        center: hongKong,
    });

    // Initialize the autocomplete object with updated options
    autocomplete = new google.maps.places.Autocomplete(
        document.getElementById('address'),
        {
            types: ['address', 'establishment'],
            componentRestrictions: { country: 'hk' }
        }
    );

    // Bind the map's bounds (viewport) property to the autocomplete object,
    // so that the autocomplete requests use the current map bounds for the
    // bounds option in the request.
    autocomplete.bindTo('bounds', map);

    // Set up event listener for place changed
    autocomplete.addListener('place_changed', onPlaceChanged);
}

function onPlaceChanged() {
    const place = autocomplete.getPlace();

    if (!place.geometry) {
        // User entered the name of a Place that was not suggested and
        // pressed the Enter key, or the Place Details request failed.
        document.getElementById('address').placeholder = 'Enter a place';
    } else {
        // If the place has a geometry, then present it on a map.
        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(17);
        }

        if (marker) {
            marker.setMap(null);
        }

        marker = new google.maps.marker.AdvancedMarkerElement({
            position: place.geometry.location,
            map: map,
            title: place.name
        });

        findNearestMTR(place.formatted_address);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initMap();

    const addressForm = document.getElementById('address-form');
    const resultDiv = document.getElementById('result');

    addressForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const address = document.getElementById('address').value;
        findNearestMTR(address);
    });

    function findNearestMTR(address) {
        fetch('/find_nearest_mtr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address: address }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                resultDiv.innerHTML = `<p class="text-danger">${data.error}</p>`;
            } else {
                displayResult(data);
                updateMap(data);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            resultDiv.innerHTML = '<p class="text-danger">An error occurred. Please try again.</p>';
        });
    }

    function displayResult(data) {
        resultDiv.innerHTML = `
            <h3>Nearest MTR Station:</h3>
            <p>${data.station_name}</p>
            <p>Head towards the exit in the direction of your destination.</p>
        `;
    }

    function updateMap(data) {
        const inputLocation = new google.maps.LatLng(data.input_lat, data.input_lng);
        const stationLocation = new google.maps.LatLng(data.station_lat, data.station_lng);

        map.setCenter(inputLocation);
        map.setZoom(15);

        if (marker) {
            marker.setMap(null);
        }

        marker = new google.maps.marker.AdvancedMarkerElement({
            position: inputLocation,
            map: map,
            title: 'Your Location'
        });

        new google.maps.marker.AdvancedMarkerElement({
            position: stationLocation,
            map: map,
            title: data.station_name,
            content: new google.maps.marker.PinElement({
                background: '#4285F4',
                glyphColor: '#FFFFFF',
                glyph: 'M'
            }).element
        });

        const bounds = new google.maps.LatLngBounds();
        bounds.extend(inputLocation);
        bounds.extend(stationLocation);
        map.fitBounds(bounds);

        const line = new google.maps.Polyline({
            path: [inputLocation, stationLocation],
            geodesic: true,
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 2
        });

        line.setMap(map);
    }
});

let map;
let marker;
let autocomplete;

function initAutocomplete() {
    const hongKong = { lat: 22.3193, lng: 114.1694 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 11,
        center: hongKong,
    });

    autocomplete = new google.maps.places.Autocomplete(
        document.getElementById('address'),
        {
            types: ['geocode', 'establishment'],
            componentRestrictions: { country: 'hk' },
            fields: ['place_id', 'geometry', 'name']
        }
    );

    autocomplete.addListener('place_changed', onPlaceChanged);

    const addressForm = document.getElementById('address-form');
    const resultDiv = document.getElementById('result');

    addressForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            // User entered the name of a Place that was not suggested and
            // pressed the Enter key, or the Place Details request failed.
            resultDiv.innerHTML = "<p class='text-danger'>No details available for input: '" + place.name + "'</p>";
            return;
        }
        findNearestMTR(place.geometry.location.lat(), place.geometry.location.lng());
    });
}

function onPlaceChanged() {
    const place = autocomplete.getPlace();

    if (!place.geometry) {
        // User entered the name of a Place that was not suggested and
        // pressed the Enter key, or the Place Details request failed.
        document.getElementById('address').placeholder = 'Enter a place';
    } else {
        // Display the name of the place in the input field
        document.getElementById('address').value = place.name;
    }
}

function findNearestMTR(lat, lng) {
    fetch('/find_nearest_mtr', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lat: lat, lng: lng }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            document.getElementById('result').innerHTML = `<p class="text-danger">${data.error}</p>`;
        } else {
            displayResult(data);
            updateMap(data);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('result').innerHTML = '<p class="text-danger">An error occurred. Please try again.</p>';
    });
}

function displayResult(data) {
    document.getElementById('result').innerHTML = `
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

    marker = new google.maps.Marker({
        position: inputLocation,
        map: map,
        title: 'Your Location'
    });

    new google.maps.Marker({
        position: stationLocation,
        map: map,
        title: data.station_name,
        icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
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

let map;
let marker;
let autocomplete;

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
}

document.addEventListener('DOMContentLoaded', function() {
    initMap();

    const addressForm = document.getElementById('address-form');
    const resultDiv = document.getElementById('result');

    addressForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const place = autocomplete.getPlace();
        if (!place.geometry) {
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
            content: createMarkerContent(data.station_name, 'blue')
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

    function createMarkerContent(title, color) {
        const content = document.createElement('div');
        content.classList.add('marker');
        content.style.color = color;
        content.textContent = title;
        return content;
    }
});

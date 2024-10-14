let map;
let marker;

function initMap() {
    const hongKong = { lat: 22.3193, lng: 114.1694 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 11,
        center: hongKong,
    });
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
});

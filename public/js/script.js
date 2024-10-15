console.log('script.js loaded');

let map;
let marker;

function initMap() {
    console.log('initMap function called');
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 22.3193, lng: 114.1694 },
        zoom: 11
    });
    console.log('Map initialized');
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded');
    const addressForm = document.getElementById('address-form');
    const addressInput = document.getElementById('address');
    const resultDiv = document.getElementById('result');

    addressForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submitted');
        const address = addressInput.value;

        try {
            const response = await fetch('/find_nearest_mtr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ address: address, lat: 0, lng: 0 }), // Placeholder lat/lng
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            console.log('Received data:', data);

            resultDiv.innerHTML = `
                <h3>Nearest MTR Station: ${data.station_name}</h3>
                <p>Walking Directions:</p>
                <ol>
                    ${data.walking_directions.map(step => `<li>${step.instruction} (${step.distance})</li>`).join('')}
                </ol>
            `;

            // Update map
            const stationLocation = { lat: data.station_lat, lng: data.station_lng };
            map.setCenter(stationLocation);
            map.setZoom(15);

            if (marker) {
                marker.setMap(null);
            }
            marker = new google.maps.Marker({
                position: stationLocation,
                map: map,
                title: data.station_name
            });

        } catch (error) {
            console.error('Error:', error);
            resultDiv.innerHTML = '<p>An error occurred. Please try again.</p>';
        }
    });

    // Fetch and update MTR status
    async function updateMTRStatus() {
        try {
            const response = await fetch('/mtr_status');
            const data = await response.json();
            document.getElementById('mtr-status').innerHTML = `
                <p>${data.status}</p>
                <p>Last updated: ${data.timestamp}</p>
            `;
        } catch (error) {
            console.error('Error fetching MTR status:', error);
        }
    }

    updateMTRStatus();
    setInterval(updateMTRStatus, 300000); // Update every 5 minutes
});

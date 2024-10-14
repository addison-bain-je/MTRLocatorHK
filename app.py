import os
from flask import Flask, render_template, request, jsonify
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import pytz
from math import radians, sin, cos, sqrt, atan2

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"

# Google Maps API key from environment variable
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")

@app.route('/')
def index():
    return render_template('index.html', api_key=GOOGLE_MAPS_API_KEY)

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Radius of the Earth in kilometers
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c * 1000  # Distance in meters

@app.route('/find_nearest_mtr', methods=['POST'])
def find_nearest_mtr():
    data = request.json
    address = data['address']
    lat = data['lat']
    lng = data['lng']
    
    # Find nearby MTR stations
    places_url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius=1000&type=subway_station&key={GOOGLE_MAPS_API_KEY}"
    places_response = requests.get(places_url)
    places_data = places_response.json()
    
    if places_data['status'] != 'OK' or len(places_data['results']) == 0:
        return jsonify({'error': 'No MTR stations found nearby'}), 404
    
    nearest_station = places_data['results'][0]
    station_name = nearest_station['name']
    station_lat = nearest_station['geometry']['location']['lat']
    station_lng = nearest_station['geometry']['location']['lng']
    
    # Get detailed information about the MTR station
    place_id = nearest_station['place_id']
    details_url = f"https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=name,geometry,address_component&key={GOOGLE_MAPS_API_KEY}"
    details_response = requests.get(details_url)
    details_data = details_response.json()
    
    if details_data['status'] != 'OK':
        return jsonify({'error': 'Unable to fetch station details'}), 500
    
    station_details = details_data['result']
    
    # Find the nearest exit (assuming exits are represented by address components)
    exits = [component for component in station_details.get('address_components', []) if 'exit' in component['long_name'].lower()]
    
    if not exits:
        return jsonify({'error': 'No exit information available for this station'}), 404
    
    nearest_exit = min(exits, key=lambda x: calculate_distance(lat, lng, station_lat, station_lng))
    exit_name = nearest_exit['long_name']
    
    # Get walking directions to the nearest exit
    directions_url = f"https://maps.googleapis.com/maps/api/directions/json?origin={lat},{lng}&destination={station_lat},{station_lng}&mode=walking&key={GOOGLE_MAPS_API_KEY}"
    directions_response = requests.get(directions_url)
    directions_data = directions_response.json()
    
    if directions_data['status'] != 'OK':
        return jsonify({'error': 'Unable to fetch walking directions'}), 500
    
    steps = directions_data['routes'][0]['legs'][0]['steps']
    walking_directions = [{'instruction': step['html_instructions'], 'distance': step['distance']['text']} for step in steps]
    
    return jsonify({
        'station_name': station_name,
        'exit_name': exit_name,
        'station_lat': station_lat,
        'station_lng': station_lng,
        'input_lat': lat,
        'input_lng': lng,
        'walking_directions': walking_directions
    })

@app.route('/mtr_status')
def mtr_status():
    try:
        url = "http://www.mtr.com.hk/alert/index.html"
        response = requests.get(url)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        status_div = soup.find('div', class_='line-status')
        if status_div:
            status_text = status_div.get_text(strip=True)
        else:
            status_text = "All MTR lines are operating normally."
        
        # Get current timestamp with UTC+8 timezone
        hong_kong_tz = pytz.timezone('Asia/Hong_Kong')
        timestamp = datetime.now(hong_kong_tz).strftime('%Y-%m-%d %H:%M:%S %Z')
        
        return jsonify({
            'status': status_text,
            'timestamp': timestamp
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

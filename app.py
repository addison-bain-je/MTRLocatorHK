import os
from flask import Flask, render_template, request, jsonify
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"

# Google Maps API key from environment variable
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")

@app.route('/')
def index():
    return render_template('index.html', api_key=GOOGLE_MAPS_API_KEY)

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
    
    return jsonify({
        'station_name': station_name,
        'station_lat': station_lat,
        'station_lng': station_lng,
        'input_lat': lat,
        'input_lng': lng
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
        
        return jsonify({'status': status_text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

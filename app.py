from flask import Flask, render_template, request, jsonify
import requests
import os
from dotenv import load_dotenv
from functools import lru_cache
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Artsy API credentials
CLIENT_ID = os.getenv('ARTSY_CLIENT_ID')
CLIENT_SECRET = os.getenv('ARTSY_CLIENT_SECRET')
ARTSY_API_BASE = 'https://api.artsy.net/api'

# Cache token for 1 week
@lru_cache(maxsize=1)
def get_artsy_token():
    """Get Artsy API token with caching"""
    try:
        response = requests.post(
            f'{ARTSY_API_BASE}/tokens/xapp_token',
            data={
                'client_id': CLIENT_ID,
                'client_secret': CLIENT_SECRET
            }
        )
        response.raise_for_status()
        token_data = response.json()
        return token_data['token']
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error getting Artsy token: {str(e)}")
        raise

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/api/search')
def search_artists():
    """Search artists endpoint"""
    query = request.args.get('q', '').strip()
    print(query)
    if not query:
        return jsonify({'error': 'Query parameter is required'}), 400

    try:
        token = get_artsy_token()
        headers = {'X-XAPP-Token': token}
        
        response = requests.get(
            f'{ARTSY_API_BASE}/search',
            params={
                'q': query,
                'size': 10,
                'type': 'artist'
            },
            headers=headers
        )
        response.raise_for_status()
        
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error searching artists: {str(e)}")
        return jsonify({'error': 'Failed to search artists'}), 500

@app.route('/api/artist/<artist_id>')
def get_artist(artist_id):
    """Get artist details endpoint"""
    if not artist_id:
        return jsonify({'error': 'Artist ID is required'}), 400

    try:
        token = get_artsy_token()
        headers = {'X-XAPP-Token': token}
        
        response = requests.get(
            f'{ARTSY_API_BASE}/artists/{artist_id}',
            headers=headers
        )
        response.raise_for_status()
        
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error getting artist details: {str(e)}")
        return jsonify({'error': 'Failed to get artist details'}), 500

@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True) 
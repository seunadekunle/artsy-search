from flask import Flask, render_template, request, jsonify
import requests
import os
from datetime import datetime, timedelta
import time
from datetime import timezone

app = Flask(__name__)

CLIENT_ID = "3dcaf2ec14b452cabb17"
CLIENT_SECRET = "495cd6bd1654758181f54b557d9ac102"
ARTSY_API_BASE = 'https://api.artsy.net/api'

class TokenManager:
    def __init__(self):
        self.token = None
        self.token_expiry = None
        self.token_buffer = 300 
        
    def get_token(self):
        """Get a valid token, refreshing if necessary"""
        current_time = datetime.now(timezone.utc)
        
        # check if token needs refresh
        if (not self.token or 
            not self.token_expiry or 
            current_time + timedelta(seconds=self.token_buffer) >= self.token_expiry):
            self._refresh_token()
        
        return self.token

    def _refresh_token(self):
        """Refresh the Artsy API token"""
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
            
            self.token = token_data['token']
            self.token_expiry = datetime.fromisoformat(token_data['expires_at'].replace('Z', '+00:00'))
            app.logger.info(f"Token refreshed, expires at {self.token_expiry}")
            
        except requests.exceptions.RequestException as e:
            app.logger.error(f"Error refreshing Artsy token: {str(e)}")
            raise

token_manager = TokenManager()

def make_artsy_request(method, endpoint, **kwargs):
    """Make a request to Artsy API with automatic token refresh"""
    max_retries = 2
    for attempt in range(max_retries):
        try:
            token = token_manager.get_token()
            
            if 'headers' not in kwargs:
                kwargs['headers'] = {}
            
            kwargs['headers']['X-XAPP-Token'] = token
            
            # make request
            response = requests.request(method, f'{ARTSY_API_BASE}/{endpoint}', **kwargs)
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401 and attempt < max_retries - 1:
                token_manager.token = None
                continue
            raise
        except requests.exceptions.RequestException as e:
            app.logger.error(f"Error making Artsy request: {str(e)}")
            raise

# apis
@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/api/search')
def search_artists():
    """Search artists endpoint"""
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({'error': 'Query parameter is required'}), 400

    try:
        result = make_artsy_request(
            'GET',
            'search',
            params={
                'q': query,
                'size': 10,
                'type': 'artist'
            }
        )
        return jsonify(result)
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error searching artists: {str(e)}")
        return jsonify({'error': 'Failed to search artists'}), 500

@app.route('/api/artist/<artist_id>')
def get_artist(artist_id):
    """Get artist details endpoint"""
    if not artist_id:
        return jsonify({'error': 'Artist ID is required'}), 400

    try:
        result = make_artsy_request('GET', f'artists/{artist_id}')
        return jsonify(result)
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
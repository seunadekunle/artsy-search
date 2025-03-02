from flask import Flask, request, jsonify, send_from_directory, send_file
import requests
import os
from datetime import datetime
import time
from datetime import timezone

app = Flask(__name__)

# hardcoded values (not optimal)
CLIENT_ID = "3dcaf2ec14b452cabb17"
CLIENT_SECRET = "495cd6bd1654758181f54b557d9ac102"
ARTSY_API_BASE = 'https://api.artsy.net/api'

class TokenManager:
    def __init__(self):
        self.token = None
        self.token_expiry = None
        self.token_buffer = 300
        self.refresh_lock = False
    
    def get_token(self):
        current_time = datetime.now(timezone.utc)
        
        if self.token and self.token_expiry:
            time_until_expiry = (self.token_expiry - current_time).total_seconds()
            
            if time_until_expiry > self.token_buffer:
                return self.token
        
        return self._refresh_token()

    def _refresh_token(self):
        if self.refresh_lock:
            time.sleep(0.5)
            return self.token
        
        try:
            self.refresh_lock = True
            max_retries = 3
            retry_delay = 1
            
            for attempt in range(max_retries):
                try:
                    response = requests.post(
                        f'{ARTSY_API_BASE}/tokens/xapp_token',
                        data={
                            'client_id': CLIENT_ID,
                            'client_secret': CLIENT_SECRET
                        },
                        timeout=10
                    )
                    response.raise_for_status()
                    token_data = response.json()
                    
                    self.token = token_data['token']
                    self.token_expiry = datetime.fromisoformat(token_data['expires_at'].replace('Z', '+00:00'))
                    
                    app.logger.info(f"Token refreshed successfully, expires at {self.token_expiry}")
                    return self.token
                    
                except requests.exceptions.RequestException as e:
                    if attempt == max_retries - 1:
                        app.logger.error(f"Failed to refresh token after {max_retries} attempts: {str(e)}")
                        raise
                    
                    app.logger.warning(f"Token refresh attempt {attempt + 1} failed: {str(e)}")
                    time.sleep(retry_delay * (attempt + 1))
                    
        finally:
            self.refresh_lock = False

token_manager = TokenManager()

def make_artsy_request(method, endpoint, **kwargs):
    max_retries = 3
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            token = token_manager.get_token()
            
            if 'headers' not in kwargs:
                kwargs['headers'] = {}
            
            kwargs['headers']['X-XAPP-Token'] = token
            
            response = requests.request(
                method, 
                f'{ARTSY_API_BASE}/{endpoint}', 
                timeout=10,
                **kwargs
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401 and attempt < max_retries - 1:
                token_manager.token = None
                time.sleep(retry_delay * (attempt + 1))
                continue
            raise
            
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                app.logger.warning(f"Request attempt {attempt + 1} failed: {str(e)}")
                time.sleep(retry_delay * (attempt + 1))
                continue
            
            app.logger.error(f"Request failed after {max_retries} attempts: {str(e)}")
            raise

@app.route('/', methods=['GET'])
def index():
    return send_file('static/index.html')

@app.route('/static/<path:filename>', methods=['GET'])
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/api/search', methods=['GET'])
def search_artists():
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

@app.route('/api/artist/<artist_id>', methods=['GET'])
def get_artist(artist_id):
    if not artist_id:
        return jsonify({'error': 'Artist ID is required'}), 400

    try:
        result = make_artsy_request('GET', f'artists/{artist_id}')
        return jsonify(result)
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error getting artist details: {str(e)}")
        return jsonify({'error': 'Failed to get artist details'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True) 
# Artist Search Application

A web application that allows users to search for artists using the Artsy API. Built with Flask, HTML, CSS, and JavaScript.

## Features

- Search for artists by name
- View artist details including biography, nationality, and birth/death years
- Modern and responsive UI
- Loading indicators for better user experience

## Prerequisites

- Python 3.x
- Artsy API credentials (Client ID and Client Secret)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate 
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the project root and add your Artsy API credentials:
```
ARTSY_CLIENT_ID=your_client_id_here
ARTSY_CLIENT_SECRET=your_client_secret_here
```

## Running the Application

1. Make sure your virtual environment is activated
2. Run the Flask application:
```bash
python app.py
```
3. Open your browser and navigate to `http://localhost:5000`

## Usage

1. Enter an artist's name in the search bar
2. Press Enter or click the search icon to search
3. Click on an artist card to view their details
4. Use the clear button (X) to reset the search input

## Example Artists for Testing

- Pablo Picasso (Has every detail)
- Vincent van Gogh (Has everything except biography)
- Yayoi Kusama (Has everything except death date)
- Claude Monet (Has every detail)
- Andy Warhol (Has every detail) 
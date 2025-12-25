# Website Analytics - FastAPI Backend

This project includes a comprehensive website analytics tracking script (`script.js`) and a FastAPI backend to collect and store analytics events.

## Features

### Analytics Tracking (script.js)
- **Pageview tracking** - Automatic page view detection
- **Custom events** - Track custom user actions
- **User identification** - Associate events with specific users
- **Click tracking** - Capture all user clicks
- **Session recording** - Full session replay using rrweb
- **Scroll tracking** - Track scroll depth
- **External link tracking** - Monitor outbound links
- **Bot detection** - Filter out bot traffic
- **Visitor/Session management** - Unique visitor and session IDs

### Backend (FastAPI)
- **Event collection endpoints**
  - `/collect` - Immediate events (pageview, identify, custom)
  - `/api/events` - Buffered events (clicks, rrweb recordings)
- **Statistics endpoint** - View event counts
- **Session viewer** - Retrieve all data for a specific session
- **SQLite database** - Persistent storage
- **CORS enabled** - Works with any domain

## Setup

### 1. Install Dependencies

The virtual environment is already created. If you need to recreate it:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Start the Server

```bash
./start_server.sh
```

Or manually:

```bash
source venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The server will start on `http://localhost:8000`

### 3. Add Script to Your HTML

Add the analytics script to your HTML page:

```html
<script
  src="script.js"
  data-website-id="your-website-id"
  data-domain="yourdomain.com"
  data-allow-localhost="true"
  data-debug="true">
</script>
```

## API Endpoints

### Root
- **GET** `/` - API information and documentation

### Event Collection
- **POST** `/collect` - Collect immediate events (pageview, identify, custom)
  - Receives individual events as they occur
  - Example payload:
    ```json
    {
      "type": "pageview",
      "websiteId": "your-website-id",
      "domain": "yourdomain.com",
      "href": "http://localhost:3000/",
      "referrer": null,
      "viewport": {"width": 1920, "height": 1080},
      "visitorId": "uuid-here",
      "sessionId": "session-uuid-here"
    }
    ```

- **POST** `/api/events` - Collect buffered events (clicks, rrweb)
  - Receives batched events every 10 seconds
  - Example payload:
    ```json
    {
      "metadata": {
        "sessionId": "session-uuid",
        "url": "http://localhost:3000/",
        "screen": "1920x1080",
        "timestamp": "2025-01-01T00:00:00.000Z"
      },
      "analytics": [
        {
          "type": "click",
          "tag": "BUTTON",
          "id": "submit-btn",
          "class": "btn btn-primary",
          "text": "Submit",
          "x": 100,
          "y": 200,
          "timestamp": 1704067200000
        }
      ],
      "replay": []
    }
    ```

### Statistics
- **GET** `/stats` - Get database statistics
  - Returns counts for all event types
  - Example response:
    ```json
    {
      "pageviews": 42,
      "identify_events": 5,
      "custom_events": 18,
      "click_events": 234,
      "rrweb_events": 1523,
      "total_sessions": 15
    }
    ```

### Session Data
- **GET** `/sessions/{session_id}` - Get all events for a specific session
  - Returns session details and event counts

## Database

The application uses SQLite with the following tables:

- `pageview_events` - Page view tracking
- `identify_events` - User identification events
- `custom_events` - Custom analytics events
- `click_events` - User click tracking
- `rrweb_events` - Session recording events

Database file: `analytics.db` (created automatically on first run)

## Script Configuration

The script.js supports various configuration options via data attributes:

- `data-website-id` - (Required) Your website identifier
- `data-domain` - (Required) Your domain name
- `data-api-url` - Custom API endpoint (defaults to localhost:8000)
- `data-allow-localhost` - Enable tracking on localhost (default: false)
- `data-allow-file-protocol` - Enable on file:// protocol (default: false)
- `data-debug` - Enable debug mode (default: false)
- `data-disable-console` - Disable console logging (default: false)

## Development

### Project Structure
```
websiteAnalytics/
├── backend/
│   ├── __init__.py
│   ├── main.py          # FastAPI application
│   ├── database.py      # Database configuration
│   ├── models.py        # SQLAlchemy models
│   └── schemas.py       # Pydantic schemas
├── script.js            # Analytics tracking script
├── requirements.txt     # Python dependencies
├── start_server.sh      # Server startup script
├── analytics.db         # SQLite database (auto-generated)
└── README.md           # This file
```

### Testing

1. Start the server: `./start_server.sh`
2. Create a test HTML file with the script
3. Open in browser and interact with the page
4. Check stats: `curl http://localhost:8000/stats`

### API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Notes

- The script automatically creates visitor and session IDs
- Events are batched every 10 seconds to reduce server load
- Bot traffic is automatically filtered out
- Session recordings are automatically masked for sensitive data
- All timestamps are stored in UTC

# How to Run with Docker

## Prerequisites
- Docker
- Docker Compose

## Quick Start

### 1. Set environment variables
```bash
# Set your Gemini API key
export GEMINI_API_KEY=your-api-key-here
```

### 2. Start all services
```bash
docker-compose up
```

This will start:
- PostgreSQL database (port 5432)
- Backend API (port 8000)
- Frontend (port 3000)

### 3. Access the application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs

### 4. Stop services
```bash
docker-compose down
```

## Individual Service Management

### Start only backend
```bash
docker-compose up backend
```

### Start only database
```bash
docker-compose up postgres
```

### View logs
```bash
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f frontend
```

### Rebuild images
```bash
docker-compose down
docker-compose up --build
```

### Access database
```bash
docker-compose exec postgres psql -U invoice_user -d invoice_db
```

## Environment Variables

Create a `.env` file in the root directory:

```
GEMINI_API_KEY=your-gemini-api-key
SECRET_KEY=your-secret-key-for-production
```

## Troubleshooting

### Port already in use
```bash
# Change port in docker-compose.yml
# Or kill existing containers:
docker-compose down
```

### Database migration issues
```bash
docker-compose down -v  # Remove volumes
docker-compose up       # Recreate clean database
```

### View container logs
```bash
docker logs invoice-processor-backend-1
docker logs invoice-processor-frontend-1
```

## Production Deployment

For production, update the docker-compose.yml:
- Change `SECRET_KEY` to a secure value
- Add `ENVIRONMENT=production`
- Update database credentials
- Configure proper networking
- Use volumes for persistent data

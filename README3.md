Create .env in d:\2. Projects\Wingman AI\wingman-ai\ with:


# Required for caption generation (at least one)
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key

# Optional — leave blank if not set up yet
AI_IMAGE_API_URL=
AI_IMAGE_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_CHANNEL_ID=
The AI image and Telegram vars are optional (:- default in the compose file means they won't break if empty).

2. Start the stack

# From the project root (wingman-ai/)
docker-compose -f docker-compose.dev.yml up --build

3. Access the services
What	URL
Frontend	http://localhost:5173
API Gateway	http://localhost:4000
RabbitMQ UI	http://localhost:15672 (admin / password)
Consul UI	http://localhost:8500
Useful commands

# Start only infrastructure (DBs + RabbitMQ + Consul)
docker-compose -f docker-compose.dev.yml up user-db content-db review-db query-db rabbitmq consul

# Rebuild a single service after code changes
docker-compose -f docker-compose.dev.yml up --build content-service

# View logs for a service
docker-compose -f docker-compose.dev.yml logs -f user-service

# Stop everything
docker-compose -f docker-compose.dev.yml down

# Stop and wipe DB volumes (clean slate)
docker-compose -f docker-compose.dev.yml down -v
The compose file has health checks on all DBs and RabbitMQ, so services will wait for dependencies to be ready before starting.
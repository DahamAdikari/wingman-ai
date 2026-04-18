## Step 1 - Install Docker
Install docker. Then run
```bash
docker-compose up
```

## Step 2 - Check RabbitMQ UI 
password and username: guest
http://localhost:15672/

## Step 3 - run node (content service)

visit to services/content-service
`cd services/content-service`

```bash
npm install
node index.js
```

http://localhost:5001/

## Step 4 - Test API
```bash
curl -X POST http://localhost:5001/create \
  -H "Content-Type: application/json" \
  -d '{"text":"My first content"}'
```
or POSTMAN

Method - POST
URL - http://localhost:5001/create
Body Type - JSON (raw)
Body - { "text": "My first content" }

# Step 5 - Test review-service
go to services/review-service
run
```bash
npm install
node index.js
```
Do step 4 again



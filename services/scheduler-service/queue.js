const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis({
    maxRetriesPerRequest: null
});

//Create a queue named scheduleQueue
const scheduleQueue = new Queue('scheduleQueue', {
    connection
});

module.exports = { scheduleQueue };
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { sendEvent } = require('./rabbit');

const connection = new IORedis({
    maxRetriesPerRequest: null
});

console.log("Worker started, waiting for scheduled jobs...");

const worker = new Worker(
    'scheduleQueue',
    async job => {
        const data = job.data;

        console.log("Time reached. Publishing", data.id);

        await sendEvent('READY_TO_PUBLISH', data);
    },
    { connection }
);

worker.on('completed', job => {
    console.log("Job completed", job.id);
});

worker.on('failed', (job,err)=>{
    console.log("Job failed", err);
});

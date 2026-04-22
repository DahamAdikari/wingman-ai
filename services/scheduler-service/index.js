const amqp = require('amqplib');
const { scheduleQueue } = require('./queue');


async function start(){
    const conn = await amqp.connect('amqp://localhost');
    const ch = await conn.createChannel();

    await ch.assertQueue('CONTENT_APPROVED');
    await ch.assertQueue('READY_TO_PUBLISH');

    console.log("Scheduler running...");

    ch.consume('CONTENT_APPROVED', async (msg) => {
        const data = JSON.parse(msg.content.toString());

        const scheduledTime = new Date(data.scheduled_time).getTime();
        if (isNaN(scheduledTime)) {
            console.log("Invalid date format:", data.scheduled_time);
            return;
        }
        const now = Date.now();

        const delay = scheduledTime - now;

        console.log("Caclulated delay:", delay);

        console.log("Scheduling content:", data.id);

        if(delay < 0){
            console.log("Time already passed -> publishing immediately");

            await sendEvent('READY_TO_PUBLISH', data);
            return;
        }

        // Add job with delay
        await scheduleQueue.add(
            'publish-job',
            data,
            {delay}
        );
    });

    
}

start();
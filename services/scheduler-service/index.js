const amqp = require('amqplib');

async function start(){
    const conn = await amqp.connect('amqp://localhost');
    const ch = await conn.createChannel();

    await ch.assertQueue('CONTENT_APPROVED');
    await ch.assertQueue('READY_TO_PUBLISH');

    console.log("Scheduler running...");

    ch.consume('CONTENT_APPROVED', msg =>{
        const data = JSON.parse(msg.content.toString());

        console.log("Scheduling content:", data.id);

        //Simulate delay (Like scheduled time)
        setTimeout(() => {
            console.log("Content ready to publish:", data.id);

            ch.sendToQueue(
                'READY_TO_PUBLISH',
                Buffer.from(JSON.stringify(data))
            );
        }, 5000); // Simulate 5-second delay
    });
}

start();
const amqp = require('amqplib');

async function start(){
    const conn = await amqp.connect('amqp://localhost');
    const ch = await conn.createChannel();

    //Declare the queues
    await ch.assertQueue('READY_TO_PUBLISH');
    await ch.assertQueue('POST_PUBLISHED');
    
    console.log("Publisher running...");

    ch.consume('READY_TO_PUBLISH', msg => {
        const data = JSON.parse(msg.content.toString());

        console.log("Publishing content:", data.id);

        //simulate publishing
        console.log("POST PUBLISHED:", data.id);

        //Emit final event
        ch.sendToQueue(
            'POST_PUBLISHED',
            Buffer.from(JSON.stringify(data))
        );
    });
}

start();
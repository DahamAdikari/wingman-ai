const amqp = require('amqplib');

async function start(){
    const conn = await amqp.connect('amqp://localhost');
    const ch = await conn.createChannel();

    await ch.assertQueue('CONTENT_CREATED');

    console.log('Waiting for events...');

    ch.consume('CONTENT_CREATED', msg =>{
        const data = JSON.parse(msg.content.toString());

        console.log("Received event:", data);

        //simulate approval
        console.log("Manager Approved:", data.id);
    });
}

start();
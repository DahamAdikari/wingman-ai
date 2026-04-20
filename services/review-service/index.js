const amqp = require('amqplib');

async function start(){
    const conn = await amqp.connect('amqp://localhost');
    const ch = await conn.createChannel();

    //Declare the queues
    await ch.assertQueue('CONTENT_CREATED');
    await ch.assertQueue('MANAGER_APPROVED');

    console.log('Waiting for events...');

    ch.consume('CONTENT_CREATED', msg =>{
        const data = JSON.parse(msg.content.toString());

        console.log("Received event:", data);

        //simulate approval
        console.log("Manager Approved:", data.id);

        //Send next event
        ch.sendToQueue('MANAGER_APPROVED', Buffer.from(JSON.stringify(data)));
    });
}

start();
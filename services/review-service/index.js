const amqp = require('amqplib');

async function start(){
    const conn = await amqp.connect('amqp://localhost');
    const ch = await conn.createChannel();

    //Declare the queues
    await ch.assertQueue('CONTENT_CREATED');
    await ch.assertQueue('MANAGER_APPROVED');
    await ch.assertQueue('CONTENT_APPROVED');
    
    console.log('Waiting for events...');
    // 1. Manager Approval
    ch.consume('CONTENT_CREATED', msg =>{
        const data = JSON.parse(msg.content.toString());

        console.log("Received content:", data);
        //simulate approval
        console.log("Manager Approved:", data.id);
        //Send next event
        ch.sendToQueue(
            'MANAGER_APPROVED',
            Buffer.from(JSON.stringify(data))
        );
    });

    // 2. Client Approval
    ch.consume('MANAGER_APPROVED', msg => {
        const data = JSON.parse(msg.content.toString());

        console.log("Client Approved:", data.id);

        ch.sendToQueue(
            'CONTENT_APPROVED',
            Buffer.from(JSON.stringify(data))
        );
    });
}

start();
 const amqp = require('amqplib');

 async function sendEvent(queue, data){
    const conn = await amqp.connect('amqp://localhost');
    const ch = await conn.createChannel();
    await ch.assertQueue(queue);

    ch.sendToQueue(queue, Buffer.from(JSON.stringify(data)));

    console.log("Event sent:", data)
 }

 module.exports = {sendEvent};

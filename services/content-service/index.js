//import libraries
const express = require('express');
const { sendEvent } = require('./rabbit');

//create express
const app = express();
app.use(express.json());

//basic API
app.get('/', (req, res)=>{
res.send('Content Service Running');
});

app.post('/create', async (req, res)=>{
    const {text} = req.body;

    const content = {
        id: Date.now(),
        text,
        status: 'CREATED'
    };

    // Send event to RabbitMQ
    await sendEvent('CONTENT_CREATED', content);

    res.json(content);
});

//listening part
app.listen(5001, ()=>{
console.log('Content Service Running on Port 5001')
});

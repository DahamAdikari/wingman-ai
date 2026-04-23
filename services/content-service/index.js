require('dotenv').config();
//import libraries
const express = require('express');
const { sendEvent } = require('./rabbit');
const {generateContent} = require('./gemini');
const pool = require('./db');


//create express
const app = express();
app.use(express.json());

//basic API
app.get('/', (req, res)=>{
res.send('Content Service Running');
});

app.post('/create', async (req, res)=>{
    

    const {prompt, scheduled_time} = req.body;

    //validation
    if(!prompt){
        return res.status(400).json({ error: "Prompt is required"});
    }

    try {
        console.log("Generating AI content...");

        //Call Gemini
        const aiData = await generateContent(prompt);

        console.log("AI content generated:", aiData);

        const content = {
            id: Date.now(),
            prompt,
            post: aiData.post,
            caption: aiData.caption,
            scheduled_time,
            status: 'CREATED'
        };

        //Save to DB - content_db, table: contents

        await pool.query(
            `INSERT INTO contents
            (id, prompt, post, caption, scheduled_time, status)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                content.id,
                content.prompt,
                content.post,
                content.caption,
                content.scheduled_time,
                content.status
            ]
        );

        console.log("Saved to DB:", content.id);


        //Send Event
        await sendEvent('CONTENT_CREATED', content);

        res.json(content);

        }catch (err){
            console.error("Error:", err);
            res.status(500).json({ error: "AI generation failed"});
        
    }
});

//listening part
app.listen(5001, ()=>{
console.log('Content Service Running on Port 5001')
});

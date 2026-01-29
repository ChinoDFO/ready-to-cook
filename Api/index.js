import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();

app.use(cors());

app.use(express.json());

app.post('/openai', async (req, res) => {
  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    }
  );

  res.json(await response.json());
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Proxy OpenAI listo en puerto ${PORT}`);
});

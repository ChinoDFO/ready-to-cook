import OpenAI from "openai";

export async function POST(req) {
  try {
    const body = await req.json();

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: body.model,
      messages: body.messages,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      top_p: body.top_p,
      presence_penalty: body.presence_penalty,
      frequency_penalty: body.frequency_penalty,
    });

    return Response.json(response);
  } catch (error) {
    console.error("OpenAI API error:", error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

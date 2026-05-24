import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

// Zscaler injects self-signed cert — bypass for Node native fetch in dev only.
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const client = new Anthropic();

const SYSTEM = `You are a reading comprehension quiz generator. Generate exactly 3 multiple-choice questions.
Rules:
- Questions must be answerable from the provided content only
- Each question has exactly 4 options (A, B, C, D)
- One option is clearly correct
- Hints should nudge without giving away the answer
- Return ONLY valid JSON, no markdown, no explanation`;

const USER_SUFFIX = (cp: number) => `
Return this exact JSON structure:
{
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 0,
      "hint": "..."
    }
  ]
}

These questions cover pages ${cp * 15 + 1}–${(cp + 1) * 15}.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, images, checkpoint } = body as {
      text?: string;
      images?: string[];
      checkpoint: number;
    };

    if (!text && (!images || images.length === 0)) {
      return NextResponse.json({ error: "text or images required" }, { status: 400 });
    }

    let message;

    if (images && images.length > 0) {
      // Vision path — scanned / image-based PDF
      const content: Anthropic.MessageParam["content"] = [
        ...images.map((img): Anthropic.ImageBlockParam => ({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: img.replace(/^data:image\/jpeg;base64,/, ""),
          },
        })),
        {
          type: "text",
          text: `Generate 3 multiple-choice comprehension questions from these book pages.${USER_SUFFIX(checkpoint)}`,
        },
      ];

      message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM,
        messages: [{ role: "user", content }],
      });
    } else {
      // Text path
      const truncated = (text as string).slice(0, 8000);
      message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Generate 3 multiple-choice comprehension questions from this text:\n\n${truncated}${USER_SUFFIX(checkpoint)}`,
          },
        ],
      });
    }

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "invalid AI response" }, { status: 500 });
    }

    const quiz = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ ...quiz, checkpoint });
  } catch (err) {
    console.error("generate-quiz error:", err);
    return NextResponse.json({ error: "quiz generation failed" }, { status: 500 });
  }
}

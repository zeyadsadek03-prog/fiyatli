export const runtime = "nodejs"

import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured" },
        { status: 500 }
      )
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-maverick-17b-128e-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Bu fotoğraftaki ürünü tanımlayın. Sadece ürün adını yazın, Türkçe olarak. Örnek: 'süt', 'domates', 'ekmek'. Hiçbir açıklama eklemeyin, sadece ürün adı.",
              },
              {
                type: "image_url",
                image_url: {
                  url: image,
                },
              },
            ],
          },
        ],
        max_tokens: 50,
      }),
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      return NextResponse.json(
        { error: `Vision API ${groqRes.status}: ${errText}` },
        { status: 502 }
      )
    }

    const groqData = await groqRes.json()
    const extractedText = groqData.choices?.[0]?.message?.content?.trim() || ""

    return NextResponse.json({ text: extractedText })
  } catch (error) {
    console.error("Vision route error:", error)
    return NextResponse.json(
      { error: "Fotoğraf ile arama başarısız oldu." },
      { status: 500 }
    )
  }
}

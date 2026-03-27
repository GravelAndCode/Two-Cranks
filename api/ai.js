export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { type, kit, itemName } = body;

    let prompt = "";

    if (type === "checkKit") {
      const itemList = kit.map(i =>
        `- ${i.name} (${i.category}, ${i.zone}${i.essential ? ", essential" : ""})`
      ).join("\n");

      prompt = `You are an expert bikepacking guide with deep knowledge of gear best practices.

A rider has the following gear in their bikepacking kit:
${itemList}

Analyze this kit and identify important items they might be forgetting. Focus on:
- Safety essentials (first aid, emergency shelter, navigation backup)
- Bike repair and maintenance (tools, spare tubes, chain lube, tire plugs)
- Clothing and weather protection
- Food and water systems
- Sleep system completeness
- Navigation
- Hygiene and personal care basics

Be specific and practical. Only flag genuinely missing categories or critical items - don't suggest things they clearly already have. Keep suggestions concise.

Respond ONLY with a JSON object in this exact format, no other text:
{
  "missing": [
    { "name": "Item name", "category": "Category", "reason": "One sentence why it matters" }
  ],
  "notes": "One or two sentence overall assessment of the kit"
}`;
    }

    if (type === "lookupWeight") {
      prompt = `You are a gear expert with extensive knowledge of bikepacking and outdoor equipment weights.

Look up the weight of this item: "${itemName}"

If you know the specific weight of this item from manufacturer specs, provide it.
If it's a generic item, provide a typical weight range and use the middle estimate.
If you genuinely don't know, say so.

Respond ONLY with a JSON object in this exact format, no other text:
{
  "found": true,
  "lbs": 0,
  "oz": 14.5,
  "note": "Source or caveat e.g. 'Big Agnes official spec' or 'Typical range 12-17oz, using midpoint'",
  "confidence": "high" 
}

Or if not found:
{
  "found": false,
  "note": "Could not find reliable weight data for this item"
}

confidence can be "high", "medium", or "low".
lbs should be whole number (floor), oz should be remaining ounces (0-15.9).`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Parse JSON from response
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("API error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
  }
}

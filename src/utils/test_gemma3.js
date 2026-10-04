async function test() {
  const img = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const prompt = `You are an architectural vision assistant for ApnaGhar (अपना घर).
Analyze this image.
1. Determine if this image is a genuine indoor room photograph (living room, bedroom, dining room, kitchen, office) or an unrelated subject (selfie, portrait of a person, animal/pet, vehicle, outdoor landscape, food, meme, document).
2. If it is an unrelated subject or a selfie, set is_indoor_room to false, suitability to "unsuitable", provide a clear unsuitable_reason, and keep suggestions empty [].
3. Only if it is a genuine indoor room, identify visible furniture and spatial layout.

Respond ONLY with a valid JSON object matching this schema:
{
  "is_indoor_room": boolean,
  "subject_type": "room" | "selfie" | "portrait" | "animal" | "vehicle" | "landscape" | "food" | "other",
  "suitability": "suitable" | "partially_suitable" | "unsuitable" | "uncertain",
  "explanation": "string explaining what is visible in the photo",
  "quality_issues": string[],
  "suggestions": []
}`;

  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3:4b',
        prompt,
        images: [img],
        stream: false,
        format: 'json'
      })
    });
    const data = await res.json();
    console.log('STATUS:', res.status);
    console.log('RESPONSE:', data.response);
  } catch (err) {
    console.error('ERROR:', err);
  }
}
test();

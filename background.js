// Runs in the extension's service worker: screenshots and the vision API call.
const MODEL = "gemini-2.5-flash"; // change if Google renames models

chrome.runtime.onMessage.addListener((msg, sender, send) => {
  if (msg.type === "CAPTURE") {
    chrome.tabs
      .captureVisibleTab(sender.tab.windowId, { format: "jpeg", quality: 80 })
      .then((url) => send({ url }))
      .catch((e) => send({ error: e.message }));
    return true;
  }
  if (msg.type === "SUGGEST") {
    suggest(msg).then(send).catch((e) => send({ error: e.message }));
    return true;
  }
});

async function suggest({ image, glossary, key }) {
  const prompt =
    "This is a frame from a first-person video of a worker doing a manual task. " +
    "Name the objects the worker's hands hold or touch, and any tool or machine in use. " +
    'Reply with only a JSON array of up to 5 short lowercase names, like ["cardboard box","tape roll"]. ' +
    (glossary && glossary.length ? "Prefer these exact names when they match: " + glossary.join(", ") + "." : "");
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: image.split(",")[1] } }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || "API error " + r.status);
  const raw = j.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const names = JSON.parse(raw.replace(/```json|```/g, "").trim());
  return { names: names.slice(0, 5).map(String) };
}

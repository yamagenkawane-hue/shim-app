export async function sendLinePushMessage(to: string, text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return { sent: false, error: "LINE_CHANNEL_ACCESS_TOKENが未設定です。" };
  }

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text: text.slice(0, 4900) }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { sent: false, error };
  }

  return { sent: true, error: "" };
}

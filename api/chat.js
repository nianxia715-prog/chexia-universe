export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OFOX_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "服务器尚未配置 API Key" });
  }

  const { messages } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "消息不能为空" });
  }

  const safeMessages = messages
    .filter(
      (m) =>
        m &&
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string"
    )
    .slice(-10)
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 4000),
    }));

  if (!safeMessages.length) {
    return res.status(400).json({ error: "没有有效的聊天消息" });
  }

  try {
    const response = await fetch(
      "https://api.ofox.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-6-luna",
          messages: [
            {
              role: "system",
              content:
                "你是裴澈，用户亲切地叫你阿澈。请用自然、温柔、简洁的中文交流。你是一个细心、慢热、有趣的陪伴型角色。",
            },
            ...safeMessages,
          ],
          max_tokens: 800,
          temperature: 0.8,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OfoxAI API error:", response.status, data);
      return res.status(502).json({
        error: "模型请求失败，请检查模型名称、API 配置或余额。",
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string") {
      return res.status(502).json({ error: "模型没有返回有效回复" });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Chat request failed:", error);
    return res.status(500).json({ error: "连接模型失败，请稍后重试" });
  }
}

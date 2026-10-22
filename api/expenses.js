// Vercel serverless function: list / add / delete expenses.
// Data lives in Upstash Redis (hash "expenses"). Two codes protect it:
//   VIEW_CODE: can only see the list (for appa)
//   EDIT_CODE: can see, add and delete (for you)

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

function roleOf(code) {
  if (!code) return null;
  if (process.env.EDIT_CODE && code === process.env.EDIT_CODE) return "edit";
  if (process.env.VIEW_CODE && code === process.env.VIEW_CODE) return "view";
  return null;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!URL_ || !TOKEN) return res.status(500).json({ error: "Database not connected (Upstash Redis)." });
  if (!process.env.EDIT_CODE) return res.status(500).json({ error: "EDIT_CODE is not set." });

  const role = roleOf(String(req.headers["x-code"] || ""));
  if (!role) return res.status(401).json({ error: "Wrong code" });

  try {
    if (req.method === "GET") {
      const flat = (await redis(["HGETALL", "expenses"])) || [];
      const items = [];
      for (let i = 1; i < flat.length; i += 2) {
        try { items.push({ id: flat[i - 1], ...JSON.parse(flat[i]) }); } catch (e) {}
      }
      return res.status(200).json({ role, items });
    }

    if (role !== "edit") return res.status(403).json({ error: "View only" });

    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const en = String(b.en || "").trim().slice(0, 100);
      const ta = String(b.ta || "").trim().slice(0, 100);
      const amt = Number(b.amt);
      const date = String(b.date || "");
      if (!en || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(amt) || amt < 0 || amt > 1e9) {
        return res.status(400).json({ error: "Invalid entry" });
      }
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const item = { date, en, ta, amt, ts: Date.now() };
      await redis(["HSET", "expenses", id, JSON.stringify(item)]);
      return res.status(200).json({ id, ...item });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id || "");
      if (!id) return res.status(400).json({ error: "id missing" });
      await redis(["HDEL", "expenses", id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
};

export const schema = `
  CREATE TABLE IF NOT EXISTS ip_high_scores (
    ip_address TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS leaderboard_players (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    last_seen INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS leaderboard_players_rank ON leaderboard_players (points DESC, last_seen DESC);
  CREATE TABLE IF NOT EXISTS leaderboard_balances (
    user_id TEXT PRIMARY KEY,
    cash INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS leaderboard_balances_rank ON leaderboard_balances (cash DESC);
  CREATE TABLE IF NOT EXISTS leaderboard_money_state (
    user_id TEXT PRIMARY KEY,
    revision INTEGER NOT NULL DEFAULT 0
  );
`;

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function hasAdminAccess(request) {
  return Boolean(
    request.headers.get("x-websim-user-id") &&
    request.headers.get("x-websim-username") === "0WN3R-X3N0"
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/leaderboard" && request.method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT players.username, COALESCE(balances.cash, 0) AS cash, players.last_seen, CASE WHEN players.last_seen >= ? THEN 1 ELSE 0 END AS online " +
        "FROM leaderboard_players AS players LEFT JOIN leaderboard_balances AS balances ON balances.user_id = players.user_id " +
        "ORDER BY cash DESC, players.username COLLATE NOCASE ASC"
      ).bind(Date.now() - 75000).all();
      return json({ players: results });
    }

    if (url.pathname === "/api/presence" && request.method === "POST") {
      const userId = request.headers.get("x-websim-user-id");
      if (!userId) return json({ error: "Sign in to sync your player data" }, 401);
      let body = {};
      try { body = await request.json(); } catch { /* Use the platform username. */ }
      const platformUsername = request.headers.get("x-websim-username") || "RIDER";
      const username = typeof body?.username === "string" && body.username.trim()
        ? body.username.trim().slice(0, 16)
        : platformUsername.slice(0, 16);
      const cash = Number.isSafeInteger(body?.cash) ? Math.max(0, Math.min(1000000000, body.cash)) : 0;
      const suppliedRevision = Number.isSafeInteger(body?.revision) ? body.revision : -1;
      const now = Date.now();
      await env.DB.prepare(
        "INSERT INTO leaderboard_players (user_id, username, points, last_seen) VALUES (?, ?, 0, ?) " +
        "ON CONFLICT(user_id) DO UPDATE SET username = excluded.username, last_seen = excluded.last_seen"
      ).bind(userId, username, now).run();
      await env.DB.prepare(
        "INSERT INTO leaderboard_balances (user_id, cash) VALUES (?, ?) " +
        "ON CONFLICT(user_id) DO UPDATE SET cash = CASE WHEN ? = COALESCE((SELECT revision FROM leaderboard_money_state WHERE user_id = ?), 0) THEN excluded.cash ELSE leaderboard_balances.cash END"
      ).bind(userId, cash, suppliedRevision, userId).run();
      const balance = await env.DB.prepare("SELECT cash FROM leaderboard_balances WHERE user_id = ?").bind(userId).first();
      const moneyState = await env.DB.prepare("SELECT revision FROM leaderboard_money_state WHERE user_id = ?").bind(userId).first();
      return json({ online: true, last_seen: now, cash: balance?.cash ?? 0, revision: moneyState?.revision ?? 0 });
    }

    if (url.pathname === "/api/players" && request.method === "GET") {
      const userId = request.headers.get("x-websim-user-id");
      if (!userId) return json({ error: "Sign in to pay another player" }, 401);
      const { results } = await env.DB.prepare(
        "SELECT players.user_id, players.username, CASE WHEN players.last_seen >= ? THEN 1 ELSE 0 END AS online " +
        "FROM leaderboard_players AS players " +
        "WHERE players.user_id != ? ORDER BY players.username COLLATE NOCASE ASC"
      ).bind(Date.now() - 75000, userId).all();
      return json({ players: results });
    }

    if (url.pathname === "/api/pay" && request.method === "POST") {
      const userId = request.headers.get("x-websim-user-id");
      if (!userId) return json({ error: "Sign in to pay another player" }, 401);
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid payment" }, 400); }
      const { playerId, amount } = body ?? {};
      if (typeof playerId !== "string" || !playerId || playerId === userId ||
          !Number.isSafeInteger(amount) || amount < 1 || amount > 1000000000) {
        return json({ error: "Choose a player and enter a whole amount above zero" }, 400);
      }
      const recipient = await env.DB.prepare("SELECT user_id FROM leaderboard_players WHERE user_id = ?").bind(playerId).first();
      if (!recipient) return json({ error: "Player not found" }, 404);
      const senderBalance = await env.DB.prepare("SELECT cash FROM leaderboard_balances WHERE user_id = ?").bind(userId).first();
      const recipientBalance = await env.DB.prepare("SELECT cash FROM leaderboard_balances WHERE user_id = ?").bind(playerId).first();
      if (!senderBalance || senderBalance.cash < amount) return json({ error: "Not enough cash" }, 400);
      if ((recipientBalance?.cash ?? 0) + amount > 1000000000) return json({ error: "That player cannot receive more cash right now" }, 400);

      const debit = await env.DB.batch([
        env.DB.prepare("UPDATE leaderboard_balances SET cash = cash - ? WHERE user_id = ? AND cash >= ?").bind(amount, userId, amount),
        env.DB.prepare("INSERT INTO leaderboard_money_state (user_id, revision) VALUES (?, 1) ON CONFLICT(user_id) DO UPDATE SET revision = revision + 1").bind(userId),
      ]);
      if (!debit[0]?.meta?.changes) return json({ error: "Not enough cash" }, 400);

      await env.DB.batch([
        env.DB.prepare("INSERT INTO leaderboard_balances (user_id, cash) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET cash = cash + excluded.cash").bind(playerId, amount),
        env.DB.prepare("INSERT INTO leaderboard_money_state (user_id, revision) VALUES (?, 1) ON CONFLICT(user_id) DO UPDATE SET revision = revision + 1").bind(playerId),
      ]);
      const balance = await env.DB.prepare("SELECT cash FROM leaderboard_balances WHERE user_id = ?").bind(userId).first();
      const moneyState = await env.DB.prepare("SELECT revision FROM leaderboard_money_state WHERE user_id = ?").bind(userId).first();
      return json({ cash: balance?.cash ?? 0, revision: moneyState?.revision ?? 0 });
    }

    if (url.pathname === "/api/admin/access" && request.method === "GET") {
      if (!hasAdminAccess(request)) return json({ error: "Forbidden" }, 403);
      return json({ allowed: true });
    }

    if (url.pathname === "/api/admin/players" && request.method === "GET") {
      if (!hasAdminAccess(request)) return json({ error: "Forbidden" }, 403);
      const { results } = await env.DB.prepare(
        "SELECT players.user_id, players.username, COALESCE(balances.cash, 0) AS cash, players.last_seen, CASE WHEN players.last_seen >= ? THEN 1 ELSE 0 END AS online " +
        "FROM leaderboard_players AS players LEFT JOIN leaderboard_balances AS balances ON balances.user_id = players.user_id " +
        "ORDER BY players.username COLLATE NOCASE ASC"
      ).bind(Date.now() - 75000).all();
      return json({ players: results });
    }

    if (url.pathname === "/api/admin/money" && request.method === "POST") {
      if (!hasAdminAccess(request)) return json({ error: "Forbidden" }, 403);
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid command" }, 400); }
      const { playerId, action, amount } = body ?? {};
      if (typeof playerId !== "string" || !playerId || !["set", "add"].includes(action) ||
          !Number.isSafeInteger(amount) || amount < 0 || amount > 1000000000) {
        return json({ error: "Choose a player, action, and whole amount from 0 to 1,000,000,000" }, 400);
      }
      const player = await env.DB.prepare("SELECT user_id FROM leaderboard_players WHERE user_id = ?").bind(playerId).first();
      if (!player) return json({ error: "Player not found" }, 404);
      const balanceWrite = action === "set"
        ? env.DB.prepare("INSERT INTO leaderboard_balances (user_id, cash) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET cash = excluded.cash").bind(playerId, amount)
        : env.DB.prepare("INSERT INTO leaderboard_balances (user_id, cash) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET cash = MIN(1000000000, cash + excluded.cash)").bind(playerId, amount);
      await env.DB.batch([
        balanceWrite,
        env.DB.prepare("INSERT INTO leaderboard_money_state (user_id, revision) VALUES (?, 1) ON CONFLICT(user_id) DO UPDATE SET revision = revision + 1").bind(playerId),
      ]);
      const balance = await env.DB.prepare("SELECT cash FROM leaderboard_balances WHERE user_id = ?").bind(playerId).first();
      return json({ cash: balance?.cash ?? 0 });
    }

    if (url.pathname === "/api/admin/high-scores" && request.method === "GET") {
      if (!hasAdminAccess(request)) return json({ error: "Forbidden" }, 403);
      const { results } = await env.DB
        .prepare("SELECT ip_address, points, updated_at FROM ip_high_scores ORDER BY points DESC, updated_at DESC LIMIT 100")
        .all();
      return json({ scores: results });
    }

    if (url.pathname !== "/api/high-score") return new Response("Not found", { status: 404 });

    if (request.method === "GET") {
      const userId = request.headers.get("x-websim-user-id");
      if (!userId) return json({ best: 0, canSave: false });
      const ipAddress = request.headers.get("cf-connecting-ip")?.trim();
      if (!ipAddress) return json({ error: "Network address unavailable" }, 503);
      const row = await env.DB
        .prepare("SELECT points FROM ip_high_scores WHERE ip_address = ?")
        .bind(ipAddress)
        .first();
      const displayName = (request.headers.get("x-websim-username") || "RIDER").slice(0, 16);
      await env.DB.prepare(
        "INSERT INTO leaderboard_players (user_id, username, points, last_seen) VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(user_id) DO UPDATE SET points = MAX(points, excluded.points), last_seen = excluded.last_seen"
      ).bind(userId, displayName, row?.points ?? 0, Date.now()).run();
      return json({ best: row?.points ?? 0, canSave: true });
    }

    if (request.method === "POST") {
      const userId = request.headers.get("x-websim-user-id");
      if (!userId) return json({ error: "Sign in to save a high score" }, 401);
      const ipAddress = request.headers.get("cf-connecting-ip")?.trim();
      if (!ipAddress) return json({ error: "Network address unavailable" }, 503);

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid score" }, 400);
      }
      const points = body?.points;
      if (!Number.isSafeInteger(points) || points < 0 || points > 1000000000) {
        return json({ error: "Invalid score" }, 400);
      }
      const platformUsername = request.headers.get("x-websim-username") || "RIDER";
      const username = typeof body.username === "string" && body.username.trim()
        ? body.username.trim().slice(0, 16)
        : platformUsername.slice(0, 16);

      const writeResult = await env.DB.prepare(
        "INSERT INTO ip_high_scores (ip_address, user_id, points, updated_at) VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(ip_address) DO UPDATE SET user_id = excluded.user_id, points = excluded.points, updated_at = excluded.updated_at " +
        "WHERE excluded.points > ip_high_scores.points"
      ).bind(ipAddress, userId, points, Date.now()).run();

      const row = await env.DB
        .prepare("SELECT points FROM ip_high_scores WHERE ip_address = ?")
        .bind(ipAddress)
        .first();
      await env.DB.prepare(
        "INSERT INTO leaderboard_players (user_id, username, points, last_seen) VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(user_id) DO UPDATE SET username = excluded.username, points = MAX(points, excluded.points), last_seen = excluded.last_seen"
      ).bind(userId, username, points, Date.now()).run();
      return json({ best: row?.points ?? points, improved: writeResult.meta.changes > 0 });
    }

    return json({ error: "Method not allowed" }, 405);
  },
};

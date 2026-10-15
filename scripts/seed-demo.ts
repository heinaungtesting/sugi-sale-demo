// Demo-only seed: fictional staff accounts and sales history.
// Runs during the Vercel build after migrations and the (fictional) catalog seed.
// Idempotent: users are upserted, sales history is only created when a user has none.
import 'dotenv/config';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('DIRECT_URL or DATABASE_URL is required');

const pool = new Pool({ connectionString, options: '-c search_path=sugi,public' });

type DemoUser = { username: string; displayName: string; pin: string; role: 'admin' | 'user'; history: boolean };

const users: DemoUser[] = [
  { username: 'demo', displayName: 'デモ スタッフ', pin: process.env.DEMO_USER_PIN ?? '123456', role: 'user', history: true },
  { username: 'staff-a', displayName: '佐藤（架空）', pin: process.env.DEMO_OTHER_PIN ?? cryptoPin(), role: 'user', history: true },
  { username: 'staff-b', displayName: '鈴木（架空）', pin: process.env.DEMO_OTHER_PIN ?? cryptoPin(), role: 'user', history: true },
];
if (process.env.DEMO_ADMIN_PIN) {
  users.push({ username: 'demo-admin', displayName: 'デモ 管理者', pin: process.env.DEMO_ADMIN_PIN, role: 'admin', history: false });
}

function cryptoPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Deterministic pseudo-random so every rebuild produces the same history.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function jstDate(daysAgo: number): string {
  const now = new Date(Date.now() + 9 * 3600 * 1000 - daysAgo * 86400 * 1000);
  return now.toISOString().slice(0, 10);
}

async function main() {
  const client = await pool.connect();
  try {
    const variants = await client.query<{ product_id: string; name: string; points: number }>(
      `SELECT p.id AS product_id, p.product_name || ' ' || v.variant_label AS name, v.point_value AS points
       FROM product_variants v JOIN products p ON p.id = v.product_id
       WHERE p.is_active AND v.is_active AND p.user_id IS NULL
       ORDER BY p.id, v.id`,
    );
    if (variants.rowCount === 0) throw new Error('catalog is empty; run the catalog seed first');

    for (const [index, user] of users.entries()) {
      const pinHash = await bcrypt.hash(user.pin, 10);
      const saved = await client.query<{ id: string }>(
        `INSERT INTO sugi_users (username, display_name, pin_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (username) DO UPDATE
         SET display_name = EXCLUDED.display_name, role = EXCLUDED.role, is_active = TRUE,
             pin_hash = CASE WHEN $5 THEN EXCLUDED.pin_hash ELSE sugi_users.pin_hash END,
             updated_at = now()
         RETURNING id`,
        [user.username, user.displayName, pinHash, user.role, user.username === 'demo' || user.role === 'admin'],
      );
      const userId = saved.rows[0].id;
      if (!user.history) continue;

      const existing = await client.query('SELECT 1 FROM sales_logs WHERE user_id = $1 LIMIT 1', [userId]);
      if (existing.rowCount) continue;

      const random = rng(42 + index);
      await client.query('BEGIN');
      for (let day = 1; day <= 21; day += 1) {
        if (random() < 0.25) continue; // days off
        const picks = 2 + Math.floor(random() * 5);
        const used = new Set<number>();
        for (let i = 0; i < picks; i += 1) {
          const v = Math.floor(random() * variants.rows.length);
          if (used.has(v)) continue;
          used.add(v);
          const row = variants.rows[v];
          await client.query(
            `INSERT INTO sales_logs (sold_date, user_id, product_id, product_name, quantity, points_per_item, created_at)
             VALUES ($1::date, $2, $3, $4, $5, $6, ($1::date + time '10:00' + ($7 || ' minutes')::interval) AT TIME ZONE 'Asia/Tokyo')`,
            [jstDate(day), userId, row.product_id, row.name, 1 + Math.floor(random() * 2), row.points, String(Math.floor(random() * 600))],
          );
        }
      }
      await client.query('COMMIT');
    }
    console.log(`demo seed ready: ${users.map((u) => u.username).join(', ')}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('demo seed failed', error);
  process.exitCode = 1;
});

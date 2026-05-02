import pkg from "pg";
const { Client } = pkg;

// 🔹 SOURCE DB (old)
const source = new Client({
  connectionString:
    "postgresql://postgres:0LFKi5qO3PSyBbTi@db.tpmtnqhyazuezhpumodu.supabase.co:5432/postgres?sslmode=require",
});

// 🔹 TARGET DB (new)
const target = new Client({
  connectionString:
    "postgresql://postgres:zWtRGw40pbew99KZ@db.ozlxqcavwkkxllyovuac.supabase.co:5432/postgres?sslmode=require",
});

async function copyAllTables() {
  await source.connect();
  await target.connect();

  console.log("Connected to both databases");

  // Get all tables
  const tablesRes = await source.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `);

  for (const row of tablesRes.rows) {
    const table = row.table_name;

    console.log(`\nCopying table: ${table}`);

    // Get data
    const dataRes = await source.query(`SELECT * FROM ${table}`);

    if (!dataRes.rows.length) {
      console.log("No data");
      continue;
    }

    // Clear target table
    await target.query(`TRUNCATE TABLE ${table} CASCADE`);

    // Insert row by row
    for (const r of dataRes.rows) {
      const keys = Object.keys(r);
      const values = Object.values(r);

      const cols = keys.map((k) => `"${k}"`).join(",");
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(",");

      await target.query(
        `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`,
        values
      );
    }

    console.log(`Copied ${dataRes.rows.length} rows`);
  }

  await source.end();
  await target.end();

  console.log("\n✅ FULL DATABASE COPIED");
}

copyAllTables().catch(console.error);

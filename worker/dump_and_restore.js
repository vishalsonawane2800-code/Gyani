import pkg from "pg";
const { Client } = pkg;

// SOURCE DB
const source = new Client({
  connectionString:
    "postgresql://postgres:0LFKi5qO3PSyBbTi@db.tpmtnqhyazuezhpumodu.supabase.co:5432/postgres?sslmode=require",
});

// TARGET DB
const target = new Client({
  connectionString:
    "postgresql://postgres:zWtRGw40pbew99KZ@db.ozlxqcavwkkxllyovuac.supabase.co:5432/postgres?sslmode=require",
});

async function cloneDB() {
  await source.connect();
  await target.connect();

  console.log("Connected ✅");

  // Get schema
  const tables = await source.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);

  for (const t of tables.rows) {
    const table = t.table_name;

    console.log("Copying:", table);

    const res = await source.query(`SELECT * FROM ${table}`);

    if (!res.rows.length) continue;

    await target.query(`TRUNCATE TABLE ${table} CASCADE`);

    for (const row of res.rows) {
      const keys = Object.keys(row);
      const values = Object.values(row);

      const cols = keys.map((k) => `"${k}"`).join(",");
      const params = keys.map((_, i) => `$${i + 1}`).join(",");

      await target.query(
        `INSERT INTO ${table} (${cols}) VALUES (${params})`,
        values
      );
    }

    console.log(`Copied ${res.rows.length} rows`);
  }

  console.log("✅ FULL COPY DONE");

  await source.end();
  await target.end();
}

cloneDB().catch(console.error);

const { Pool } = require("pg");

async function main() {
  const ionId = process.argv[2];

  if (!ionId) {
    console.error("Please provide an Ion ID: node setadmin.js <ionId>");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const result = await pool.query('SELECT * FROM "User" WHERE "ionId" = $1', [
      ionId,
    ]);

    if (result.rows.length === 0) {
      console.error(`User with Ion ID ${ionId} not found.`);
      process.exit(1);
    }

    const user = result.rows[0];
    const roles = [...new Set([...user.roles, "admin"])];

    await pool.query('UPDATE "User" SET "roles" = $1 WHERE "id" = $2', [
      roles,
      user.id,
    ]);

    console.log(
      `Successfully added 'admin' role to user ${ionId} (${user.name || "Unknown Name"}).`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

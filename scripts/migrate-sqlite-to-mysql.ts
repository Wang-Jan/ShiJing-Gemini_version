import "dotenv/config";
import * as path from "path";
import sqlite3 from "sqlite3";
import { createMySqlPool, UserRow } from "../src/server/mysql";

interface SqliteUserRow {
  account_id: string;
  nickname: string;
  password: string;
  avatar: string | null;
}

const sqlitePath = process.env.SQLITE_MIGRATION_PATH || path.join(process.cwd(), "database.sqlite");

const loadSqliteUsers = async () => {
  const db = new sqlite3.Database(sqlitePath);

  try {
    const users = await new Promise<SqliteUserRow[]>((resolve, reject) => {
      db.all(
        "SELECT account_id, nickname, password, avatar FROM users ORDER BY id ASC",
        (error, rows: SqliteUserRow[]) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(rows);
        }
      );
    });

    return users;
  } finally {
    await new Promise<void>((resolve, reject) => {
      db.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
};

async function main() {
  console.log(`正在读取 SQLite 数据: ${sqlitePath}`);
  const sqliteUsers = await loadSqliteUsers();
  console.log(`读取到 ${sqliteUsers.length} 条用户记录`);

  const pool = await createMySqlPool();

  try {
    for (const user of sqliteUsers) {
      await pool.execute(
        `
          INSERT INTO users (account_id, nickname, password, avatar)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nickname = VALUES(nickname),
            password = VALUES(password),
            avatar = VALUES(avatar)
        `,
        [user.account_id, user.nickname, user.password, user.avatar]
      );
    }

    const [rows] = await pool.execute<UserRow[]>(
      "SELECT id, account_id, nickname, password, avatar FROM users ORDER BY id DESC LIMIT 5"
    );

    console.log("迁移完成，MySQL 中最近 5 条用户记录:");
    console.log(
      rows.map((row) => ({
        id: row.id,
        account_id: row.account_id,
        nickname: row.nickname,
        hasAvatar: !!row.avatar,
      }))
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("SQLite -> MySQL 迁移失败:", error);
  process.exitCode = 1;
});

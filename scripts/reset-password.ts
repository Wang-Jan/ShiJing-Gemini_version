import "dotenv/config";
import bcrypt from "bcryptjs";
import { ResultSetHeader } from "mysql2/promise";
import { createMySqlPool } from "../src/server/mysql";

const [accountId, newPassword] = process.argv.slice(2);

const usage = `用法:
npm run reset-password -- <accountId> <newPassword>

示例:
npm run reset-password -- 9445349 Pass123!`;

async function main() {
  if (!accountId || !newPassword) {
    console.error(usage);
    process.exitCode = 1;
    return;
  }

  if (newPassword.length < 6) {
    console.error("新密码长度至少需要 6 位。");
    process.exitCode = 1;
    return;
  }

  const pool = await createMySqlPool();

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const [result] = await pool.execute<ResultSetHeader>(
      "UPDATE users SET password = ? WHERE account_id = ?",
      [hashedPassword, accountId.trim()]
    );

    if (result.affectedRows === 0) {
      console.error(`未找到账号 ${accountId}`);
      process.exitCode = 1;
      return;
    }

    console.log(`账号 ${accountId} 的密码已重置。`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("重置密码失败:", error);
  process.exitCode = 1;
});

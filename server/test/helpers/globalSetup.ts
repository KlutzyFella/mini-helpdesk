import { execFileSync } from "node:child_process";

export default function setup(): void {
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env },
  });
}

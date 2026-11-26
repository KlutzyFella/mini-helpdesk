import { pathToFileURL } from "node:url";
import { config as defaultConfig, type Config } from "../config/env.ts";
import { Role } from "../generated/prisma/client.ts";
import type { TicketCategory, TicketPriority, TicketStatus } from "../generated/prisma/client.ts";
import { prisma } from "../lib/prisma.ts";
import { hashPassword } from "../modules/auth/auth.service.ts";

const DEMO_EMAILS = ["alice@example.com", "bob@example.com"] as const;

interface SampleTicket {
  owner: 0 | 1;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
}

const SAMPLE_TICKETS: SampleTicket[] = [
  { owner: 0, title: "Cannot log in on mobile", description: "The login button does nothing on my phone.", category: "BUG", priority: "HIGH", status: "OPEN" },
  { owner: 0, title: "Charged twice this month", description: "My card shows two charges for the same plan.", category: "BILLING", priority: "URGENT", status: "IN_PROGRESS" },
  { owner: 0, title: "Change my account email", description: "I need to move my account to a new address.", category: "ACCOUNT", priority: "LOW", status: "RESOLVED" },
  { owner: 1, title: "Dark mode please", description: "A dark theme would help at night.", category: "FEATURE_REQUEST", priority: "LOW", status: "OPEN" },
  { owner: 1, title: "Export fails with large files", description: "Exporting over 10 MB times out.", category: "BUG", priority: "MEDIUM", status: "IN_PROGRESS" },
  { owner: 1, title: "Question about invoices", description: "Where can I download past invoices?", category: "OTHER", priority: "MEDIUM", status: "CLOSED" },
];

export async function seed(cfg: Config = defaultConfig): Promise<void> {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, DEMO_PASSWORD: demoPassword } = cfg;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set to run the seed");
  }

  const upsert = async (name: string, email: string, password: string, role: Role) => {
    const passwordHash = await hashPassword(password);
    return prisma.user.upsert({
      where: { email },
      create: { name, email, passwordHash, role },
      update: { name, passwordHash, role },
    });
  };

  await upsert("Admin", ADMIN_EMAIL.trim().toLowerCase(), ADMIN_PASSWORD, Role.ADMIN);
  const [alice, bob] = await Promise.all([
    upsert("Alice Demo", DEMO_EMAILS[0], demoPassword, Role.USER),
    upsert("Bob Demo", DEMO_EMAILS[1], demoPassword, Role.USER),
  ]);

  if ((await prisma.ticket.count()) > 0) return;
  const owners = [alice, bob];
  await prisma.ticket.createMany({
    data: SAMPLE_TICKETS.map(({ owner, ...ticket }) => ({
      ...ticket,
      createdById: owners[owner]!.id,
      resolvedAt: ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? new Date() : null,
    })),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed()
    .then(() => console.log("Seed complete"))
    .catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

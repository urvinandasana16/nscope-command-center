import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demoClientIds = [
  "abc-pvt-ltd",
  "dc-jewellers",
  "techpontis",
  "white-canvas-tech",
];

async function main() {
  const demoClients = await prisma.client.findMany({
    where: { id: { in: demoClientIds } },
    select: { id: true, name: true },
  });
  const existingDemoIds = demoClients.map((client) => client.id);

  if (!existingDemoIds.length) {
    console.log("No known demo clients found. Nothing to delete.");
    return;
  }

  console.log(`Deleting demo clients only: ${demoClients.map((client) => `${client.name} (${client.id})`).join(", ")}`);

  const demoDevices = await prisma.device.findMany({
    where: { clientId: { in: existingDemoIds } },
    select: { id: true },
  });
  const demoDeviceIds = demoDevices.map((device) => device.id);

  const ticketComments = await prisma.ticketComment.deleteMany({
    where: { ticket: { clientId: { in: existingDemoIds } } },
  });
  const tickets = await prisma.ticket.deleteMany({
    where: { clientId: { in: existingDemoIds } },
  });
  const installedSoftware = await prisma.installedSoftware.deleteMany({
    where: { deviceId: { in: demoDeviceIds } },
  });
  const heartbeats = await prisma.agentHeartbeat.deleteMany({
    where: { deviceId: { in: demoDeviceIds } },
  });
  const metrics = await prisma.deviceMetric.deleteMany({
    where: { deviceId: { in: demoDeviceIds } },
  });
  const tasks = await prisma.agentTask.deleteMany({
    where: { deviceId: { in: demoDeviceIds } },
  });
  const agents = await prisma.agent.deleteMany({
    where: { deviceId: { in: demoDeviceIds } },
  });
  const assets = await prisma.asset.deleteMany({
    where: { clientId: { in: existingDemoIds } },
  });
  const networkDevices = await prisma.networkDevice.deleteMany({
    where: { clientId: { in: existingDemoIds } },
  });
  const installTokens = await prisma.agentInstallToken.deleteMany({
    where: { clientId: { in: existingDemoIds } },
  });
  const devices = await prisma.device.deleteMany({
    where: { clientId: { in: existingDemoIds } },
  });
  const sites = await prisma.site.deleteMany({
    where: { clientId: { in: existingDemoIds } },
  });
  const users = await prisma.user.deleteMany({
    where: {
      OR: [
        { clientId: { in: existingDemoIds } },
        { email: { in: ["pushpendra@nscope.local", "mehul@nscope.local", "archan@nscope.local", "client.admin@whitecanvas.local"] } },
      ],
      NOT: { email: "admin@nscope.local" },
    },
  });
  const clients = await prisma.client.deleteMany({
    where: { id: { in: existingDemoIds } },
  });

  console.log("Cleanup complete:");
  console.log(`- ticket comments: ${ticketComments.count}`);
  console.log(`- tickets: ${tickets.count}`);
  console.log(`- installed software rows: ${installedSoftware.count}`);
  console.log(`- heartbeats: ${heartbeats.count}`);
  console.log(`- metrics: ${metrics.count}`);
  console.log(`- tasks: ${tasks.count}`);
  console.log(`- agents: ${agents.count}`);
  console.log(`- assets: ${assets.count}`);
  console.log(`- network devices: ${networkDevices.count}`);
  console.log(`- agent install tokens: ${installTokens.count}`);
  console.log(`- devices: ${devices.count}`);
  console.log(`- sites: ${sites.count}`);
  console.log(`- demo users: ${users.count}`);
  console.log(`- clients: ${clients.count}`);
  console.log("Protected real data such as nscope.biz, ahemdabad, Pushpendra-AHM, and admin@nscope.local was not targeted.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

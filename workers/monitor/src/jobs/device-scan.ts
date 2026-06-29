import { Worker } from "bullmq";
import { db } from "@aegis/db";
import { connection } from "../queue";
import { pushToHousehold } from "../integrations/notifications";
import axios from "axios";

async function checkIpVulnerabilities(ip: string): Promise<{ openPorts: number[]; riskFlags: string[] }> {
  try {
    const res = await axios.get(`https://api.shodan.io/shodan/host/${ip}`, {
      params: { key: process.env.SHODAN_API_KEY },
      timeout: 10_000,
    });
    const openPorts: number[] = res.data.ports ?? [];
    const riskFlags: string[] = [];
    const riskyPorts = [21, 22, 23, 3389, 5900, 8080, 8443];
    for (const p of riskyPorts) {
      if (openPorts.includes(p)) riskFlags.push(`Port ${p} exposed`);
    }
    return { openPorts, riskFlags };
  } catch {
    return { openPorts: [], riskFlags: [] };
  }
}

function calculateDeviceRiskScore(vuln: { severity: string }[]): number {
  let score = 0;
  for (const v of vuln) {
    if (v.severity === "CRITICAL") score += 30;
    else if (v.severity === "HIGH") score += 20;
    else if (v.severity === "MEDIUM") score += 10;
    else if (v.severity === "LOW") score += 5;
  }
  return Math.min(100, score);
}

export function startDeviceScanWorker() {
  return new Worker(
    "device-scan",
    async (job) => {
      const { householdId } = job.data;

      const devices = await db.device.findMany({
        where: { householdId },
        include: { vulnerabilities: { where: { resolvedAt: null } } },
      });

      const networkScanData: { openPorts: number[]; riskFlags: string[]; unknownDevices: number } = {
        openPorts: [],
        riskFlags: [],
        unknownDevices: 0,
      };

      let newVulnerabilities = 0;

      for (const device of devices) {
        if (!device.ipAddress) continue;

        const { openPorts, riskFlags } = await checkIpVulnerabilities(device.ipAddress);
        networkScanData.openPorts.push(...openPorts);
        networkScanData.riskFlags.push(...riskFlags);

        // Mark offline if not seen in last 2 hours
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        if (device.lastSeenAt && device.lastSeenAt < twoHoursAgo) {
          await db.device.update({ where: { id: device.id }, data: { isOnline: false } });
        }

        // Check for risky open ports and create vulnerabilities
        for (const flag of riskFlags) {
          const exists = device.vulnerabilities.some((v) => v.title === flag);
          if (!exists) {
            await db.deviceVulnerability.create({
              data: {
                deviceId: device.id,
                title: flag,
                description: `${flag} detected on ${device.name}. This port may allow unauthorized access.`,
                severity: "MEDIUM",
                remediation: "Close this port in your router or firewall settings if not in use.",
              },
            });
            newVulnerabilities++;
          }
        }

        // Update device risk score
        const vulns = await db.deviceVulnerability.findMany({ where: { deviceId: device.id, resolvedAt: null } });
        const riskScore = calculateDeviceRiskScore(vulns);
        await db.device.update({ where: { id: device.id }, data: { riskScore } });

        // Create DEVICE_VULN alert for high-risk devices
        if (riskScore >= 60) {
          const existingAlert = await db.alert.findFirst({
            where: { deviceId: device.id, category: "DEVICE_VULN", status: { in: ["NEW", "ACKNOWLEDGED"] } },
          });
          if (!existingAlert) {
            await db.alert.create({
              data: {
                householdId,
                deviceId: device.id,
                category: "DEVICE_VULN",
                severity: riskScore >= 80 ? "HIGH" : "MEDIUM",
                title: `Device at risk: ${device.name}`,
                description: `${device.name} has a risk score of ${riskScore}/100. ${vulns.length} vulnerability${vulns.length !== 1 ? "ies" : "y"} detected.`,
                rawData: { riskScore, vulnerabilities: vulns.map((v) => v.title) },
                remediationSteps: {
                  create: [
                    { order: 1, title: "Review open ports", description: "Check which ports are open and close any that are unused.", actionType: "MANUAL" },
                    { order: 2, title: "Update device firmware", description: `Check for firmware updates for ${device.name}.`, actionType: "MANUAL" },
                    { order: 3, title: "Enable device firewall", description: "Ensure the device firewall is active.", actionType: "MANUAL" },
                  ],
                },
              },
            });
            await pushToHousehold(householdId, "new-alert", { category: "DEVICE_VULN", deviceName: device.name, riskScore });
          }
        }

        await new Promise((r) => setTimeout(r, 1000));
      }

      // Save network scan
      await db.networkScan.create({
        data: {
          householdId,
          openPorts: [...new Set(networkScanData.openPorts)],
          deviceCount: devices.length,
          unknownDevices: networkScanData.unknownDevices,
          riskFlags: [...new Set(networkScanData.riskFlags)],
        },
      });

      return { devicesScanned: devices.length, newVulnerabilities };
    },
    { connection, concurrency: 2 }
  );
}

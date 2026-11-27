/**
 * Firebase utilities for Alert System
 * Handles Realtime Database operations for thresholds, incidents, snooze logs, and statistics
 */

import { get, update, push } from "../../../../../Components/firebase/api/db";
import {
  MachineThresholds,
  AlertIncident,
  SnoozeLog,
  AlertStats,
} from "./types";
import { normalizeThresholds } from "./thresholdTemplates";

/**
 * Save or update machine thresholds
 */
export const saveMachineThresholds = async (
  thresholds: MachineThresholds,
): Promise<void> => {
  const path = `machineAlertThresholds/${thresholds.machineId}`;
  await update(path, {
    ...thresholds,
    thresholds: normalizeThresholds(thresholds.thresholds),
    updatedAt: Date.now(),
  });
};

/**
 * Load machine thresholds
 */
export const loadMachineThresholds = async (
  machineId: string,
): Promise<MachineThresholds | null> => {
  const path = `machineAlertThresholds/${machineId}`;
  const snapshot = await get(path);

  if (snapshot.exists()) {
    const machineThresholds = snapshot.val() as MachineThresholds;

    return {
      ...machineThresholds,
      thresholds: normalizeThresholds(machineThresholds.thresholds),
    };
  }

  return null;
};

/**
 * Create a new alert incident
 */
export const createAlertIncident = async (
  incident: Omit<AlertIncident, "id">,
): Promise<string> => {
  const path = `alertIncidents/${incident.machineId}`;
  const newIncidentRef = await push(path, {
    ...incident,
    status: "active",
  });

  return newIncidentRef.key!;
};

/**
 * Update an existing alert incident
 */
export const updateAlertIncident = async (
  machineId: string,
  incidentId: string,
  updates: Partial<AlertIncident>,
): Promise<void> => {
  const path = `alertIncidents/${machineId}/${incidentId}`;
  await update(path, updates);
};

/**
 * Get active alerts for a machine
 */
export const getActiveAlerts = async (
  machineId: string,
): Promise<AlertIncident[]> => {
  const path = `alertIncidents/${machineId}`;
  const snapshot = await get(path);

  if (!snapshot.exists()) {
    return [];
  }

  const incidents: AlertIncident[] = [];
  const data = snapshot.val();

  Object.entries(data).forEach(([id, incident]: [string, any]) => {
    if (incident.status === "active" || incident.status === "snoozed") {
      incidents.push({ id, ...incident });
    }
  });

  // Sort by startTime descending
  return incidents.sort((a, b) => b.startTime - a.startTime).slice(0, 100);
};

/**
 * Get alert history for a machine
 */
export const getAlertHistory = async (
  machineId: string,
  startDate: number,
  endDate: number,
  limitCount: number = 100,
): Promise<AlertIncident[]> => {
  const path = `alertIncidents/${machineId}`;
  const snapshot = await get(path);

  if (!snapshot.exists()) {
    return [];
  }

  const incidents: AlertIncident[] = [];
  const data = snapshot.val();

  Object.entries(data).forEach(([id, incident]: [string, any]) => {
    if (incident.startTime >= startDate && incident.startTime <= endDate) {
      incidents.push({ id, ...incident });
    }
  });

  // Sort by startTime descending and limit
  return incidents
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, limitCount);
};

/**
 * Create a snooze log entry
 */
export const createSnoozeLog = async (
  log: Omit<SnoozeLog, "id">,
): Promise<string> => {
  const path = `snoozeLogs/${log.machineId}`;
  const newLogRef = await push(path, log);

  return newLogRef.key!;
};

/**
 * Update snooze log when alert resumes
 */
export const updateSnoozeLog = async (
  machineId: string,
  logId: string,
  resumedAt: number,
  resumed: boolean,
): Promise<void> => {
  const path = `snoozeLogs/${machineId}/${logId}`;
  await update(path, {
    resumedAt,
    resumed,
  });
};

/**
 * Get alert statistics for a machine
 */
export const getAlertStats = async (
  machineId: string,
  startDate: number,
  endDate: number,
): Promise<AlertStats[]> => {
  const path = `alertStats/${machineId}`;
  const snapshot = await get(path);

  if (!snapshot.exists()) {
    return [];
  }

  const stats: AlertStats[] = [];
  const data = snapshot.val();

  const startDateStr = new Date(startDate).toISOString().split("T")[0];
  const endDateStr = new Date(endDate).toISOString().split("T")[0];

  Object.entries(data).forEach(([id, stat]: [string, any]) => {
    if (stat.date >= startDateStr && stat.date <= endDateStr) {
      stats.push({ id, ...stat });
    }
  });

  // Sort by date descending
  return stats.sort((a, b) => b.date.localeCompare(a.date));
};

/**
 * Update daily alert statistics
 * Called at the end of each day or when an incident is resolved
 */
export const updateDailyStats = async (
  machineId: string,
  date: string,
  parameterId: string,
  updates: Partial<
    Pick<AlertStats, "occurrences" | "totalDuration" | "maxDuration">
  >,
): Promise<void> => {
  const statsId = `${date}_${parameterId}`;
  const path = `alertStats/${machineId}/${statsId}`;

  const snapshot = await get(path);

  if (snapshot.exists()) {
    // Update existing stats
    const existing = snapshot.val();
    const newOccurrences =
      (existing.occurrences || 0) + (updates.occurrences || 0);
    const newTotalDuration =
      (existing.totalDuration || 0) + (updates.totalDuration || 0);
    const newMaxDuration = Math.max(
      existing.maxDuration || 0,
      updates.maxDuration || 0,
    );

    await update(path, {
      occurrences: newOccurrences,
      totalDuration: newTotalDuration,
      maxDuration: newMaxDuration,
      avgDuration: newTotalDuration / newOccurrences,
    });
  } else {
    // Create new stats
    const occurrences = updates.occurrences || 1;
    const totalDuration = updates.totalDuration || 0;

    await update(path, {
      machineId,
      date,
      parameterId,
      parameter: parameterId.split("_").slice(0, -1).join("_"),
      phase: parameterId.split("_").pop(),
      occurrences,
      totalDuration,
      maxDuration: updates.maxDuration || 0,
      avgDuration: totalDuration / occurrences,
    });
  }
};

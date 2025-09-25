import React, { useState, useEffect, useMemo } from "react";
import { Circle } from "@react-google-maps/api";
import { toast } from "react-toastify";
import { mapViewApi } from "@/api/apiEndpoints";

// Local date formatter to avoid UTC off-by-one
const toYmdLocal = (d) => {
  if (!(d instanceof Date)) return "";
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

// Helper function to resolve metric keys to database fields and threshold keys
const resolveMetricConfig = (key) => {
  const map = {
    rsrp: { field: "rsrp", thresholdKey: "rsrp" },
    rsrq: { field: "rsrq", thresholdKey: "rsrq" },
    sinr: { field: "sinr", thresholdKey: "sinr" },
    "dl-throughput": { field: "dl_tpt", thresholdKey: "dl_thpt" },
    "ul-throughput": { field: "ul_tpt", thresholdKey: "ul_thpt" },
    mos: { field: "mos", thresholdKey: "mos" },
    "lte-bler": { field: "bler", thresholdKey: "lte_bler" },
  };
  return map[key?.toLowerCase()] || map.rsrp; // Default to RSRP
};

// Helper function to determine color based on metric value and thresholds
const getColorForMetric = (metric, value, thresholds) => {
  const { thresholdKey } = resolveMetricConfig(metric);
  const metricThresholds = thresholds[thresholdKey] || [];
  const numValue = parseFloat(value);

  if (!Number.isFinite(numValue) || metricThresholds.length === 0) {
    return "#808080"; // Default to gray for invalid values
  }
  const match = metricThresholds.find((t) => numValue >= t.min && numValue <= t.max);
  return match ? match.color : "#808080";
};

// --- DENSE ZOOM HELPERS ---

// Compute bounds that contain the densest grid cell of points (approx cellSizeMeters)
const computeDenseCellBounds = (points, cellSizeMeters = 800) => {
  if (!points?.length) return null;

  const n = points.length;
  if (n < 10) return null; // too few points for grid to be useful

  // Compute min, avg lat/lon
  let minLat = Infinity,
    minLon = Infinity,
    avgLat = 0;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    minLon = Math.min(minLon, p.lon);
    avgLat += p.lat;
  }
  avgLat /= n;

  // degrees per meter
  const latDegPerM = 1 / 111320; // ~
  const lonDegPerM = 1 / (111320 * Math.cos((avgLat * Math.PI) / 180) || 1); // avoid div by 0

  const cellLatDeg = cellSizeMeters * latDegPerM;
  const cellLonDeg = cellSizeMeters * lonDegPerM;

  if (!Number.isFinite(cellLatDeg) || !Number.isFinite(cellLonDeg)) return null;

  const cells = new Map(); // key -> {count, points[]}

  for (const p of points) {
    const iLat = Math.floor((p.lat - minLat) / cellLatDeg);
    const iLon = Math.floor((p.lon - minLon) / cellLonDeg);
    const key = `${iLat}:${iLon}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(p);
  }

  // Find densest cell
  let densest = null;
  for (const arr of cells.values()) {
    if (!densest || arr.length > densest.length) densest = arr;
  }

  if (!densest || densest.length < Math.max(5, Math.ceil(n * 0.05))) {
    // If densest cell is too small (less than 5 points or <5% of total), not helpful
    return null;
  }

  const bounds = new window.google.maps.LatLngBounds();
  let hasValid = false;
  for (const p of densest) {
    if (Number.isFinite(p.lat) && Number.isFinite(p.lon)) {
      bounds.extend({ lat: p.lat, lng: p.lon });
      hasValid = true;
    }
  }
  return hasValid ? bounds : null;
};

// Compute bounds around the central percentile of points (e.g., 80%)
const computePercentileBounds = (points, percentile = 0.8) => {
  if (!points?.length) return null;
  const n = points.length;
  if (n === 1) {
    const p = points[0];
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: p.lat, lng: p.lon });
    return bounds;
  }

  const lats = points.map((p) => p.lat).sort((a, b) => a - b);
  const lons = points.map((p) => p.lon).sort((a, b) => a - b);

  const q = (1 - percentile) / 2; // e.g., for 0.8 -> 0.1
  const lowerIdx = Math.max(0, Math.floor(q * (n - 1)));
  const upperIdx = Math.min(n - 1, Math.ceil((1 - q) * (n - 1)));

  const latMin = lats[lowerIdx];
  const latMax = lats[upperIdx];
  const lonMin = lons[lowerIdx];
  const lonMax = lons[upperIdx];

  if (
    !Number.isFinite(latMin) ||
    !Number.isFinite(latMax) ||
    !Number.isFinite(lonMin) ||
    !Number.isFinite(lonMax) ||
    latMin === latMax ||
    lonMin === lonMax
  ) {
    return null;
  }

  const bounds = new window.google.maps.LatLngBounds();
  bounds.extend({ lat: latMin, lng: lonMin });
  bounds.extend({ lat: latMax, lng: lonMax });
  return bounds;
};

// Fit map to "mostly logs" using dense cell; fallback to percentile; finally all logs
const fitMapToMostlyLogs = (map, points) => {
  if (!map || !Array.isArray(points) || points.length === 0) return;

  // 1) Try densest grid cell (~800m)
  const denseBounds = computeDenseCellBounds(points, 800);
  if (denseBounds) {
    map.fitBounds(denseBounds);
    return;
  }

  // 2) Fallback to 80% central percentile
  const percentileBounds = computePercentileBounds(points, 0.8);
  if (percentileBounds) {
    map.fitBounds(percentileBounds);
    return;
  }

  // 3) Fallback to all logs
  const allBounds = new window.google.maps.LatLngBounds();
  let hasValid = false;
  for (const p of points) {
    if (Number.isFinite(p.lat) && Number.isFinite(p.lon)) {
      allBounds.extend({ lat: p.lat, lng: p.lon });
      hasValid = true;
    }
  }
  if (hasValid) {
    map.fitBounds(allBounds);
  } else if (points.length === 1) {
    map.setCenter({ lat: points[0].lat, lng: points[0].lon });
    map.setZoom(16);
  }
};

const LogLayer = ({ map, filters, selectedMetric, thresholds, onLogsLoaded, setIsLoading }) => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!filters || !map) return;

    const fetchAndDrawLogs = async () => {
      setIsLoading(true);
      try {
        const apiParams = {
          StartDate: toYmdLocal(filters.startDate),
          EndDate: toYmdLocal(filters.endDate),
        };
        if (filters.provider && filters.provider !== "ALL") {
          apiParams.Provider = filters.provider;
        }
        if (filters.technology && filters.technology !== "ALL") {
          apiParams.Technology = filters.technology;
        }
        if (filters.band && filters.band !== "ALL") {
          apiParams.Band = filters.band;
        }

        const fetchedLogs = await mapViewApi.getLogsByDateRange(apiParams);

        if (!Array.isArray(fetchedLogs) || fetchedLogs.length === 0) {
          toast.warn("No logs found for the selected filters.");
          setLogs([]);
          onLogsLoaded?.([]);
          return;
        }

        setLogs(fetchedLogs);
        onLogsLoaded?.(fetchedLogs);

        // Prepare points for zoom calculation
        const points = [];
        for (const log of fetchedLogs) {
          const lat = parseFloat(log.lat);
          const lon = parseFloat(log.lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            points.push({ lat, lon });
          }
        }

        // Zoom to where most logs are concentrated
        fitMapToMostlyLogs(map, points);

        toast.info(`Loaded ${fetchedLogs.length} logs.`);
      } catch (error) {
        toast.error(`Failed to fetch logs: ${error?.message || "Unknown error"}`);
        setLogs([]);
        onLogsLoaded?.([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndDrawLogs();
  }, [filters, map, setIsLoading, onLogsLoaded]);

  // Memoize for rendering
  const logsForCircles = useMemo(() => {
    const { field } = resolveMetricConfig(selectedMetric);
    return logs
      .map((log, index) => {
        const metricValue = parseFloat(log?.[field]);
        return {
          id: log.id ?? `log-${index}`,
          lat: parseFloat(log.lat),
          lon: parseFloat(log.lon),
          value: Number.isFinite(metricValue) ? metricValue : undefined,
        };
      })
      .filter((log) => !isNaN(log.lat) && !isNaN(log.lon));
  }, [logs, selectedMetric]);

  return (
    <>
      {logsForCircles.map((log) => (
        <Circle
          key={log.id}
          center={{ lat: log.lat, lng: log.lon }}
          radius={10}
          options={{
            strokeColor: getColorForMetric(selectedMetric, log.value, thresholds),
            fillColor: getColorForMetric(selectedMetric, log.value, thresholds),
            fillOpacity: 0.8,
            strokeWeight: 1,
          }}
        />
      ))}
    </>
  );
};

export default LogLayer;
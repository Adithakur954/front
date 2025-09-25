// src/pages/MapView.jsx
import React, { useState, useEffect, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Circle } from "@react-google-maps/api";
import { toast } from "react-toastify";
import { adminApi, mapViewApi, settingApi } from "../api/apiEndpoints";
import MapSidebar from "../components/map/layout/MapSidebar";
import SessionDetailPanel from "../components/map/layout/SessionDetail";
import MapHeader from "../components/map/layout/MapHeader";
import Spinner from "../components/common/Spinner";

const GOOGLE_MAPS_LIBRARIES = ["places", "geometry"];
const DELHI_CENTER = { lat: 28.6139, lng: 77.2090 };
const MAP_CONTAINER_STYLE = { height: "100vh", width: "100%" };

const MapView = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [map, setMap] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  const [sessionLogsMap, setSessionLogsMap] = useState(new Map());
  const [selectedSessionData, setSelectedSessionData] = useState(null);
  const [thresholds, setThresholds] = useState({});
  const [selectedMetric, setSelectedMetric] = useState("rsrp");
  const [isLoading, setIsLoading] = useState(false);

  // Load thresholds
  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const res = await settingApi.getThresholdSettings();
        if (res && res.Data) {
          const data = res.Data;
          setThresholds({
            rsrp: JSON.parse(data.rsrp_json || "[]"),
            rsrq: JSON.parse(data.rsrq_json || "[]"),
            sinr: JSON.parse(data.sinr_json || "[]"),
            dl_thpt: JSON.parse(data.dl_thpt_json || "[]"),
            ul_thpt: JSON.parse(data.ul_thpt_json || "[]"),
            mos: JSON.parse(data.mos_json || "[]"),
            lte_bler: JSON.parse(data.lte_bler_json || "[]"),
          });
        }
      } catch (error) {
        console.error("Error fetching thresholds:", error);
      }
    };
    fetchThresholds();
  }, []);

  // Load sessions
  const fetchAllSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getSessions();
      const validSessions = (data || []).filter(
        (s) =>
          !isNaN(parseFloat(s.start_lat)) && !isNaN(parseFloat(s.start_lon))
      );
      setAllSessions(validSessions);
      setSessionLogsMap(new Map());
    } catch (error) {
      toast.error("Failed to fetch sessions: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) fetchAllSessions();
  }, [isLoaded, fetchAllSessions]);

  const onMapLoad = useCallback((mapInstance) => setMap(mapInstance), []);

  // Compute color for a metric value
  const getColorForMetric = useCallback(
    (metric, value) => {
      if (!metric || isNaN(value)) return "#000000";
      const metricThresholds = thresholds[metric];
      if (!metricThresholds || metricThresholds.length === 0) return "#000000";
      const numericValue = parseFloat(value);
      const match = metricThresholds.find(
        (t) => numericValue >= t.min && numericValue <= t.max
      );
      return match ? match.color : "#000000";
    },
    [thresholds]
  );

  // Apply filters
  const handleApplyFilters = async (filters) => {
    setIsLoading(true);
    setSelectedMetric(filters.measureIn || "rsrp");
    setSelectedSessionData(null);
    
    try {
      const apiParams = {
        StartDate: filters.startDate.toISOString().split("T")[0],
        EndDate: filters.endDate.toISOString().split("T")[0],
      };
      const logs = await mapViewApi.getLogsByDateRange(apiParams);
      if (!logs || logs.length === 0) {
        toast.warn("No logs found for selected filters.");
        setSessionLogsMap(new Map());
        return;
      }

      // Group logs by session
      const grouped = new Map();
      logs.forEach((log) => {
        if (!grouped.has(log.session_id)) grouped.set(log.session_id, []);
        grouped.get(log.session_id).push(log);
      });

      // Keep every 3rd log for performance
      const optimizedMap = new Map();
      grouped.forEach((logs, sessionId) => {
        optimizedMap.set(
          sessionId,
          logs.filter((_, idx) => idx % 3 === 0)
        );
      });

      setSessionLogsMap(optimizedMap);

      // Fit map bounds
      if (map) {
        const bounds = new window.google.maps.LatLngBounds();
        let hasValid = false;
        optimizedMap.forEach((logs) => {
          logs.forEach((log) => {
            const lat = parseFloat(log.lat);
            const lon = parseFloat(log.lon);
            if (!isNaN(lat) && !isNaN(lon)) {
              bounds.extend({ lat, lng: lon });
              hasValid = true;
            }
          });
        });
        if (hasValid) map.fitBounds(bounds);
      }

      toast.info(`Loaded ${optimizedMap.size} sessions.`);
    } catch (error) {
      toast.error("Failed to apply filters: " + error.message);
      setSessionLogsMap(new Map());
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSessionLogsMap(new Map());
    fetchAllSessions();
  };

  // Flatten logs for rendering
  const filteredLogs = [...sessionLogsMap.values()]
    .flat()
    .map((log) => {
      const metricValue =
        log[selectedMetric.toLowerCase()] || log[selectedMetric] || 0;
      return {
        ...log,
        lat: parseFloat(log.lat),
        lon: parseFloat(log.lon),
        value: parseFloat(metricValue),
      };
    })
    .filter((log) => !isNaN(log.lat) && !isNaN(log.lon));

  if (!isLoaded) return <Spinner />;
  if (loadError) return <div>Error loading Google Maps</div>;

  return (
    <div className="relative h-full w-full">
      <MapHeader map={map} />
      <MapSidebar
        sessions={allSessions}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />

      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 dark:bg-black/70">
          <Spinner />
        </div>
      )}

      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={DELHI_CENTER}
        zoom={14}
        onLoad={onMapLoad}
        options={{ disableDefaultUI: true, zoomControl: true }}
      >
        {/* Show session markers if no logs */}
        {sessionLogsMap.size === 0 &&
          allSessions.map((s) => {
            const lat = parseFloat(s.start_lat);
            const lon = parseFloat(s.start_lon);
            if (isNaN(lat) || isNaN(lon)) return null;
            return (
              <Circle
                key={`session-${s.id}`}
                center={{ lat, lng: lon }}
                radius={20}
                options={{
                  strokeColor: "#007BFF",
                  fillColor: "#007BFF",
                  fillOpacity: 0.8,
                  strokeWeight: 1,
                }}
                onClick={() => setSelectedSessionData({ session: s, logs: [] })}
              />
            );
          })}

        {/* Log circles */}
        {filteredLogs.map((log, idx) => (
          <Circle
            key={`log-${idx}`}
            center={{ lat: log.lat, lng: log.lon }}
            radius={20}
            options={{
              strokeColor: getColorForMetric(selectedMetric, log.value),
              fillColor: getColorForMetric(selectedMetric, log.value),
              fillOpacity: 0.8,
              strokeWeight: 1,
            }}
          />
        ))}
      </GoogleMap>

      <SessionDetailPanel
        sessionData={selectedSessionData}
        isLoading={isLoading}
        onClose={() => setSelectedSessionData(null)}
      />
    </div>
  );
};

export default MapView;

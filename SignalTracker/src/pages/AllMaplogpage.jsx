import React, { useState, useEffect, useCallback, useMemo } from "react";
import { GoogleMap, useJsApiLoader, DrawingManager, Circle } from "@react-google-maps/api";
import { toast } from "react-toastify";
import { adminApi, mapViewApi } from "../api/apiEndpoints";

import MapSidebar from "../components/map/layout/MapSidebar";
import SessionDetailPanel from "../components/map/layout/SessionDetail";
import MapHeader from "../components/map/layout/MapHeader";
import Spinner from "../components/common/Spinner";

const GOOGLE_MAPS_LIBRARIES = ["places", "drawing", "geometry"];
const DELHI_CENTER = { lat: 28.6139, lng: 77.2090 };
const mapContainerStyle = { height: "100vh", width: "100%" };

const MapView = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [map, setMap] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  const [sessionLogsMap, setSessionLogsMap] = useState(new Map());
  const [selectedSessionData, setSelectedSessionData] = useState(null);
  const [polygons, setPolygons] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  const [thresholds, setThresholds] = useState({});
  const [selectedMetric, setSelectedMetric] = useState("rsrp");

  // Fetch thresholds from API
  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const res = await mapViewApi.getThreshHoldsetting();
        if (res && res.Data) {
          const data = res.Data;
          setThresholds({
            rsrp: JSON.parse(data.rsrp_json),
            rsrq: JSON.parse(data.rsrq_json),
            sinr: JSON.parse(data.sinr_json),
            dl_thpt: JSON.parse(data.dl_thpt_json),
            ul_thpt: JSON.parse(data.ul_thpt_json),
            mos: JSON.parse(data.mos_json),
            lte_bler: JSON.parse(data.lte_bler_json),
          });
        }
      } catch (error) {
        console.error("Error fetching thresholds:", error);
      }
    };
    fetchThresholds();
  }, []);

  const fetchAllSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getSessions();
      const validSessions = (data || []).filter(
        (s) =>
          s.start_lat &&
          s.start_lon &&
          !isNaN(parseFloat(s.start_lat)) &&
          !isNaN(parseFloat(s.start_lon))
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

  // Helper: Get color for metric value based on thresholds
  const getColorForMetric = (metric, value) => {
    if (!thresholds[metric]) return "#000000";
    const thresholdArr = thresholds[metric];
    const match = thresholdArr.find((t) => value >= t.min && value <= t.max);
    return match ? match.color : "#000000";
  };

  // Apply filters
  const handleApplyFilters = async (filters) => {
    setIsLoading(true);
    setSelectedSessionData(null);
    setPolygons([]);
    setSelectedMetric(filters.measureIn || "rsrp");
    setSessionLogsMap(new Map());

    try {
      const apiParams = {
        StartDate: filters.startDate.toISOString().split("T")[0],
        EndDate: filters.endDate.toISOString().split("T")[0],
      };

      const logs = await mapViewApi.getLogsByDateRange(apiParams);

      if (logs && logs.length > 0) {
        const grouped = new Map();
        logs.forEach((log) => {
          if (!grouped.has(log.session_id)) grouped.set(log.session_id, []);
          grouped.get(log.session_id).push(log);
        });

        // Keep every 3rd log
        const optimizedMap = new Map();
        grouped.forEach((logs, sessionId) => {
          optimizedMap.set(
            sessionId,
            logs.filter((_, idx) => idx % 3 === 0)
          );
        });

        setSessionLogsMap(optimizedMap);
        toast.info(`Found ${grouped.size} sessions.`);
      } else {
        toast.warn("No data found for selected filters.");
      }
    } catch (error) {
      toast.error("Failed to apply filters: " + error.message);
      setSessionLogsMap(new Map());
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearPolygons = () => {
    polygons.forEach((p) => p.setMap(null));
    setPolygons([]);
  };

  const drawingOptions = useMemo(() => {
    if (!isLoaded || !window.google) return {};
    return {
      drawingControl: true,
      drawingControlOptions: {
        position: window.google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [window.google.maps.drawing.OverlayType.POLYGON],
      },
      polygonOptions: {
        fillColor: "#007BFF",
        fillOpacity: 0.2,
        strokeWeight: 2,
        strokeColor: "#007BFF",
        clickable: true,
        editable: true,
        zIndex: 1,
      },
    };
  }, [isLoaded]);

  const handlePolygonComplete = async (polygon) => {
    polygon.setEditable(false);
    setPolygons((prev) => [...prev, polygon]);
    setSelectedSessionData(null);
  };

  const onMapLoad = useCallback((mapInstance) => setMap(mapInstance), []);

  if (!isLoaded) return <Spinner />;
  if (loadError) return <div>Error loading Google Maps</div>;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapHeader map={map} />
      <MapSidebar
        sessions={allSessions}
        onApplyFilters={handleApplyFilters}
        onClearFilters={fetchAllSessions}
      />

      {isLoading && !isPanelLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70">
          <Spinner />
        </div>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={DELHI_CENTER}
        zoom={14}
        onLoad={onMapLoad}
        options={{ disableDefaultUI: true, zoomControl: true }}
      >
        {isLoaded && (
          <DrawingManager options={drawingOptions} onPolygonComplete={handlePolygonComplete} />
        )}

        {/* BEFORE filter: show session circles */}
        {sessionLogsMap.size === 0 &&
          allSessions.map((session) => {
            const lat = parseFloat(session.start_lat);
            const lng = parseFloat(session.start_lon);
            if (isNaN(lat) || isNaN(lng)) return null;
            return (
              <Circle
                key={`session-${session.id}`}
                center={{ lat, lng }}
                radius={20}
                options={{
                  strokeColor: "#007BFF",
                  fillColor: "#007BFF",
                  fillOpacity: 0.8,
                  strokeWeight: 1,
                }}
                onClick={() => setSelectedSessionData({ session, logs: [] })}
              />
            );
          })}

        {/* AFTER filter: show log circles with metric-based color */}
        {[...sessionLogsMap.values()].flat().map((log, idx) => {
          const lat = parseFloat(log.lat);
          const lng = parseFloat(log.lon);
          if (isNaN(lat) || isNaN(lng)) return null;

          const value = parseFloat(log[selectedMetric]);
          const color = getColorForMetric(selectedMetric, value);

          return (
            <Circle
              key={`log-${idx}`}
              center={{ lat, lng }}
              radius={20}
              options={{
                strokeColor: color,
                fillColor: color,
                fillOpacity: 0.8,
                strokeWeight: 1,
              }}
            />
          );
        })}
      </GoogleMap>

      <SessionDetailPanel
        sessionData={selectedSessionData}
        isLoading={isPanelLoading}
        onClose={() => setSelectedSessionData(null)}
      />
    </div>
  );
};

export default MapView;

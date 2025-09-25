import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { toast } from "react-toastify";
import { adminApi, mapViewApi, settingApi } from "../api/apiEndpoints";
import MapSidebar from "../components/map/layout/MapSidebar";
import SessionDetailPanel from "../components/map/layout/SessionDetail";
import AllLogsDetailPanel from "../components/map/layout/AllLogsDetailPanel";
import MapHeader from "../components/map/layout/MapHeader";
import Spinner from "../components/common/Spinner";
import LogLayer from "../components/map/layers/LogLayer";

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
const GOOGLE_MAPS_LIBRARIES = ["places", "geometry"]; // marker lib not needed for simple Marker
const DELHI_CENTER = { lat: 28.6139, lng: 77.2090 };
const MAP_CONTAINER_STYLE = { height: "100vh", width: "100%" };

// Persist/restore viewport
const VIEWPORT_KEY = "map_viewport_v1";
const loadSavedViewport = () => {
  try {
    const raw = localStorage.getItem(VIEWPORT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (
      v &&
      Number.isFinite(v.lat) &&
      Number.isFinite(v.lng) &&
      Number.isFinite(v.zoom)
    ) {
      return v;
    }
  } catch {}
  return null;
};
const saveViewport = (map) => {
  try {
    const c = map.getCenter?.();
    const z = map.getZoom?.();
    if (!c || !Number.isFinite(z)) return;
    localStorage.setItem(
      VIEWPORT_KEY,
      JSON.stringify({ lat: c.lat(), lng: c.lng(), zoom: z })
    );
  } catch {}
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

const MapView = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
    mapId: MAP_ID,
  });

  const [map, setMap] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  const [selectedSessionData, setSelectedSessionData] = useState(null);
  const [thresholds, setThresholds] = useState({});
  const [selectedMetric, setSelectedMetric] = useState("rsrp");
  const [isLoading, setIsLoading] = useState(false);
  const [showAllLogsPanel, setShowAllLogsPanel] = useState(false);
  const [activeFilters, setActiveFilters] = useState(null);

  // Logs fetched by LogLayer and kept here for the detail panel
  const [drawnLogs, setDrawnLogs] = useState([]);

  // Keep a ref to remove listener on unmount
  const idleListenerRef = useRef(null);

  // thresholds
  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const res = await settingApi.getThresholdSettings();
        if (res?.Data) {
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
        toast.error("Could not load color thresholds.");
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
          !isNaN(parseFloat(s.start_lat)) && !isNaN(parseFloat(s.start_lon))
      );
      setAllSessions(validSessions);
    } catch (error) {
      toast.error(`Failed to fetch sessions: ${error?.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) fetchAllSessions();
  }, [isLoaded, fetchAllSessions]);

  const onMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
    // Restore viewport
    const saved = loadSavedViewport();
    if (saved) {
      mapInstance.setCenter({ lat: saved.lat, lng: saved.lng });
      mapInstance.setZoom(saved.zoom);
    }
    // Persist viewport when user stops interacting
    idleListenerRef.current = mapInstance.addListener("idle", () => {
      saveViewport(mapInstance);
    });
  }, []);

  const onMapUnmount = useCallback(() => {
    try {
      if (idleListenerRef.current) {
        window.google?.maps?.event?.removeListener?.(idleListenerRef.current);
      }
    } catch {}
    idleListenerRef.current = null;
    setMap(null);
  }, []);

  const handleApplyFilters = (filters) => {
    setActiveFilters(filters);
    setSelectedMetric(filters.measureIn?.toLowerCase() || "rsrp");
    setSelectedSessionData(null);
  };

  const handleClearFilters = useCallback(() => {
    setActiveFilters(null);
    setDrawnLogs([]);
    setShowAllLogsPanel(false);
    fetchAllSessions(); // do not change viewport; keep saved zoom/center
  }, [fetchAllSessions]);

  const handleSessionMarkerClick = async (session) => {
    setIsLoading(true);
    setShowAllLogsPanel(false);
    try {
      const logs = await mapViewApi.getNetworkLog(session.id);
      setSelectedSessionData({ session, logs: logs || [] });
    } catch (error) {
      toast.error(
        `Failed to fetch logs for session ${session.id}: ${error?.message || "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogsLoaded = useCallback((logs) => {
    setDrawnLogs(logs || []);
    setShowAllLogsPanel(Boolean(logs?.length));
  }, []);

  if (loadError) return <div>Error loading Google Maps.</div>;
  if (!isLoaded) return <Spinner />;

  return (
    <div className="relative h-full w-full">
      <MapHeader map={map} />

      <MapSidebar
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
        onUnmount={onMapUnmount}
        options={{ disableDefaultUI: true, zoomControl: true, mapId: MAP_ID }}
      >
        {/* Show session markers if no filters are active */}
        {!activeFilters &&
          allSessions.map((s) => {
            const lat = parseFloat(s.start_lat);
            const lng = parseFloat(s.start_lon);
            if (isNaN(lat) || isNaN(lng)) return null;
            return (
              <Marker
                key={`session-${s.id}`}
                position={{ lat, lng }}
                title={`Session ${s.id}`}
                onClick={() => handleSessionMarkerClick(s)}
              />
            );
          })}

        {/* Show log circles when filters are active via LogLayer */}
        {activeFilters && map && (
          <LogLayer
            map={map}
            filters={activeFilters}
            selectedMetric={selectedMetric}
            thresholds={thresholds}
            onLogsLoaded={handleLogsLoaded}
            setIsLoading={setIsLoading}
          />
        )}
      </GoogleMap>

      {showAllLogsPanel && activeFilters && (
        <AllLogsDetailPanel
          logs={drawnLogs}
          thresholds={thresholds}
          selectedMetric={selectedMetric}
          isLoading={isLoading}
          onClose={() => setShowAllLogsPanel(false)}
        />
      )}

      <SessionDetailPanel
        sessionData={selectedSessionData}
        isLoading={isLoading}
        thresholds={thresholds}
        selectedMetric={selectedMetric}
        onClose={() => setSelectedSessionData(null)}
      />
    </div>
  );
};

export default MapView;
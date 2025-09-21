import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, HeatmapLayerF } from "@react-google-maps/api";
import { toast } from 'react-toastify';
import { adminApi } from '../api/apiEndpoints';
import { MarkerClusterer } from "@googlemaps/markerclusterer";

import { getMarkerColor } from '../utils/mapHelpers';
import { Legend } from '../components/map/Legend';
import MapSidebar from '../components/map/layout/MapSidebar';
import MapHeader from '../components/map/layout/MapHeader';
import Spinner from '../components/common/Spinner';

const DELHI_CENTER = { lat: 28.6139, lng: 77.2090 };

const formatDateForApi = (d) => {
  if (!d) return null;
  // If it's already a string assume backend-ready; otherwise convert Date -> YYYY-MM-DD
  if (typeof d === 'string') return d;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const MapView = () => {
  // --- STATE MANAGEMENT ---
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [sessionMarkers, setSessionMarkers] = useState([]);
  const [networkLogData, setNetworkLogData] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeView, setActiveView] = useState('sessions');
  const [dataLimit] = useState(1000);
  const [currentPage, setCurrentPage] = useState(1);
  const markerClusterRef = useRef(null);

  const [filters, setFilters] = useState({
    sessionId: '',
    startDate: null,
    endDate: null,
    networkType: 'ALL'
  });

  const [layerVisibility, setLayerVisibility] = useState({
    failures: { voice: {}, data: {} },
    polygons: { main: {} },
    dtMetrics: {
      lte: { RSRP: true, SINR: false, RSRQ: false },
      nr: { 'SS-RSRP': false, 'SS-SINR': false, 'SS-RSRQ': false }
    },
    crowdsource: { main: false },
    dtMetricsXCAP: { main: false },
    cell: { main: false },
    sites: { main: false }
  });

  // --- MAP AND API LOADER SETUP ---
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ['places', 'drawing', 'visualization'],
  });

  // Determine which metric to use for coloring markers
  const activeMetric = useMemo(() => {
    const lte = layerVisibility?.dtMetrics?.lte ?? {};
    if (lte.RSRP) return 'RSRP';
    if (lte.SINR) return 'SINR';
    if (lte.RSRQ) return 'RSRQ';
    return 'RSRP';
  }, [layerVisibility?.dtMetrics?.lte]);

  // Helper function to get marker icon
  const getMarkerIcon = useCallback((value, metric = activeMetric) => {
    if (!window.google) return null;
    const color = getMarkerColor(value, metric);
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 0.8,
      strokeColor: 'white',
      strokeWeight: 1,
      scale: 6,
    };
  }, [activeMetric]);

  // --- INITIAL SESSIONS FETCH (on map load) ---
  useEffect(() => {
    if (!map) return;

    let mounted = true;
    const fetchInitialSessions = async () => {
      setLoading(true);
      try {
        const sessionData = await adminApi.getSessions();
        if (!Array.isArray(sessionData) || sessionData.length === 0) {
          toast.warn("No sessions found.");
          setSessions([]);
          setSessionMarkers([]);
          return;
        }
        if (!mounted) return;
        setSessions(sessionData);

        const validSessionMarkers = sessionData
          .filter(s => s.start_lat != null && s.start_lon != null)
          .map(s => ({
            ...s,
            start_lat: Number(s.start_lat),
            start_lon: Number(s.start_lon)
          }));
        setSessionMarkers(validSessionMarkers);

        if (validSessionMarkers.length > 0 && window.google) {
          const bounds = new window.google.maps.LatLngBounds();
          validSessionMarkers.forEach(point => {
            bounds.extend(new window.google.maps.LatLng(point.start_lat, point.start_lon));
          });
          map.fitBounds(bounds);
        }
      } catch (error) {
        console.error("fetchInitialSessions error:", error);
        toast.error(`Failed to load initial session data: ${error.message || error}`);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchInitialSessions();
    return () => { mounted = false; };
  }, [map]);

  // --- CLUSTERING for 'logs' view ---
  useEffect(() => {
    if (!map || !window.google || networkLogData.length === 0 || activeView !== 'logs') return;

    // clear previous
    if (markerClusterRef.current) {
      try { markerClusterRef.current.clearMarkers(); } catch (e) { /* ignore */ }
      markerClusterRef.current = null;
    }

    const markers = networkLogData.map(point => {
      const metricKey = activeMetric?.toLowerCase();
      const metricValue = point[metricKey];
      return new window.google.maps.Marker({
        position: { lat: point.lat, lng: point.lon },
        icon: getMarkerIcon(metricValue),
        map: map,
        title: `${activeMetric}: ${metricValue ?? 'N/A'}`
      });
    });

    // Create clusterer. This follows the "@googlemaps/markerclusterer" constructor style.
    try {
      markerClusterRef.current = new MarkerClusterer({ map, markers });
    } catch (err) {
      // If constructor differs by version, fallback to older signature:
      try {
        // eslint-disable-next-line new-cap
        markerClusterRef.current = new MarkerClusterer(map, markers);
      } catch (e) {
        console.warn('MarkerClusterer init failed:', err, e);
      }
    }

    return () => {
      if (markerClusterRef.current && markerClusterRef.current.clearMarkers) {
        try { markerClusterRef.current.clearMarkers(); } catch (e) { /* ignore */ }
      }
      markerClusterRef.current = null;
    };
  }, [map, networkLogData, activeView, activeMetric, getMarkerIcon]);

  // --- FETCH HEATMAP DATA ---
  const handleFetchHeatmapData = async () => {
    setLoading(true);
    setNetworkLogData([]);
    setActiveView('heatmap');
    try {
      const allLogs = await adminApi.getAllNetworkLogs();
      const validLogs = (Array.isArray(allLogs) ? allLogs : [])
        .filter(log => log.lat != null && log.lon != null)
        .map(log => ({
          lat: Number(log.lat),
          lon: Number(log.lon),
          rsrp: log.rsrp != null ? Number(log.rsrp) : null
        }));

      if (validLogs.length > 0) {
        setHeatmapData(validLogs);
        toast.success(`${validLogs.length} data points loaded for heatmap.`);
      } else {
        setHeatmapData([]);
        toast.warn("No data available for the heatmap.");
      }
    } catch (error) {
      console.error("handleFetchHeatmapData error:", error);
      toast.error(`Failed to fetch heatmap data: ${error.message || error}`);
      setHeatmapData([]);
    } finally {
      setLoading(false);
    }
  };

  // --- APPLY FILTERS (logs) ---
  const handleApplyFilters = async (page = 1) => {
    // Accept explicit page or use current
    setCurrentPage(page);
    if (!filters.sessionId) {
      toast.info("Please select a session to view its detailed logs.");
      return;
    }

    setLoading(true);
    setNetworkLogData([]);

    try {
      // Build params carefully — only include present filters
      const params = {
        session_id: Number(filters.sessionId) || undefined,
        page: page,
        limit: dataLimit
      };

      // networkType only if not 'ALL'
      if (filters.networkType && filters.networkType !== 'ALL') {
        params.NetworkType = filters.networkType;
      }

      const start = formatDateForApi(filters.startDate);
      const end = formatDateForApi(filters.endDate);
      if (start) params.StartDate = start;
      if (end) params.EndDate = end;

      // Debug: inspect outgoing params
      console.debug('Fetching logs with params:', params);

      // Make API call (ensure adminApi implementation accepts an object or adapt accordingly)
      const logData = await adminApi.getAllNetworkLogs(params);

      const validLogs = (Array.isArray(logData) ? logData : [])
        .filter(log => log.lat != null && log.lon != null)
        .map(log => ({
          ...log,
          lat: Number(log.lat),
          lon: Number(log.lon),
          rsrp: log.rsrp !== null ? (Number.isNaN(Number(log.rsrp)) ? null : Number(log.rsrp)) : null,
          sinr: log.sinr !== null ? (Number.isNaN(Number(log.sinr)) ? null : Number(log.sinr)) : null,
          rsrq: log.rsrq !== null ? (Number.isNaN(Number(log.rsrq)) ? null : Number(log.rsrq)) : null
        }));

      setNetworkLogData(validLogs);
      setActiveView('logs');

      if (validLogs.length > 0 && map && window.google) {
        const bounds = new window.google.maps.LatLngBounds();
        validLogs.forEach(point => {
          bounds.extend(new window.google.maps.LatLng(point.lat, point.lon));
        });
        try { map.fitBounds(bounds); } catch (e) { /* ignoring fitBounds errors */ }
        toast.success(`${validLogs.length} log points loaded.`);
      } else {
        toast.warn("No network logs found for the selected filters.");
      }
    } catch (error) {
      console.error("handleApplyFilters error:", error);
      toast.error(`Failed to fetch network logs: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  // Reset page when filters change (optional UX)
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.sessionId, filters.networkType, filters.startDate, filters.endDate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setNetworkLogData([]);
      setHeatmapData([]);
      if (markerClusterRef.current && markerClusterRef.current.clearMarkers) {
        try { markerClusterRef.current.clearMarkers(); } catch (e) { /* ignore */ }
      }
    };
  }, []);

  const onMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
    window.map = mapInstance;
  }, []);

  const memoizedHeatmapPoints = useMemo(() => {
    if (!heatmapData.length || !window.google) return [];
    return heatmapData.map(point => ({
      location: new window.google.maps.LatLng(point.lat, point.lon),
      weight: (point.rsrp != null ? (point.rsrp + 140) / 100 : 0.1)
    }));
  }, [heatmapData]);

  if (loadError) return <div className="p-4 text-center text-red-600 bg-red-100">Error loading Google Maps.</div>;
  if (!isLoaded) return <div className="h-screen w-screen flex items-center justify-center"><Spinner /></div>;

  return (
    <div className="relative h-screen ">
      <MapHeader map={map} />

      <MapSidebar
        sessions={sessions}
        filters={filters}
        setFilters={setFilters}
        onApplyFilters={() => handleApplyFilters(1)}
        layerVisibility={layerVisibility}
        setLayerVisibility={setLayerVisibility}
        onFetchHeatmap={handleFetchHeatmapData}
      />

      {loading && <div className="absolute top-4 right-4 z-20"><Spinner /></div>}

      <GoogleMap
        mapContainerClassName="w-full h-full"
        center={DELHI_CENTER}
        zoom={12}
        onLoad={onMapLoad}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        }}
      >
        {/* Session markers */}
        {activeView === 'sessions' && sessionMarkers.map(session => (
          <Marker
            key={`session-${session.id}`}
            position={{ lat: session.start_lat, lng: session.start_lon }}
            onClick={() => setSelectedItem({ type: 'session', data: session })}
          />
        ))}

        {/* Network data markers */}
        {activeView === 'logs' && networkLogData.map((point, index) => (
          <Marker
            key={`log-${index}`}
            position={{ lat: point.lat, lng: point.lon }}
            icon={getMarkerIcon(point[activeMetric?.toLowerCase()])}
            onClick={() => setSelectedItem({ type: 'log', data: point })}
          />
        ))}

        {/* Heatmap */}
        {activeView === 'heatmap' && memoizedHeatmapPoints.length > 0 && (
          <HeatmapLayerF
            data={memoizedHeatmapPoints}
            options={{
              radius: 20,
              opacity: 0.7
            }}
          />
        )}

        {/* Info Window */}
        {selectedItem && (
          <InfoWindow
            position={{
              lat: selectedItem.type === 'session'
                ? selectedItem.data.start_lat
                : selectedItem.data.lat,
              lng: selectedItem.type === 'session'
                ? selectedItem.data.start_lon
                : selectedItem.data.lon
            }}
            onCloseClick={() => setSelectedItem(null)}
          >
            <div className="p-2 max-w-sm">
              <h3 className="font-bold text-sm mb-2">
                {selectedItem.type === 'session' ? 'Session Details' : 'Measurement Details'}
              </h3>
              {selectedItem.type === 'session' ? (
                <>
                  <p><strong>User:</strong> {selectedItem.data.CreatedBy || 'N/A'}</p>
                  <p><strong>Started:</strong> {selectedItem.data.start_time ? new Date(selectedItem.data.start_time).toLocaleString() : 'N/A'}</p>
                  <p><strong>Device:</strong> {selectedItem.data.make || ''} {selectedItem.data.model || ''}</p>
                </>
              ) : (
                <>
                  <p><strong>Session ID:</strong> {selectedItem.data.session_id}</p>
                  <p><strong>Technology:</strong> {selectedItem.data.network || 'N/A'}</p>
                  <p><strong>RSRP:</strong> {selectedItem.data.rsrp ?? 'N/A'} dBm</p>
                  <p><strong>SINR:</strong> {selectedItem.data.sinr ?? 'N/A'} dB</p>
                  <p><strong>RSRQ:</strong> {selectedItem.data.rsrq ?? 'N/A'} dB</p>
                  <p><strong>Band:</strong> {selectedItem.data.band || 'N/A'}</p>
                </>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      <Legend parameter={activeMetric} />
    </div>
  );
};

export default MapView;

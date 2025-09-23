// src/pages/MapView.jsx

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DrawingManager, MarkerClusterer } from '@react-google-maps/api';
import { toast } from 'react-toastify';
import { adminApi, mapViewApi } from '../api/apiEndpoints';

import MapSidebar from '../components/map/layout/MapSidebar';
import SessionDetailPanel from '../components/map/layout/SessionDetail';
import MapHeader from '../components/map/layout/MapHeader';
import Spinner from '../components/common/Spinner';

const GOOGLE_MAPS_LIBRARIES = ["places", "drawing", "visualization", "geometry", "marker"];

const mapContainerStyle = {
  height: "100%",
  width: "100%",
};

const DELHI_CENTER = {
  lat: 28.6139,
  lng: 77.2090,
};

const MapView = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [map, setMap] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  const [displayedMarkers, setDisplayedMarkers] = useState([]);
  const [selectedSessionData, setSelectedSessionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  const [polygons, setPolygons] = useState([]);
  const [sessionLogs, setSessionLogs] = useState([]); // grouped logs by session

  const fitMapToMarkers = (mapInstance, markers, logs) => {
  const bounds = new window.google.maps.LatLngBounds();

  markers.forEach(s => bounds.extend({ lat: parseFloat(s.start_lat), lng: parseFloat(s.start_lon) }));
  logs.forEach(group => group.logs.forEach(l => bounds.extend({ lat: parseFloat(l.lat), lng: parseFloat(l.lon) })));

  if (!bounds.isEmpty()) mapInstance.fitBounds(bounds);
};

  const fetchAllSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getSessions();
      const validSessions = (data || []).filter(s =>
        s.start_lat && s.start_lon && !isNaN(parseFloat(s.start_lat)) && !isNaN(parseFloat(s.start_lon))
      );
      setAllSessions(validSessions);
      setDisplayedMarkers(validSessions);
    } catch (error) {
      toast.error("Failed to fetch sessions: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      fetchAllSessions();
    }
  }, [isLoaded, fetchAllSessions]);

  const handleMarkerClick = async (session) => {
    handleClearPolygons();
    setSelectedSessionData({ session, logs: [] });
    setIsPanelLoading(true);
    try {
      const logs = await mapViewApi.getNetworkLog({ session_id: session.id, limit: 10000 });
      setSelectedSessionData({ session, logs: logs || [] });
    } catch (error) {
      toast.error(`Failed to fetch logs for session ${session.id}: ${error.message}`);
      setSelectedSessionData({ session, logs: [] });
    } finally {
      setIsPanelLoading(false);
    }
  };

  const handleApplyFilters = async (filters) => {
    setIsLoading(true);
    setSelectedSessionData(null);
    handleClearPolygons();
    setSessionLogs([]);
    console.log("Applying filters:", filters);
    try {
      const apiParams = {
        StartDate: filters.startDate.toISOString().split('T')[0],
        EndDate: filters.endDate.toISOString().split('T')[0],
      };

      const data = await mapViewApi.getLogsByDateRange(apiParams);
      console.log("Logs by date range:", data);

      if (data && data.length > 0) {
         setDisplayedMarkers([]);
        

         
        const grouped = data.reduce((acc, log) => {
          const id = log.session_id;
          if (!acc[id]) acc[id] = [];
          acc[id].push(log);
          return acc;
        }, {});

        

        const groupedArray = Object.keys(grouped).map(id => ({
          session_id: id,
          logs: grouped[id],
        }));

        setSessionLogs(groupedArray);
        toast.info(`Found ${groupedArray.length} sessions.`);
      } else {
        toast.warn("No data found for the selected filters.");
      }
    } catch (error) {
      toast.error("Failed to apply filters: " + error.message);
      setSessionLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFilters = () => {
    setDisplayedMarkers(allSessions);
    setSelectedSessionData(null);
    handleClearPolygons();
    setSessionLogs([]);
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
    try {
      polygon.setEditable(false);
      setPolygons(prev => [...prev, polygon]);
      setIsPanelLoading(true);
      setSelectedSessionData(null);

      const sessionsInside = allSessions.filter(session => {
        const sessionLatLng = new window.google.maps.LatLng(
          parseFloat(session.start_lat),
          parseFloat(session.start_lon)
        );
        return window.google.maps.geometry.poly.containsLocation(sessionLatLng, polygon);
      });

      if (sessionsInside.length === 0) {
        toast.warn("No sessions found in the selected area.");
        setIsPanelLoading(false);
        return;
      }

      toast.info(`Found ${sessionsInside.length} sessions. Fetching details...`);

      const logFetchPromises = sessionsInside.map(session =>
        mapViewApi.getNetworkLog({ session_id: session.id, limit: 10000 })
      );
      const allLogsArrays = await Promise.all(logFetchPromises);
      const combinedLogs = allLogsArrays.flat().filter(Boolean);

      const summarySession = {
        id: `Area Selection (${sessionsInside.length} sessions)`,
        isMultiSession: true,
      };

      setSelectedSessionData({
        session: summarySession,
        logs: combinedLogs,
        sessions: sessionsInside,
      });

    } catch (error) {
      console.error("Error processing polygon selection:", error);
      toast.error("An error occurred while fetching data for the selected area.");
    } finally {
      setIsPanelLoading(false);
    }
  };

  const handleClearPolygons = () => {
    polygons.forEach(p => p.setMap(null));
    setPolygons([]);
  };

  const onMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  if (!isLoaded) return <div className="flex h-screen w-screen items-center justify-center"><Spinner /></div>;
  if (loadError) return <div className="p-4 text-center text-red-500">Error loading Google Maps.</div>;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapHeader map={map} />
      <MapSidebar
        sessions={allSessions}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />

      {isLoading && !isPanelLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 dark:bg-black/70">
          <Spinner />
        </div>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={DELHI_CENTER}
        zoom={13}
        onLoad={onMapLoad}
        options={{ disableDefaultUI: true, zoomControl: true }}
      >
        {isLoaded && (
          <DrawingManager
            onPolygonComplete={handlePolygonComplete}
            options={drawingOptions}
          />
        )}

        {/* Static session markers (initial load) */}
        {displayedMarkers.map(session => (
          <Marker
            key={session.id}
            position={{ lat: parseFloat(session.start_lat), lng: parseFloat(session.start_lon) }}
            onClick={() => handleMarkerClick(session)}
            title={`Session ID: ${session.id}\nUser: ${session.CreatedBy}`}
          />
        ))}

        {/* Logs grouped by session */}
        {sessionLogs.map((sessionGroup, idx) => (
          <MarkerClusterer key={`cluster-${sessionGroup.session_id}`}  options={{
            imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
        }}>
            {(clusterer) =>
              sessionGroup.logs.map((log, index) => {
                const latNum = parseFloat(log.lat);
                const lngNum = parseFloat(log.lon);
                if (isNaN(latNum) || isNaN(lngNum)) return null;

                const colors = ["#e67e22", "#3498db", "#2ecc71", "#9b59b6", "#f1c40f"];
                const color = colors[idx % colors.length];
                const MAP_PIN_PATH = 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z';
                const markerIcon = {
                  path: MAP_PIN_PATH,
                  scale: 5,
                  fillColor: color,
                  fillOpacity: 1,
                  strokeWeight: 1,
                  strokeColor: '#ffffff',
                  anchor: new window.google.maps.Point(0, -40)
                };

                return (
                  <Marker
                    key={`log-${sessionGroup.session_id}-${index}`}
                    position={{ lat: latNum, lng: lngNum }}
                    clusterer={clusterer}
                    icon={markerIcon}
                    title={`Session ID: ${sessionGroup.session_id}`}
                  />
                );
              })
            }
          </MarkerClusterer>
        ))}
      </GoogleMap>

      <SessionDetailPanel
        sessionData={selectedSessionData}
        isLoading={isPanelLoading}
        onClose={() => {
          setSelectedSessionData(null);
          handleClearPolygons();
        }}
      />
    </div>
  );
};

export default MapView;

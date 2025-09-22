// src/pages/MapView.jsx

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DrawingManager } from '@react-google-maps/api';
import { toast } from 'react-toastify';
import { adminApi, mapViewApi } from '../api/apiEndpoints';

import MapSidebar from '../components/map/layout/MapSidebar';
import SessionDetailPanel from '../components/map/layout/SessionDetail'; // Corrected import path
import MapHeader from '../components/map/layout/MapHeader';
import { Legend } from '../components/map/Legend';
import Spinner from '../components/common/Spinner';

const GOOGLE_MAPS_LIBRARIES = ["places", "drawing", "visualization", "geometry"];

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
    handleClearPolygons(); // Clear any existing polygons when a marker is clicked
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
    try {
      if (filters.session_id) {
        const singleSession = allSessions.filter(s => s.id.toString() === filters.session_id);
        setDisplayedMarkers(singleSession);
        toast.info(`${singleSession.length} session found.`);
        return;
      }
      const apiParams = {
        NetworkType: filters.NetworkType,
        StartDate: filters.StartDate,
        EndDate: filters.EndDate,
        limit: 50000,
      };
      const matchingLogs = await adminApi.getAllNetworkLogs(apiParams);
      if (!matchingLogs || matchingLogs.length === 0) {
        setDisplayedMarkers([]);
        toast.warn("No data found for the selected filters.");
        return;
      }
      const uniqueSessionIds = new Set(matchingLogs.map(log => log.session_id));
      const filteredSessions = allSessions.filter(session => uniqueSessionIds.has(session.id));
      setDisplayedMarkers(filteredSessions);
      toast.info(`${filteredSessions.length} sessions match your criteria.`);
    } catch (error) {
      toast.error("Failed to apply filters: " + error.message);
      setDisplayedMarkers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFilters = () => {
    setDisplayedMarkers(allSessions);
    setSelectedSessionData(null);
    handleClearPolygons();
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
      
      // Use the panel's loading state to show activity without hiding the map
      setIsPanelLoading(true);
      setSelectedSessionData(null); // Close any previously open session

      // Filter sessions that are inside the drawn polygon
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
      
      // Fetch logs for all sessions found inside the polygon
      const logFetchPromises = sessionsInside.map(session =>
        mapViewApi.getNetworkLog({ session_id: session.id, limit: 10000 })
      );
      const allLogsArrays = await Promise.all(logFetchPromises);
      const combinedLogs = allLogsArrays.flat().filter(Boolean);

      // Create a special "summary" session object to pass to the detail panel
      const summarySession = {
        id: `Area Selection (${sessionsInside.length} sessions)`,
        isMultiSession: true, // This is the key flag!
      };
      
      // Set the data that will open the panel and display the multi-session view
      setSelectedSessionData({
        session: summarySession,
        logs: combinedLogs,
        sessions: sessionsInside, // Pass the array of sessions
      });

    } catch (error) {
      console.error("Error processing polygon selection:", error);
      toast.error("An error occurred while fetching data for the selected area.");
    } finally {
      setIsPanelLoading(false); // Stop the panel spinner
    }
  };

  // Helper to clear drawn polygons from the map
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
    <div className="relative h-full w-full overflow-y-auto overflow-hidden">
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
        zoom={12}
        onLoad={onMapLoad}
        options={{ disableDefaultUI: true, zoomControl: true }}
      >
        {isLoaded && (
          <DrawingManager
            onPolygonComplete={handlePolygonComplete}
            options={drawingOptions}
          />
        )}
        
        {displayedMarkers.map(session => (
          <Marker
            key={session.id}
            position={{ lat: parseFloat(session.start_lat), lng: parseFloat(session.start_lon) }}
            onClick={() => handleMarkerClick(session)}
            title={`Session ID: ${session.id}\nUser: ${session.CreatedBy}`}
          />
        ))}
      </GoogleMap>
      
      {/* This panel will now appear when selectedSessionData is set */}
      <SessionDetailPanel
        sessionData={selectedSessionData}
        isLoading={isPanelLoading}
        onClose={() => {
            setSelectedSessionData(null);
            handleClearPolygons(); // Also clear polygons when closing the panel
        }}
      />
      
      {polygons.length > 0 && (
         <button
            onClick={() => {
                handleClearPolygons();
                setSelectedSessionData(null);
            }}
            className="absolute top-20 right-[25rem] z-20 px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 shadow"
            title="Clear drawn shapes and selection"
          >
            Clear Selection
          </button>
      )}
      
      
    </div>
  );
};

export default MapView;
// src/pages/MapView.jsx

import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { toast } from 'react-toastify';
import { adminApi, mapViewApi } from '../api/apiEndpoints';

import MapSidebar from '../components/map/layout/MapSidebar';
import SessionDetailPanel from '../components/map/layout/SessionDetail';
import MapHeader from '../components/map/layout/MapHeader';
import { Legend } from '../components/map/Legend';
import Spinner from '../components/common/Spinner';

const GOOGLE_MAPS_LIBRARIES = ["places", "drawing", "visualization"];

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
  const [isLoading, setIsLoading] = useState(true);
  const [isPanelLoading, setIsPanelLoading] = useState(false);

  // --- DATA FETCHING ---

  const fetchAllSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getSessions();
      const validSessions = (data || []).filter(s => s.start_lat != null && s.start_lon != null);
      setAllSessions(validSessions);
      setDisplayedMarkers(validSessions);
    } catch (error) {
      toast.error("Failed to fetch sessions: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllSessions();
  }, [fetchAllSessions]);

  // --- EVENT HANDLERS ---

  const handleMarkerClick = async (session) => {
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

    try {
      // Case 1: A specific session ID is selected. Filter on the frontend.
      if (filters.session_id) {
        const singleSession = allSessions.filter(s => s.id.toString() === filters.session_id);
        setDisplayedMarkers(singleSession);
        toast.info(`${singleSession.length} session found.`);
        return; // End the function here
      }

      // Case 2: Filter by date and/or network type via backend API call.
      const apiParams = {
        NetworkType: filters.NetworkType,
        StartDate: filters.StartDate,
        EndDate: filters.EndDate,
        limit: 50000, // Fetch enough logs to identify all relevant sessions
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
  };

  const onMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  if (loadError) return <div className="text-red-500 p-4 text-center">Error loading Google Maps.</div>;
  if (!isLoaded) return <div className="h-screen w-screen flex items-center justify-center"><Spinner /></div>;

  return (
    <div className="relative h-screen w-screen">
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
        mapContainerStyle={mapContainerStyle}
        center={DELHI_CENTER}
        zoom={12}
        onLoad={onMapLoad}
        options={{ disableDefaultUI: true, zoomControl: true }}
      >
        {!isLoading && displayedMarkers.map(session => (
          <Marker
            key={session.id}
            position={{ lat: parseFloat(session.start_lat), lng: parseFloat(session.start_lon) }}
            onClick={() => handleMarkerClick(session)}
            title={`Session ID: ${session.id}\nUser: ${session.CreatedBy}`}
          />
        ))}
      </GoogleMap>
      
      <SessionDetailPanel
        sessionData={selectedSessionData}
        isLoading={isPanelLoading}
        onClose={() => setSelectedSessionData(null)}
      />
      
      <Legend parameter={'RSRP'} />
    </div>
  );
};

export default MapView;
// src/components/map/layout/MapSidebar.jsx

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, XCircle } from 'lucide-react';

const getOneMonthAgo = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date;
};

const MapSidebar = ({sessions, onApplyFilters, onClearFilters }) => {
  const [filters, setFilters] = useState({
    startDate: getOneMonthAgo(),
    endDate: new Date(),
    networkType: 'ALL',
    sessionId: '',
  });

  const sessionsInDateRange = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    
    const start = filters.startDate ? new Date(filters.startDate).setHours(0, 0, 0, 0) : null;
    const end = filters.endDate ? new Date(filters.endDate).setHours(23, 59, 59, 999) : null;

    return sessions.filter(session => {
      const sessionDate = new Date(session.start_time);
      if (start && sessionDate < start) return false;
      if (end && sessionDate > end) return false;
      return true;
    });
  }, [sessions, filters.startDate, filters.endDate]);
  
  const handleFilterChange = (key, value) => {
    if (key === 'startDate' || key === 'endDate') {
        setFilters(prev => ({ ...prev, [key]: value, sessionId: '' }));
    } else {
        setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleApply = () => {
    const activeFilters = {};
    if (filters.sessionId) {
      activeFilters.session_id = filters.sessionId;
    }
    if (filters.startDate) {
      activeFilters.StartDate = filters.startDate.toISOString().split('T')[0];
    }
    if (filters.endDate) {
      activeFilters.EndDate = filters.endDate.toISOString().split('T')[0];
    }
    if (filters.networkType !== 'ALL') {
      activeFilters.NetworkType = filters.networkType;
    }
    onApplyFilters(activeFilters);
  };

  const handleClear = () => {
    setFilters({
      startDate: getOneMonthAgo(),
      endDate: new Date(),
      networkType: 'ALL',
      sessionId: '',
    });
    onClearFilters();
  };

  return (
    <div className="absolute top-4 left-4 h-[calc(80vh-2rem)] w-80 bg-white dark:bg-slate-950 dark:text-white rounded-lg border z-10 flex flex-col shadow-lg">
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold">Map Filters</h2>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-6">
        <div>
          <Label htmlFor="session-id-input">Search by Session ID</Label>
          <Input
            id="session-id-input"
            placeholder="Enter exact session ID"
            value={filters.sessionId}
            onChange={(e) => handleFilterChange('sessionId', e.target.value)}
          />
        </div>
        <div>
          <Label>Start Date</Label>
          <DatePicker date={filters.startDate} setDate={(d) => handleFilterChange('startDate', d)} />
        </div>
        <div>
          <Label>End Date</Label>
          <DatePicker date={filters.endDate} setDate={(d) => handleFilterChange('endDate', d)} />
        </div>
        <div>
            <Label>Session (within date range)</Label>
            <Select value={filters.sessionId} onValueChange={(v) => handleFilterChange('sessionId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a session..." />
              </SelectTrigger>
              <SelectContent>
                {sessionsInDateRange.length > 0 ? (
                  sessionsInDateRange.map(session => (
                    <SelectItem key={session.id} value={session.id.toString()}>
                      {`ID: ${session.id} (${session.CreatedBy || 'N/A'})`}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>No sessions in date range</SelectItem>
                )}
              </SelectContent>
            </Select>
        </div>
         <div>
            <Label>Network Type</Label>
            <Select value={filters.networkType} onValueChange={(v) => handleFilterChange('networkType', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ALL</SelectItem>
                <SelectItem value="2G">2G</SelectItem>
                <SelectItem value="3G">3G</SelectItem>
                <SelectItem value="4G">4G</SelectItem>
                <SelectItem value="5G">5G</SelectItem>
              </SelectContent>
            </Select>
        </div>
      </div>

      <div className="p-4 border-t space-y-2">
        <Button onClick={handleApply} className="w-full">
            <Filter className="h-4 w-4 mr-2" />
            Apply Filters
        </Button>
        <Button onClick={handleClear} className="w-full" variant="outline">
            <XCircle className="h-4 w-4 mr-2" />
            Clear & Show All Sessions
        </Button>
      </div>
    </div>
  );
};

export default MapSidebar;
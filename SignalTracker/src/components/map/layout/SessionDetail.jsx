// src/components/map/layout/SessionDetailPanel.jsx

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import Spinner from '@/components/common/Spinner';

// ✅ Helper function to calculate the average of a specific metric
const calculateAverage = (logs, key) => {
  // Filter out logs that don't have a valid, numeric value for the key
  const validLogs = logs.filter(log => typeof log[key] === 'number');
  if (validLogs.length === 0) return 'N/A';

  // Calculate the sum and then the average
  const sum = validLogs.reduce((acc, log) => acc + log[key], 0);
  return (sum / validLogs.length).toFixed(2); // Return average rounded to 2 decimal places
};


const SessionDetailPanel = ({ sessionData, onClose, isLoading }) => {
  // ✅ Calculate statistics using useMemo for performance
  const stats = useMemo(() => {
    if (!sessionData || !sessionData.logs || sessionData.logs.length === 0) {
      return {
        avgRsrp: 'N/A',
        avgRsrq: 'N/A',
        avgSinr: 'N/A',
        uniqueNetworks: 'N/A',
      };
    }

    const { logs } = sessionData;

    // Get a unique, clean list of network types
    const uniqueNetworks = [...new Set(logs.map(log => log.network).filter(Boolean))].join(', ');

    return {
      avgRsrp: calculateAverage(logs, 'rsrp'),
      avgRsrq: calculateAverage(logs, 'rsrq'),
      avgSinr: calculateAverage(logs, 'sinr'),
      uniqueNetworks: uniqueNetworks || 'N/A',
    };
  }, [sessionData]);


  if (!sessionData) {
    return null;
  }

  const { session, logs } = sessionData;

  return (
    <div className={`absolute top-0 right-0 h-full w-96 bg-white dark:bg-slate-900 shadow-2xl z-20 transform transition-transform ${session ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">Session Details</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
        </div>

        {/* Main Content */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {isLoading ? (
             <div className="flex justify-center items-center h-full"><Spinner /></div>
          ) : (
            <>
              {/* Session Info */}
              <div>
                <h4 className="font-semibold mb-2">Summary</h4>
                <div className="text-sm space-y-1 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                  <p><strong>Session ID:</strong> {session.id}</p>
                  <p><strong>User:</strong> {session.CreatedBy || 'N/A'}</p>
                  <p><strong>Device:</strong> {`${session.make || ''} ${session.model || ''}`.trim()}</p>
                  <p><strong>Started:</strong> {session.start_time ? new Date(session.start_time).toLocaleString() : 'N/A'}</p>
                </div>
              </div>

              {/* ✅ --- NEW STATISTICS SECTION --- ✅ */}
              <div>
                <h4 className="font-semibold mb-2">Statistics</h4>
                <div className="text-sm space-y-1 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg grid grid-cols-2 gap-2">
                    <p><strong>Avg RSRP:</strong> {stats.avgRsrp} dBm</p>
                    <p><strong>Avg RSRQ:</strong> {stats.avgRsrq} dB</p>
                    <p><strong>Avg SINR:</strong> {stats.avgSinr} dB</p>
                    <p className="col-span-2"><strong>Networks:</strong> {stats.uniqueNetworks}</p>
                </div>
              </div>

              {/* Network Logs Table */}
              <div>
                <h4 className="font-semibold mb-2">Network Logs ({logs.length} records)</h4>
                {logs.length > 0 ? (
                  <div className="border rounded-lg overflow-auto max-h-[calc(100vh-28rem)]">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-slate-700 sticky top-0">
                        <tr>
                          <th className="p-2 text-left">RSRP</th>
                          <th className="p-2 text-left">RSRQ</th>
                          <th className="p-2 text-left">SINR</th>
                          <th className="p-2 text-left">Network</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log, index) => (
                          <tr key={index} className="border-t dark:border-slate-700">
                            <td className="p-2">{log.rsrp ?? 'N/A'}</td>
                            <td className="p-2">{log.rsrq ?? 'N/A'}</td>
                            <td className="p-2">{log.sinr ?? 'N/A'}</td>
                            <td className="p-2">{log.network ?? 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No network logs found for this session.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionDetailPanel;
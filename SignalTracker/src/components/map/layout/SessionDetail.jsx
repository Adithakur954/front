import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import Spinner from '@/components/common/Spinner';


const calculateAverage = (logs, key) => {
  const validLogs = logs.filter(log => typeof log[key] === 'number' && !isNaN(log[key]));
  if (validLogs.length === 0) return 'N/A';
  const sum = validLogs.reduce((acc, log) => acc + log[key], 0);
  return (sum / validLogs.length).toFixed(2);
};

const SessionDetailPanel = ({ sessionData,
  isLoading,
  onClose,
  thresholds,
  selectedMetric }) => {
  const stats = useMemo(() => {
    if (!sessionData || !sessionData.logs || sessionData.logs.length === 0) {
      return { avgRsrp: 'N/A', avgRsrq: 'N/A', avgSinr: 'N/A', uniqueNetworks: 'N/A' };
    }
    const { logs } = sessionData;
    const uniqueNetworks = [...new Set(logs.map(log => log.network).filter(Boolean))].join(', ');
    return {
      avgRsrp: calculateAverage(logs, 'rsrp'),
      avgRsrq: calculateAverage(logs, 'rsrq'),
      avgSinr: calculateAverage(logs, 'sinr'),
      uniqueNetworks: uniqueNetworks || 'N/A',
    };
  }, [sessionData]);

  const metricSummary = useMemo(() => {
    if (!sessionData || !sessionData.logs || !thresholds[selectedMetric]) return [];

    const ranges = thresholds[selectedMetric];

    // Initialize counts
    const summary = ranges.map((r) => ({ ...r, count: 0 }));

    // Count logs per range
    sessionData.logs.forEach((log) => {
      const value = parseFloat(log[selectedMetric]);
      summary.forEach((range) => {
        if (value >= range.min && value <= range.max) range.count += 1;
      });
    });

    return summary;
  }, [sessionData, thresholds, selectedMetric]);

  if (!sessionData) return null;

  

  if (!sessionData) {
    return null; // Don't render if no data is provided
  }

  // Destructure all expected properties. `sessions` will exist for multi-session view.
  const { session, logs, sessions } = sessionData;
  const isMultiSession = session.isMultiSession || false;

  return (
    <div className={`absolute top-0 right-0  w-96 bg-white dark:bg-slate-900 shadow-2xl z-20 transform transition-transform ${sessionData ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">{isMultiSession ? 'Area Selection Details' : 'Session Details'}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {isLoading ? (
             <div className="flex justify-center items-center h-full"><Spinner /></div>
          ) : (
            <>
              {/* --- Conditionally render the top section based on selection type --- */}
              {isMultiSession ? (
                // TABLE DISPLAY FOR MULTIPLE SESSIONS
                <div>
                  <h4 className="font-semibold mb-2">Selected Sessions ({sessions?.length || 0})</h4>
                  <div className="border rounded-lg overflow-auto max-h-60">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-slate-700 sticky top-0">
                        <tr>
                          <th className="p-2 text-left">ID</th>
                          <th className="p-2 text-left">User</th>
                          <th className="p-2 text-left">Device</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions?.map(s => (
                          <tr key={s.id} className="border-t dark:border-slate-700">
                            <td className="p-2">{s.id}</td>
                            <td className="p-2">{s.CreatedBy || 'N/A'}</td>
                            <td className="p-2">{`${s.make || ''} ${s.model || ''}`.trim() || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                // SUMMARY DISPLAY FOR A SINGLE SESSION
                <div>
                  {console.log('Single session data:', session)}
                  <h4 className="font-semibold mb-2">Session Summary</h4>
                  <div className="text-sm space-y-1 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
  <p><strong>Session ID:</strong> {session.id}</p>
  <p><strong>User:</strong> {session.CreatedBy || 'N/A'}</p>
  <p><strong>Device:</strong> {`${session.make || ''} ${session.model || ''}`.trim() || 'N/A'}</p>
  <p><strong>Technology:</strong> {session.operator_name || 'N/A'}</p>
  <p><strong>Starting Address:</strong> {session.start_address || 'N/A'}</p>
  <p><strong>Ending Address:</strong> {session.end_address || 'N/A'}</p>
  <p><strong>Started:</strong> {session.start_time ? new Date(session.start_time).toLocaleString() : 'N/A'}</p>
  <p><strong>Ended:</strong> {session.end_time ? new Date(session.end_time).toLocaleString() : 'N/A'}</p>
  <p><strong>Coordinates:</strong> {session.start_lat}, {session.start_lon}</p>
</div>


                </div>
              )}

              {/* Statistics Section (works for both single and multi-session) */}
              <div>
                <h4 className="font-semibold mb-2">Aggregated Statistics</h4>
                <div className="text-sm grid grid-cols-2 gap-2 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                    <p><strong>Avg RSRP:</strong> {stats.avgRsrp} dBm</p>
                    <p><strong>Avg RSRQ:</strong> {stats.avgRsrq} dB</p>
                    <p><strong>Avg SINR:</strong> {stats.avgSinr} dB</p>
                    <p className="col-span-2"><strong>Networks:</strong> {stats.uniqueNetworks}</p>
                </div>
              </div>

             <h2 className="text-lg font-semibold mb-2">Session {sessionData.session.id}</h2>
      <p>Total logs: {sessionData.logs.length}</p>

      <h3 className="mt-4 font-medium">Metric: {selectedMetric.toUpperCase()}</h3>
      <div className="mt-2">
        {metricSummary.map((range, idx) => (
          <div key={idx} className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: range.color }}
              ></div>
              <span>{range.min} - {range.max}</span>
            </div>
            <span>{range.count}</span>
          </div>
        ))}
      </div>
            </>
          )}
        </div>
      </div>
      
    </div>
  );
};

export default SessionDetailPanel;
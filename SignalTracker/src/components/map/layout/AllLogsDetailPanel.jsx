import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import Spinner from '@/components/common/Spinner';

const resolveMetricConfig = (selectedMetric) => {
  const key = (selectedMetric || '').toLowerCase();
  const map = {
    rsrp:        { field: 'rsrp',    thresholdKey: 'rsrp',     label: 'RSRP' },
    rsrq:        { field: 'rsrq',    thresholdKey: 'rsrq',     label: 'RSRQ' },
    sinr:        { field: 'sinr',    thresholdKey: 'sinr',     label: 'SINR' },
    'dl-throughput': { field: 'dl_tpt', thresholdKey: 'dl_thpt', label: 'DL Throughput' },
    'ul-throughput': { field: 'ul_tpt', thresholdKey: 'ul_thpt', label: 'UL Throughput' },
    dl_tpt:      { field: 'dl_tpt', thresholdKey: 'dl_thpt',  label: 'DL Throughput' },
    ul_tpt:      { field: 'ul_tpt', thresholdKey: 'ul_thpt',  label: 'UL Throughput' },
    mos:         { field: 'mos',    thresholdKey: 'mos',       label: 'MOS' },
    'lte-bler':  { field: 'bler',   thresholdKey: 'lte_bler',  label: 'LTE BLER' },
    bler:        { field: 'bler',   thresholdKey: 'lte_bler',  label: 'LTE BLER' },
  };
  return map[key] || map.rsrp;
};

const AllLogsDetailPanel = ({ logs = [], thresholds = {}, selectedMetric = 'rsrp', isLoading, onClose }) => {
  const cfg = resolveMetricConfig(selectedMetric);
  const ranges = thresholds[cfg.thresholdKey] || [];

  const summary = useMemo(() => {
    if (!ranges.length || !logs.length) {
      return { total: 0, avg: 'N/A', min: 'N/A', max: 'N/A', buckets: [] };
    }

    const buckets = ranges.map(r => ({ ...r, count: 0 }));
    let total = 0;
    let sum = 0;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    logs.forEach(l => {
      const v = parseFloat(l?.[cfg.field]);
      if (Number.isFinite(v)) {
        total += 1;
        sum += v;
        if (v < min) min = v;
        if (v > max) max = v;

        for (const b of buckets) {
          if (v >= b.min && v <= b.max) {
            b.count += 1;
            break;
          }
        }
      }
    });

    return {
      total,
      avg: total ? (sum / total).toFixed(2) : 'N/A',
      min: total ? min.toFixed(2) : 'N/A',
      max: total ? max.toFixed(2) : 'N/A',
      buckets,
    };
  }, [logs, ranges, cfg.field]);

  return (
    <div className="absolute top-0 right-0 w-96 bg-white dark:bg-slate-900 shadow-2xl z-20">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">All Logs Metric Summary</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="text-sm space-y-1 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                <p><strong>Metric:</strong> {cfg.label}</p>
                <p><strong>Total logs:</strong> {summary.total}</p>
                <p><strong>Average:</strong> {summary.avg}</p>
                <p><strong>Min:</strong> {summary.min}</p>
                <p><strong>Max:</strong> {summary.max}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Distribution</h4>
                <div className="mt-2">
                  {summary.buckets.map((range, idx) => {
                    const pct = summary.total ? Math.round((range.count / summary.total) * 100) : 0;
                    return (
                      <div key={idx} className="mb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: range.color }} />
                            <span className="text-sm">{range.min} - {range.max}</span>
                          </div>
                          <span className="text-sm">{range.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded mt-1">
                          <div
                            className="h-2 rounded"
                            style={{ width: `${pct}%`, backgroundColor: range.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllLogsDetailPanel;
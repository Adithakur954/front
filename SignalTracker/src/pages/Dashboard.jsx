import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { adminApi } from "../api/apiEndpoints";
import Spinner from "../components/common/Spinner";
import {
  ResponsiveContainer,
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LabelList
} from "recharts";

import { Users, Car, Waypoints, FileText, Wifi } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const getRSRPPointColor = (rsrp) => {
  if (rsrp < -115) return '#FF0000'; // Red
  if (rsrp <= -105) return '#FFA500'; // Orange
  if (rsrp <= -95) return '#FFFF00'; // Yellow
  if (rsrp <= -90) return '#00008B'; // Dark Blue
  if (rsrp <= -85) return '#ADD8E6'; // Light Blue
  if (rsrp <= -75) return '#90EE90'; // Light Green
  return '#006400'; // Dark Green
};
const operatorMappings = {
  'Jio True5G': 'JIO 5G',
  'JIO 4G': 'JIO 4G',
  'JIO4G': 'JIO 4G',
  'Airtel': 'Airtel',
  'Vodafone IN': 'Vi (Vodafone Idea)',
  'Vi India': 'Vi (Vodafone Idea)',
  '//////': null,
  '404011': null,
};
function mergeAndCleanAverageData(rawData, operatorKey, valueKeys, countKey) {
  if (!Array.isArray(rawData)) return [];

  // This will store our aggregated data before the final calculation.
  // Structure: { 'Jio': { name: 'Jio', totalValue: { AvgRSRP: -90100, ... }, totalCount: 1010, groupCount: 2 } }
  const aggregated = rawData.reduce((acc, item) => {
    const messyName = item[operatorKey];
    const cleanName = operatorMappings[messyName];

    if (cleanName !== null && cleanName !== undefined) {
      // Initialize the entry if it's the first time we see this clean name.
      if (!acc[cleanName]) {
        acc[cleanName] = { 
          name: cleanName, 
          totalValue: {}, // Will store sum of (value * count)
          totalCount: 0,   // Will store sum of counts
          groupCount: 0    // How many groups we've merged
        };
        valueKeys.forEach(key => acc[cleanName].totalValue[key] = 0);
      }

      const sampleCount = item[countKey] || 1; // Default to 1 for simple average fallback
      
      // Add the current item's data to the accumulator.
      valueKeys.forEach(key => {
        acc[cleanName].totalValue[key] += (item[key] || 0) * sampleCount;
      });
      acc[cleanName].totalCount += sampleCount;
      acc[cleanName].groupCount += 1;
    }
    return acc;
  }, {});

  // Now, calculate the final averages for each clean operator.
  return Object.values(aggregated).map(item => {
    const finalItem = { [operatorKey]: item.name };
    
    valueKeys.forEach(key => {
        // If totalCount is greater than groupCount, it means we had real sample counts.
        // This is a heuristic to decide between weighted and simple average.
        if (item.totalCount > item.groupCount) {
             // Weighted Average
            finalItem[key] = item.totalValue[key] / item.totalCount;
        } else {
            // Simple Average Fallback (divide by number of groups merged)
            finalItem[key] = item.totalValue[key] / item.groupCount;
        }
    });

    return finalItem;
  });
}

function mergeAndCleanOperatorData(rawData) {
    if (!Array.isArray(rawData)) return [];
    const aggregated = rawData.reduce((acc, item) => {
        const cleanName = operatorMappings[item.name];
        if (cleanName !== null && cleanName !== undefined) {
            if (acc[cleanName]) {
                acc[cleanName].value += item.value;
            } else {
                acc[cleanName] = { name: cleanName, value: item.value };
            }
        }
        return acc;
    }, {});
    return Object.values(aggregated);
}
function normalizePayload(resp) {
  const payload = resp?.Data ?? resp?.data ?? resp ?? {};
  if (typeof payload === "string") {
    console.error("Server returned string payload (not JSON).");
    return null;
  }
  const toNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const normalizeArray = (arr, nameKeys = ["name", "operator", "Make", "band", "month", "network"], valueKeys = ["value", "count", "Avg", "AvgRSRP"]) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
      let name = null;
      for (const k of nameKeys) {
        if (item[k] !== undefined && item[k] !== null) { name = item[k]; break; }
      }
      let val = null;
      for (const k of valueKeys) {
        if (item[k] !== undefined && item[k] !== null) { val = item[k]; break; }
      }
      return { ...item, name: String(name ?? ""), value: toNumber(val ?? 0) };
    });
  };
  const cleanOperatorSamples = mergeAndCleanOperatorData(payload.operatorWiseSamples);
  const cleanAvgRsrpData = mergeAndCleanAverageData(
    payload.avgRsrpSinrPerOperator_bar, 
    'Operator',                       
    ['AvgRSRP', 'AvgSINR'],          
    'sampleCount'                     
  );
  return {
    totalUsers: payload.totalUsers ?? 0,
    totalActiveDevices: payload.activeDevices ?? 0,
    totalSessions: payload.totalSessions ?? 0,
    totalSignals: payload.totalSignals ?? 0,
    totalOnlineSessions: payload.totalOnlineSessions ?? 0,
    totalOperators: cleanOperatorSamples.length ?? 0,
    totalSamples: payload.totalSamples ?? payload.totalLogPoints ?? 0,
    totalbands: payload.bandDistribution_pie.length ?? 0,
    totalTechnologies: payload.networkTypeDistribution_horizontal_bar.length ?? 0,
    monthlySampleCounts: normalizeArray(payload.monthlySampleCounts, ["month"], ["count"]),
    operatorWiseSamples: normalizeArray(cleanOperatorSamples, ["name"], ["value"]),
    networkTypeDistribution: normalizeArray(payload.networkTypeDistribution_horizontal_bar, ["network"], ["count"]),
    avgRsrpPerOperator: normalizeArray(cleanAvgRsrpData, ["Operator"], ["AvgRSRP"]),
    bandDistribution: normalizeArray(payload.bandDistribution_pie, ["band"], ["count"]),
    handsetDistribution: normalizeArray(payload.handsetWiseAvg_bar, ["Make"], ["Avg"]),
  };
}


const DashboardChartCard = ({ title, children, dataset }) => (
  <Card className="bg-slate-800/80 text-white border-slate-700 backdrop-blur-sm shadow-xl">
    <CardHeader>
      <div className="flex justify-between items-center">
        <CardTitle className="text-base font-semibold text-slate-200">{title}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-full hover:bg-slate-700">
              <MoreVertical className="h-4 w-4 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700 text-slate-200">
            <DropdownMenuItem className="hover:bg-slate-800">Download PNG</DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-slate-800">Download CSV</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </CardHeader>
    <CardContent className="h-[300px]">
      {!dataset || dataset.length === 0 ? (
        <div className="flex items-center justify-center h-full text-slate-500">No data available</div>
      ) : (
        children
      )}
    </CardContent>
  </Card>
);


const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const CHART_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#ef4444'];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsResp, graphsResp] = await Promise.all([
          adminApi.getReactDashboardData(),
          adminApi.getDashboardGraphData()
        ]);
        console.log("📊 Raw Stats Response from API:", statsResp);
      console.log("📈 Raw Graphs Response from API:", graphsResp);
      // You can also log them together in one object for easy comparison
      console.log("Combined Raw Responses:", { statsResp, graphsResp });;
        const mergedPayload = { ...(statsResp?.Data ?? {}), ...(graphsResp?.Data ?? {}) };
        const normalized = normalizePayload(mergedPayload);
        setData(normalized);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        toast.error(`Failed to load dashboard: ${err.message ?? 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
    
    
  if (loading) return <Spinner />;
  if (!data) return <div className="p-6 text-red-500">Failed to load dashboard data.</div>;

  return (
    <div className="h-full overflow-y-auto space-y-6 bg-slate-900 text-slate-100 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="bg-purple-600 text-white border-none"><CardContent className="p-4 flex items-center gap-4"><Users className="h-8 w-8" /><div className="flex-1"><p className="text-3xl font-bold">{data.totalUsers}</p><p className="text-sm opacity-80">Users</p></div></CardContent></Card>
        <Card className="bg-teal-600 text-white border-none"><CardContent className="p-4 flex items-center gap-4"><Car className="h-8 w-8" /><div className="flex-1"><p className="text-3xl font-bold">{data.totalSessions}</p><p className="text-sm opacity-80">Total Drive Sessions</p></div></CardContent></Card>
        <Card className="bg-orange-600 text-white border-none"><CardContent className="p-4 flex items-center gap-4"><Waypoints className="h-8 w-8" /><div className="flex-1"><p className="text-3xl font-bold">{data.totalOnlineSessions}</p><p className="text-sm opacity-80">Online Sessions</p></div></CardContent></Card>
        <Card className="bg-amber-600 text-white border-none"><CardContent className="p-4 flex items-center gap-4"><FileText className="h-8 w-8" /><div className="flex-1"><p className="text-3xl font-bold">{data.totalSamples.toLocaleString()}</p><p className="text-sm opacity-80">Total Samples</p></div></CardContent></Card>
        <Card className="bg-sky-600 text-white border-none"><CardContent className="p-4 flex items-center gap-4"><Wifi className="h-8 w-8" /><div className="flex-1"><p className="text-3xl font-bold">{data.totalOperators}</p><p className="text-sm opacity-80">Operators</p></div></CardContent></Card>
        <Card className="bg-sky-600 text-white border-none"><CardContent className="p-4 flex items-center gap-4"><Wifi className="h-8 w-8" /><div className="flex-1"><p className="text-3xl font-bold">{data.totalTechnologies}</p><p className="text-sm opacity-80">Technologies</p></div></CardContent></Card>
        <Card className="bg-sky-600 text-white border-none"><CardContent className="p-4 flex items-center gap-4"><Wifi className="h-8 w-8" /><div className="flex-1"><p className="text-3xl font-bold">{data.totalbands}</p><p className="text-sm opacity-80">Total Bands</p></div></CardContent></Card>
        
      </div>

      
      

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardChartCard title="Monthly Samples/Session" dataset={data.monthlySampleCounts}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlySampleCounts} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#a0aec0' }} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#a0aec0' }} />
              <Tooltip cursor={{fill: 'rgba(128, 128, 128, 0.1)'}} contentStyle={{ backgroundColor: '#1a202c', borderColor: '#2d3748', color: '#e2e8f0' }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="value" position="top" style={{ fill: '#e2e8f0', fontSize: '14px', fontWeight: 'bold' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DashboardChartCard>

        <DashboardChartCard title="Operator wise Samples" dataset={data.operatorWiseSamples}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.operatorWiseSamples} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis type="number" tick={{ fill: '#a0aec0' }} fontSize={12} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#a0aec0' }} fontSize={12} />
              <Tooltip cursor={{fill: 'rgba(128, 128, 128, 0.1)'}} contentStyle={{ backgroundColor: '#1a202c', borderColor: '#2d3748', color: '#e2e8f0' }} />
              <Bar dataKey="value" fill="#f63bf0" name="Samples" radius={[0, 4, 4, 0]}>
                {/* ✅ BIGGER, BOLDER LABELS FOR VALUES */}
                <LabelList dataKey="value" position="right" style={{ fill: '#e2e8f0', fontSize: '14px', fontWeight: 'bold' }} />
                {data.operatorWiseSamples.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DashboardChartCard>

        <DashboardChartCard title="Network Type Distribution" dataset={data.networkTypeDistribution}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.networkTypeDistribution} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis type="number" tick={{ fill: '#a0aec0' }} fontSize={12}/>
              <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#a0aec0' }} fontSize={12} />
              <Tooltip cursor={{fill: 'rgba(128, 128, 128, 0.1)'}} contentStyle={{ backgroundColor: '#1a202c', borderColor: '#2d3748', color: '#e2e8f0' }} />
              <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]}>
                 {/* ✅ BIGGER, BOLDER LABELS FOR VALUES */}
                <LabelList dataKey="value" position="right" style={{ fill: '#e2e8f0', fontSize: '14px', fontWeight: 'bold' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DashboardChartCard>

        <DashboardChartCard title="Avg RSRP (dBm) Per Operator" dataset={data.avgRsrpPerOperator}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.avgRsrpPerOperator} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis type="number" domain={[-120, -60]} tick={{ fill: '#a0aec0' }} fontSize={12} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#a0aec0' }} fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a202c', borderColor: '#2d3748', color: '#e2e8f0' }} />
                    <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                    <Bar dataKey="value" fill="#f56264" name="RSRP" radius={[0, 4, 4, 0]}>
                        {data.avgRsrpPerOperator.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getRSRPPointColor(entry.value)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </DashboardChartCard>

        <DashboardChartCard title="Band Distribution" dataset={data.bandDistribution}>
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.bandDistribution} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis type="number" tick={{ fill: '#a0aec0' }} fontSize={12} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#a0aec0' }} fontSize={12} />
              <Tooltip cursor={{fill: 'rgba(128, 128, 128, 0.1)'}} contentStyle={{ backgroundColor: '#1a202c', borderColor: '#2d3748', color: '#e2e8f0' }} />
              <Bar dataKey="value" fill="#e6f02b" name="Count" radius={[0, 4, 4, 0]}>
                 {/* ✅ BIGGER, BOLDER LABELS FOR VALUES */}
                <LabelList dataKey="value" position="right" style={{ fill: '#e2e8f0', fontSize: '14px', fontWeight: 'bold' }} />
                {data.bandDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DashboardChartCard>

        <DashboardChartCard title="Handset wise Distribution" dataset={data.handsetDistribution}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.handsetDistribution} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="name" fontSize={12} tick={{ fill: '#a0aec0' }} />
              <YAxis fontSize={12} tick={{ fill: '#a0aec0' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1a202c', borderColor: '#2d3748', color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ color: '#e2e8f0' }} />
              <Bar dataKey="value" fill="#959de8" name="Avg RSRP" radius={[4, 4, 0, 0]}>
                {data.handsetDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getRSRPPointColor(entry.value)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DashboardChartCard>
      </div>
    </div>
  );
};

export default DashboardPage;
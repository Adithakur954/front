// src/pages/Dashboard.jsx

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

import { Users, Car, Waypoints, FileText, Wifi, BarChart2, RadioTower } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


const CHART_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#ef4444'];

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

function cleanAndMergeData(rawData, nameKey, valueKey, countKey) {
    if (!Array.isArray(rawData)) return [];

    const aggregated = rawData.reduce((acc, item) => {
        const name = operatorMappings[item[nameKey]] ?? item[nameKey];
        if (!name) return acc;

        if (!acc[name]) {
            acc[name] = { name: name, totalValue: 0, totalCount: 0 };
        }
        
        const value = item[valueKey] || 0;
        const count = item[countKey] || 1;

        acc[name].totalValue += value * count;
        acc[name].totalCount += count;
        return acc;
    }, {});

    return Object.values(aggregated).map(item => ({
        name: item.name,
        value: item.totalCount > 0 ? item.totalValue / item.totalCount : 0,
    }));
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

  const normalizeArray = (arr, nameKeys = ["name"], valueKeys = ["value"]) => {
      if (!Array.isArray(arr)) return [];
      return arr.map(item => {
          const name = nameKeys.reduce((acc, key) => acc || item[key], null);
          const value = valueKeys.reduce((acc, key) => acc || item[key], null);
          return { ...item, name: String(name ?? ""), value: toNumber(value ?? 0) };
      });
  };

  const cleanOperatorSamples = cleanAndMergeData(payload.operatorWiseSamples, 'name', 'value', 'count');

  return {
    totalUsers: payload.totalUsers ?? 0,
    totalSessions: payload.totalSessions ?? 0,
    totalOnlineSessions: payload.totalOnlineSessions ?? 0,
    totalSamples: payload.totalSamples ?? payload.totalLogPoints ?? 0,
    totalOperators: cleanOperatorSamples.length ?? 0,
    totalTechnologies: payload.networkTypeDistribution_horizontal_bar?.length ?? 0,
    totalBands: payload.bandDistribution_pie?.length ?? 0,
    monthlySampleCounts: normalizeArray(payload.monthlySampleCounts, ["month"], ["count"]),
    operatorWiseSamples: cleanOperatorSamples,
    networkTypeDistribution: normalizeArray(payload.networkTypeDistribution_horizontal_bar, ["network"], ["count"]),
    avgRsrpPerOperator: cleanAndMergeData(payload.avgRsrpSinrPerOperator_bar, 'Operator', 'AvgRSRP', 'sampleCount'),
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

const StatCard = ({ title, value, icon: Icon, color }) => (
    <Card className={`${color} text-white border-none`}>
        <CardContent className="p-4 flex items-center gap-4">
            <Icon className="h-8 w-8" />
            <div className="flex-1">
                <p className="text-3xl font-bold">{value.toLocaleString()}</p>
                <p className="text-sm opacity-80">{title}</p>
            </div>
        </CardContent>
    </Card>
);


const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsResp, graphsResp] = await Promise.all([
          adminApi.getReactDashboardData(),
          adminApi.getDashboardGraphData()
        ]);
        
        const mergedPayload = { ...(statsResp?.Data ?? {}), ...(graphsResp?.Data ?? {}) };
        const normalized = normalizePayload({ Data: mergedPayload }); // Wrap in Data for consistency
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

  const stats = [
      { title: "Users", value: data.totalUsers, icon: Users, color: "bg-purple-600" },
      { title: "Total Drive Sessions", value: data.totalSessions, icon: Car, color: "bg-teal-600" },
      { title: "Online Sessions", value: data.totalOnlineSessions, icon: Waypoints, color: "bg-orange-600" },
      { title: "Total Samples", value: data.totalSamples, icon: FileText, color: "bg-amber-600" },
      { title: "Operators", value: data.totalOperators, icon: Wifi, color: "bg-sky-600" },
      { title: "Technologies", value: data.totalTechnologies, icon: BarChart2, color: "bg-pink-600" },
      { title: "Total Bands", value: data.totalBands, icon: RadioTower, color: "bg-indigo-600" },
  ];

  return (
    <div className="h-full overflow-y-auto space-y-6 bg-slate-900 text-slate-100 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
          {stats.map(stat => <StatCard key={stat.title} {...stat} />)}
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
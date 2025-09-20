import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { adminApi } from "../api/apiEndpoints";
import Spinner from "../components/common/Spinner";
import {
  ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Label
} from "recharts";

import { Users, Car, Waypoints, FileText, Wifi } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

  return {
    totalUsers: payload.totalUsers ?? 0,
    totalSessions: payload.totalSessions ?? 0,
    totalOnlineSessions: payload.totalOnlineSessions ?? 0,
    totalSamples: payload.totalSamples ?? payload.totalLogPoints ?? 0,
    monthlySampleCounts: normalizeArray(payload.monthlySampleCounts, ["month"], ["count"]),
    operatorWiseSamples: normalizeArray(payload.operatorWiseSamples, ["name"], ["value"]),
    networkTypeDistribution: normalizeArray(payload.networkTypeDistribution_horizontal_bar, ["network"], ["count"]),
    avgRsrpPerOperator: normalizeArray(payload.avgRsrpSinrPerOperator_bar, ["Operator"], ["AvgRSRP"]),
    bandDistribution: normalizeArray(payload.bandDistribution_pie, ["band"], ["count"]),
    handsetDistribution: normalizeArray(payload.handsetWiseAvg_bar, ["Make"], ["Avg"]),
  };
}


const DashboardChartCard = ({ title, children, dataset }) => (
  <Card>
    <CardHeader>
      <div className="flex justify-between items-center">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-full hover:bg-gray-100">
              <MoreVertical className="h-4 w-4 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Download PNG</DropdownMenuItem>
            <DropdownMenuItem>Download CSV</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </CardHeader>
    <CardContent className="h-[300px]">
      {!dataset || dataset.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
      ) : (
        children
      )}
    </CardContent>
  </Card>
);


const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const PIE_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#f59e0b'];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsResp, graphsResp] = await Promise.all([
          adminApi.getReactDashboardData(),
          adminApi.getDashboardGraphData()
        ]);
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
  if (!data) return <div className="p-6">Failed to load dashboard data.</div>;

  return (
    <div className="h-full overflow-y-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="bg-purple-500 text-white"><CardContent className="p-4 flex items-center gap-4"><Users className="h-8 w-8" /><div className="flex-1"><p className="text-3xl font-bold">{data.totalUsers}</p><p className="text-sm opacity-80">Users</p></div></CardContent></Card>
        <Card className="bg-teal-500 text-white"><CardContent className="p-4 flex items-center gap-4"><Car className="h-8 w-8" /><div className="flex-1"><p className="text-3xl font-bold">{data.totalSessions}</p><p className="text-sm opacity-80">Total Drive Sessions</p></div></CardContent></Card>
        <Card className="bg-orange-500 text-white"><CardContent className="p-4 flex items-center gap-4"><Waypoints className="h-8 w-8" /><div className="flex-1"><p className="text-3xl font-bold">{data.totalOnlineSessions}</p><p className="text-sm opacity-80">Online Sessions</p></div></CardContent></Card>
        <Card className="bg-amber-500 text-white"><CardContent className="p-4 flex items-center gap-4"><FileText className="h-8 w-8" /><div className="flex-1"><p className="text-3xl font-bold">{data.totalSamples.toLocaleString()}</p><p className="text-sm opacity-80">Total Samples</p></div></CardContent></Card>
        <Card className="bg-sky-500 text-white"><CardContent className="p-4 flex items-center gap-4"><Wifi className="h-8 w-8" /><div className="flex-1"><p className="text-3xl font-bold">4</p><p className="text-sm opacity-80">Technologies</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardChartCard title="Monthly Samples/Session" dataset={data.monthlySampleCounts}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlySampleCounts}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DashboardChartCard>

        <DashboardChartCard title="Operator wise Samples" dataset={data.operatorWiseSamples}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.operatorWiseSamples} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} label={({ name, value }) => `${name}: ${value.toLocaleString()}`}>
                {data.operatorWiseSamples.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </DashboardChartCard>

        <DashboardChartCard title="Network Type Distribution" dataset={data.networkTypeDistribution}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.networkTypeDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" fontSize={12} />
              <YAxis dataKey="name" type="category" width={80} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DashboardChartCard>

        <DashboardChartCard title="Avg RSRP (dBm) Per Operator" dataset={data.avgRsrpPerOperator}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.avgRsrpPerOperator} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" fontSize={12}>
                            
                            <Label value=" " offset={-10} position="insideBottom" />
                        </XAxis>
              <YAxis dataKey="name" type="category" width={80} fontSize={12}>
                           
                            <Label value="Operator" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                        </YAxis>
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="RSRP" radius={[0, 4, 4, 0]}>
                {
                  data.avgRsrpPerOperator.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getRSRPPointColor(entry.value)} />
                  ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DashboardChartCard>

        <DashboardChartCard title="Band Distribution" dataset={data.bandDistribution}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.bandDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label>
                {data.bandDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </DashboardChartCard>

        <DashboardChartCard title="Handset wise Distribution" dataset={data.handsetDistribution}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.handsetDistribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Avg RSRP" radius={[4, 4, 0, 0]}>
                {
                  data.handsetDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getRSRPPointColor(entry.value)} />
                  ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DashboardChartCard>

      </div>
    </div>
  );
};

export default DashboardPage;
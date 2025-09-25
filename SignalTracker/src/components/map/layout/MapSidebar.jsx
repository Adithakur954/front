import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Layers } from "lucide-react";
import { mapViewApi } from "@/api/apiEndpoints";

const getYesterday = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return yesterday;
};

const defaultFilters = {
  startDate: getYesterday(),
  endDate: new Date(),
  provider: "ALL",
  technology: "ALL",
  band: "ALL",
  measureIn: "rsrp",
};

const normalizeProviderName = (raw) => {
  // Add any normalization rules you need; safe fallback is raw
  return (raw || "").trim();
};

const MapSidebar = ({ onApplyFilters, onClearFilters, initialFilters }) => {
  const [filters, setFilters] = useState(defaultFilters);
  const [providers, setProviders] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [bands, setBands] = useState([]);
  const [activeTab, setActiveTab] = useState("logs"); // reserved for future tabs

  useEffect(() => {
    if (!initialFilters) return;
    setFilters((prev) => ({ ...prev, ...initialFilters }));
  }, [initialFilters]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [provRes, techRes, bandsRes] = await Promise.all([
          mapViewApi.getProviders(),
          mapViewApi.getTechnologies(),
          mapViewApi.getBands(),
        ]);

        const provList = Array.isArray(provRes) ? provRes : [];
        const normalizedSet = new Set(provList.map((p) => normalizeProviderName(p.name)));
        const normalizedProviders = Array.from(normalizedSet).map((name) => ({
          id: name,
          name,
        }));

        setProviders(normalizedProviders);
        setTechnologies(Array.isArray(techRes) ? techRes : []);
        setBands(Array.isArray(bandsRes) ? bandsRes : []);
      } catch (error) {
        console.error("Failed to fetch filter options", error);
      }
    };

    fetchFilterOptions();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="absolute top-4 left-10 h-auto max-h-[90vh] w-80 bg-white dark:bg-slate-950 dark:text-white rounded-lg border z-10 flex flex-col shadow-lg">
      {/* Tabs header (only logs shown for now) */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === "logs"
              ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50 dark:bg-slate-900"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
          }`}
        >
          <Layers size={16} />
          Log Filters
        </button>
      </div>

      {/* Filters */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label>Start Date</Label>
            <DatePicker
              date={filters.startDate}
              setDate={(d) => handleFilterChange("startDate", d)}
            />
          </div>
          <div>
            <Label>End Date</Label>
            <DatePicker
              date={filters.endDate}
              setDate={(d) => handleFilterChange("endDate", d)}
            />
          </div>
        </div>

        <div>
          <Label>Provider</Label>
          <Select
            onValueChange={(v) => handleFilterChange("provider", v)}
            value={filters.provider}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Provider..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">ALL Providers</SelectItem>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.name}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Technology</Label>
          <Select
            onValueChange={(v) => handleFilterChange("technology", v)}
            value={filters.technology}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Technology..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">ALL Technologies</SelectItem>
              {technologies.map((t) => (
                <SelectItem key={t.id} value={t.name}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Visualize Metric</Label>
          <Select
            onValueChange={(v) => handleFilterChange("measureIn", v)}
            value={filters.measureIn}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select metric..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rsrp">RSRP</SelectItem>
              <SelectItem value="rsrq">RSRQ</SelectItem>
              <SelectItem value="sinr">SINR</SelectItem>
              <SelectItem value="ul-throughput">UL-Throughput</SelectItem>
              <SelectItem value="dl-throughput">DL-Throughput</SelectItem>
              <SelectItem value="lte-bler">LTE-BLER</SelectItem>
              <SelectItem value="mos">MOS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Band / Frequency</Label>
          <Select
            onValueChange={(v) => handleFilterChange("band", v)}
            value={filters.band}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Band..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">ALL Bands</SelectItem>
              {bands.map((b) => (
                <SelectItem key={b.id} value={b.name}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t flex gap-2">
        <Button variant="secondary" onClick={onClearFilters} className="flex-1">
          Clear
        </Button>
        <Button onClick={() => onApplyFilters(filters, "logs")} className="flex-1">
          <Filter className="h-4 w-4 mr-2" /> Apply & Fetch Logs
        </Button>
      </div>
    </div>
  );
};

export default MapSidebar;
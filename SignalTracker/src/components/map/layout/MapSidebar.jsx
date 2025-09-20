import React from 'react';
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ChevronDown, ChevronRight, TowerControl, WifiOff, FileJson, Users,
  BarChart, MapPin, Building, Filter
} from 'lucide-react';

// ✅ Reusable animated collapsible section component
const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        className="flex items-center justify-between w-full p-3 cursor-pointer hover:bg-gray-100"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={`${title}-content`}
      >
        <div className="flex items-center">
          <Icon className="h-5 w-5 mr-3 text-gray-600" />
          <span className="font-semibold text-sm text-gray-800">{title}</span>
        </div>
        {children && (
          isOpen
            ? <ChevronDown className="h-4 w-4 text-gray-500" />
            : <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {isOpen && children && (
        <div id={`${title}-content`} className="p-3 bg-gray-50">
          {children}
        </div>
      )}
    </div>
  );
};

// ✅ Main Sidebar Component
const MapSidebar = ({
  layerVisibility, setLayerVisibility,
  sessions, filters, setFilters, onApplyFilters, onFetchHeatmap
}) => {

  // Static lists of all options
  const technologies = ['2G', '3G', '4G', '5G'];
  const lteMetrics = ['RSRP', 'SINR', 'RSRQ'];
  const nrMetrics = ['SS-RSRP', 'SS-SINR', 'SS-RSRQ'];
  const polygons = ['City Boundaries', 'Service Areas'];

  // ✅ Handler for the layer checkboxes
  const handleLayerChange = (path, value) => {
    setLayerVisibility(prev => {
      const newState = structuredClone(prev); // modern deep copy
      let current = newState;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
      }
      const key = path[path.length - 1];
      current[key] = value !== undefined ? value : !current[key];
      return newState;
    });
  };

  // ✅ Handler for the primary data filters
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // ✅ Checkbox for multiple technologies/metrics
  const TechCheckbox = ({ tech, path }) => {
    if (!layerVisibility) return null;
    let isChecked = false;
    try {
      const parent = path.reduce((obj, key) => obj?.[key], layerVisibility);
      isChecked = parent?.[tech] ?? false;
    } catch {
      console.warn('Invalid path for checkbox:', path, tech);
    }
    return (
      <div className="flex items-center space-x-2 p-1.5">
        <Checkbox
          id={`${path.join('-')}-${tech}`}
          checked={isChecked}
          onCheckedChange={(checked) => handleLayerChange([...path, tech], checked === true)}
        />
        <Label
          htmlFor={`${path.join('-')}-${tech}`}
          className="text-xs font-medium text-gray-700 cursor-pointer"
        >
          {tech}
        </Label>
      </div>
    );
  };

  // ✅ Checkbox for single layers
  const SingleCheckbox = ({ label, path }) => {
    if (!layerVisibility) return null;

    let isChecked = false;
    try {
      isChecked = path.reduce((obj, key) => obj[key], layerVisibility);
    } catch {
      console.warn('Invalid path for checkbox:', path);
    }
    return (
      <div className="flex items-center space-x-2 p-2">
        <Checkbox
          id={path.join('-')}
          checked={isChecked}
          onCheckedChange={(checked) => handleLayerChange(path, checked === true)}
        />
        <Label
          htmlFor={path.join('-')}
          className="text-sm font-medium text-gray-700 cursor-pointer"
        >
          {label}
        </Label>
      </div>
    );
  };

  return (
    // ✅ Sidebar container
    <div className="absolute top-4 left-4 h-[calc(100vh-2rem)] w-72 sm:w-80 bg-white shadow-lg p-0 z-10 rounded-lg border border-gray-200 flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold text-gray-900">Map Controls</h2>
      </div>

      <div className="flex-grow overflow-y-auto">
        {/* --- Primary Filters --- */}
        <CollapsibleSection title="Primary Filters" icon={Filter} defaultOpen={true}>
          <div className="space-y-4 p-3">
            {/* Session Select */}
            <div>
              <Label htmlFor="session-select" className="text-xs font-semibold text-gray-600">Session</Label>
              <Select
                onValueChange={(value) => handleFilterChange('sessionId', value)}
                value={filters?.sessionId || ''}
              >
                <SelectTrigger id="session-select">
                  <SelectValue placeholder="Select a session..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md">
  {sessions?.map(session => (
    <SelectItem key={session.id} value={session.id.toString()}>
      {`ID ${session.id} (${session.CreatedBy || 'N/A'})`}
    </SelectItem>
  ))}
</SelectContent>
              </Select>
            </div>

            {/* Heatmap + Logs Buttons */}
            <div className="p-3">
              <Button onClick={onApplyFilters} className="w-full mt-2">
                Show Session Logs
              </Button>
              <Button onClick={onFetchHeatmap} variant="outline" className="w-full mt-2">
                Show Overall Heatmap
              </Button>
            </div>

            {/* Start Date */}
            <div>
              <Label className="text-xs font-semibold text-gray-600">Start Date</Label>
              <DatePicker
                date={filters?.startDate}
                setDate={(date) => handleFilterChange('startDate', date)}
              />
            </div>

            {/* End Date */}
            <div>
              <Label className="text-xs font-semibold bg-white text-gray-600">End Date</Label>
              <DatePicker
                date={filters?.endDate}
                setDate={(date) => handleFilterChange('endDate', date)}
              />
            </div>

            {/* Network Type */}
            <div>
              <Label htmlFor="network-select" className="text-xs font-semibold text-gray-600">Network Type</Label>
              <Select
                onValueChange={(value) => handleFilterChange('networkType', value)}
                value={filters?.networkType || 'ALL'}
              >
                <SelectTrigger id="network-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ALL</SelectItem>
                  <SelectItem value="4G">4G</SelectItem>
                  <SelectItem value="5G">5G</SelectItem>
                  <SelectItem value="3G">3G</SelectItem>
                  <SelectItem value="2G">2G</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleSection>

        {/* --- DT Metrics --- */}
        <CollapsibleSection title="DT Metrics" icon={BarChart} defaultOpen={true}>
          <div className="p-2 space-y-1">
            <CollapsibleSection title="LTE" icon={TowerControl} defaultOpen={true}>
              <div className="p-2">
                {lteMetrics.map(metric => (
                  <TechCheckbox key={metric} tech={metric} path={['dtMetrics', 'lte']} />
                ))}
              </div>
            </CollapsibleSection>
            <CollapsibleSection title="NR" icon={TowerControl}>
              <div className="p-2">
                {nrMetrics.map(metric => (
                  <TechCheckbox key={metric} tech={metric} path={['dtMetrics', 'nr']} />
                ))}
              </div>
            </CollapsibleSection>
          </div>
        </CollapsibleSection>

        {/* --- Failures --- */}
        <CollapsibleSection title="Failures" icon={WifiOff}>
          <div className="p-2 space-y-1">
            <CollapsibleSection title="Voice" icon={WifiOff}>
              <div className="p-2">
                {technologies.map(tech => (
                  <TechCheckbox key={tech} tech={tech} path={['failures', 'voice']} />
                ))}
              </div>
            </CollapsibleSection>
            <CollapsibleSection title="Data" icon={WifiOff}>
              <div className="p-2">
                {technologies.map(tech => (
                  <TechCheckbox key={tech} tech={tech} path={['failures', 'data']} />
                ))}
              </div>
            </CollapsibleSection>
          </div>
        </CollapsibleSection>

        {/* --- Polygons --- */}
        <CollapsibleSection title="Polygons" icon={FileJson}>
          <div className="p-2">
            {polygons.map(poly => (
              <TechCheckbox key={poly} tech={poly} path={['polygons', 'main']} />
            ))}
          </div>
        </CollapsibleSection>

        {/* --- Other Layers --- */}
        <CollapsibleSection title="Other Layers" icon={Users}>
          <div className="p-2 space-y-1">
            <SingleCheckbox label="Show Crowdsource Data" path={['crowdsource', 'main']} />
            <SingleCheckbox label="Show XCAP Metrics" path={['dtMetricsXCAP', 'main']} />
            <SingleCheckbox label="Show Serving Cells" path={['cell', 'main']} />
            <SingleCheckbox label="Show Cell Sites" path={['sites', 'main']} />
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
};

export default MapSidebar;

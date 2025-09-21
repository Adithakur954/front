import React from 'react';
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ChevronDown, ChevronRight, TowerControl, WifiOff, FileJson, Users,
  BarChart, Building, Filter
} from 'lucide-react';

// --- Reusable Themed Collapsible Section ---
// This sub-component is now fully theme-aware.
const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    // FIX: Added dark mode border color
    <div className="border-b border-slate-200 dark:border-slate-800 last:border-b-0">
      <button
        // FIX: Added dark mode hover background
        className="flex items-center justify-between w-full p-3 cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={`${title}-content`}
      >
        <div className="flex items-center">
          {/* FIX: Added dark mode text/icon colors */}
          <Icon className="h-5 w-5 mr-3 text-slate-500 dark:text-slate-400" />
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{title}</span>
        </div>
        {children && (
          isOpen
            ? <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            : <ChevronRight className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        )}
      </button>
      {isOpen && children && (
        // FIX: Added dark mode background for the content area
        <div id={`${title}-content`} className="p-3 bg-slate-50 dark:bg-slate-900">
          {children}
        </div>
      )}
    </div>
  );
};

// --- Main Sidebar Component ---
const MapSidebar = ({
  layerVisibility, setLayerVisibility,
  sessions, filters, setFilters, onApplyFilters, onFetchHeatmap
}) => {

  const technologies = ['2G', '3G', '4G', '5G'];
  const lteMetrics = ['RSRP', 'SINR', 'RSRQ'];
  const nrMetrics = ['SS-RSRP', 'SS-SINR', 'SS-RSRQ'];
  const polygons = ['City Boundaries', 'Service Areas'];

  const handleLayerChange = (path, value) => {
    setLayerVisibility(prev => {
      const newState = structuredClone(prev);
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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // --- Themed Checkbox Components ---
  const TechCheckbox = ({ tech, path }) => {
    if (!layerVisibility) return null;
    let isChecked = false;
    try {
      const parent = path.reduce((obj, key) => obj?.[key], layerVisibility);
      isChecked = parent?.[tech] ?? false;
    } catch { /* Fails silently */ }
    return (
      <div className="flex items-center space-x-2 p-1.5">
        <Checkbox
          id={`${path.join('-')}-${tech}`}
          checked={isChecked}
          onCheckedChange={(checked) => handleLayerChange([...path, tech], checked === true)}
        />
        {/* FIX: Added dark mode text color to the label */}
        <Label
          htmlFor={`${path.join('-')}-${tech}`}
          className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          {tech}
        </Label>
      </div>
    );
  };

  const SingleCheckbox = ({ label, path }) => {
    if (!layerVisibility) return null;
    let isChecked = false;
    try {
      isChecked = path.reduce((obj, key) => obj[key], layerVisibility);
    } catch { /* Fails silently */ }
    return (
      <div className="flex items-center space-x-2 p-2">
        <Checkbox
          id={path.join('-')}
          checked={isChecked}
          onCheckedChange={(checked) => handleLayerChange(path, checked === true)}
        />
        {/* FIX: Added dark mode text color to the label */}
        <Label
          htmlFor={path.join('-')}
          className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          {label}
        </Label>
      </div>
    );
  };

  return (
    // --- Main Sidebar Container with Theme Styles ---
    // FIX: Added dark mode background, border, and shadow.
    <div className="absolute top-4 left-4 h-[calc(100vh-2rem)] w-72 sm:w-80 bg-white dark:bg-slate-950 shadow-lg dark:shadow-black/40 p-0 z-10 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        {/* FIX: Added dark mode text color */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Map Controls</h2>
      </div>

      <div className="flex-grow overflow-y-auto">
        <CollapsibleSection title="Primary Filters" icon={Filter} defaultOpen={true}>
          <div className="space-y-4 p-3">
            {/* Session Select */}
            <div>
              {/* FIX: Removed bg-white and added dark mode text color */}
              <Label htmlFor="session-select" className="text-xs font-semibold text-slate-600 dark:text-slate-400">Session</Label>
              <Select
                onValueChange={(value) => handleFilterChange('sessionId', value)}
                value={filters?.sessionId || ''}
              >
                <SelectTrigger id="session-select">
                  <SelectValue placeholder="Select a session..." />
                </SelectTrigger>
                {/* FIX: Added dark mode styles to the dropdown content */}
                <SelectContent className="bg-white dark:bg-slate-900">
                  {sessions?.map(session => (
                    <SelectItem key={session.id} value={session.id.toString()}>
                      {`ID ${session.id} (${session.CreatedBy || 'N/A'})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Pickers */}
            <div>
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Start Date</Label>
              <DatePicker
                date={filters?.startDate}
                setDate={(date) => handleFilterChange('startDate', date)}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">End Date</Label>
              <DatePicker
                date={filters?.endDate}
                setDate={(date) => handleFilterChange('endDate', date)}
              />
            </div>

            {/* Network Type Select */}
            <div>
              <Label htmlFor="network-select" className="text-xs font-semibold text-slate-600 dark:text-slate-400">Network Type</Label>
              <Select
                onValueChange={(value) => handleFilterChange('networkType', value)}
                value={filters?.networkType || 'ALL'}
              >
                <SelectTrigger id="network-select"><SelectValue /></SelectTrigger>
                {/* FIX: Added dark mode styles to the dropdown content */}
                <SelectContent className="bg-white dark:bg-slate-900">
                  <SelectItem value="ALL">ALL</SelectItem>
                  <SelectItem value="4G">4G</SelectItem>
                  <SelectItem value="5G">5G</SelectItem>
                  <SelectItem value="3G">3G</SelectItem>
                  <SelectItem value="2G">2G</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-3 border-t border-slate-200 dark:border-slate-800">
            <Button onClick={onApplyFilters} className="w-full">
              Show Session Logs
            </Button>
            <Button onClick={onFetchHeatmap} variant="outline" className="w-full mt-2">
              Show Overall Heatmap
            </Button>
          </div>
        </CollapsibleSection>

        {/* --- Other sections will now correctly inherit the theme --- */}
        <CollapsibleSection title="DT Metrics" icon={BarChart} defaultOpen={true}>
          <div className="p-2 space-y-1">
            <CollapsibleSection title="LTE" icon={TowerControl} defaultOpen={true}>
              <div className="p-2">
                {lteMetrics.map(metric => <TechCheckbox key={metric} tech={metric} path={['dtMetrics', 'lte']} />)}
              </div>
            </CollapsibleSection>
            <CollapsibleSection title="NR" icon={TowerControl}>
              <div className="p-2">
                {nrMetrics.map(metric => <TechCheckbox key={metric} tech={metric} path={['dtMetrics', 'nr']} />)}
              </div>
            </CollapsibleSection>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Failures" icon={WifiOff}>
          <div className="p-2 space-y-1">
            <CollapsibleSection title="Voice" icon={WifiOff}>
              <div className="p-2">
                {technologies.map(tech => <TechCheckbox key={tech} tech={tech} path={['failures', 'voice']} />)}
              </div>
            </CollapsibleSection>
            <CollapsibleSection title="Data" icon={WifiOff}>
              <div className="p-2">
                {technologies.map(tech => <TechCheckbox key={tech} tech={tech} path={['failures', 'data']} />)}
              </div>
            </CollapsibleSection>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Polygons" icon={FileJson}>
          <div className="p-2">
            {polygons.map(poly => <TechCheckbox key={poly} tech={poly} path={['polygons', 'main']} />)}
          </div>
        </CollapsibleSection>

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

  
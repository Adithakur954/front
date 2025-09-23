import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from 'lucide-react';
import { mapViewApi } from '@/api/apiEndpoints';
import { Slider } from "@/components/ui/slider";

// Add default filters
const defaultFilters = {
    startDate: new Date(),
    endDate: new Date(),
    provider: 'ALL',
    technology: 'ALL',
    band: 'ALL',
    measureIn: 'rsrp',
    rsrpRange: [-140, 0],
    rsrqRange: [-34, 0],
    sinrRange: [-10, 50],
};

const MapSidebar = ({ onApplyFilters = () => {}, initialFilters = defaultFilters }) => {
    // Use the initialFilters with fallback to defaultFilters
    const [filters, setFilters] = useState(initialFilters || defaultFilters);
    const [providers, setProviders] = useState([]);
    const [technologies, setTechnologies] = useState([]);

    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const [provRes, techRes] = await Promise.all([
                    mapViewApi.getProviders(),
                    mapViewApi.getTechnologies()
                ]);
                setProviders(provRes || []);
                setTechnologies(techRes || []);
            } catch (error) {
                console.error("Failed to fetch filter options", error);
            }
        };
        fetchFilterOptions();
    }, []);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleRangeChange = (key, value) => {
        setFilters(prev => ({ ...prev, [`${key}Range`]: value }));
    };

    // Update filters when initialFilters changes
    useEffect(() => {
        if (initialFilters) {
            setFilters(initialFilters);
        }
    }, [initialFilters]);

    return (
        <div className="absolute top-4 left-4 h-auto max-h-[90vh] w-80 bg-white dark:bg-slate-950 dark:text-white rounded-lg border z-10 flex flex-col shadow-lg">
            <div className="p-4 border-b">
                <h2 className="text-lg font-bold">Log Data Filters</h2>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label>Start Date</Label>
                        <DatePicker date={filters.startDate} setDate={(d) => handleFilterChange('startDate', d)} />
                    </div>
                    <div>
                        <Label>End Date</Label>
                        <DatePicker date={filters.endDate} setDate={(d) => handleFilterChange('endDate', d)} />
                    </div>
                </div>

                <Select onValueChange={(v) => handleFilterChange('provider', v)} value={filters.provider}>
                    <Label>Provider</Label>
                    <SelectTrigger><SelectValue placeholder="Select Provider..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">ALL Providers</SelectItem>
                        {providers.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select onValueChange={(v) => handleFilterChange('technology', v)} value={filters.technology}>
                    <Label>Technology</Label>
                    <SelectTrigger><SelectValue placeholder="Select Technology..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">ALL Technologies</SelectItem>
                        {technologies.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select onValueChange={(v) => handleFilterChange('measureIn', v)} value={filters.measureIn}>
                    <Label>Visualize Metric</Label>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="rsrp">RSRP</SelectItem>
                        <SelectItem value="rsrq">RSRQ</SelectItem>
                        <SelectItem value="sinr">SINR</SelectItem>
                    </SelectContent>
                </Select>

                <div>
                    <Label>RSRP Range ({filters.rsrpRange.join(' to ')} dBm)</Label>
                    <Slider defaultValue={filters.rsrpRange} min={-140} max={0} step={1} onValueChange={(v) => handleRangeChange('rsrp', v)} />
                </div>
                <div>
                    <Label>RSRQ Range ({filters.rsrqRange.join(' to ')} dB)</Label>
                    <Slider defaultValue={filters.rsrqRange} min={-34} max={0} step={1} onValueChange={(v) => handleRangeChange('rsrq', v)} />
                </div>
                <div>
                    <Label>SINR Range ({filters.sinrRange.join(' to ')} dB)</Label>
                    <Slider defaultValue={filters.sinrRange} min={-10} max={50} step={1} onValueChange={(v) => handleRangeChange('sinr', v)} />
                </div>
            </div>

            <div className="p-4 border-t">
                <Button onClick={() => onApplyFilters(filters)} className="w-full">
                    <Filter className="h-4 w-4 mr-2" />
                    Apply & Fetch Data
                </Button>
            </div>
        </div>
    );
};

MapSidebar.propTypes = {
    onApplyFilters: PropTypes.func,
    initialFilters: PropTypes.shape({
        startDate: PropTypes.instanceOf(Date),
        endDate: PropTypes.instanceOf(Date),
        provider: PropTypes.string,
        technology: PropTypes.string,
        band: PropTypes.string,
        measureIn: PropTypes.string,
        rsrpRange: PropTypes.arrayOf(PropTypes.number),
        rsrqRange: PropTypes.arrayOf(PropTypes.number),
        sinrRange: PropTypes.arrayOf(PropTypes.number),
    })
};

export default MapSidebar;

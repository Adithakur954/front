import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Spinner from '../components/common/Spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SettingsPage = () => {
    const [settings, setSettings] = useState(null);
    const [thresholds, setThresholds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettingsData = () => {
            setLoading(true);
            setTimeout(() => {
                setSettings({
                    profile: { name: 'Amit Sethi', email: 'amit.sethi@example.com' },
                    notifications: { emailAlerts: true, pushNotifications: false },
                    theme: { darkMode: localStorage.getItem("theme") === "dark" },
                });
                setThresholds([
                    { id: 'rsrp', name: 'RSRP', range: '-140 to -105', min: -140, max: -105, color: '#FF0000', level: '' },
                    { id: 'rsrq', name: 'RSRQ', range: '-140 to -105', min: -140, max: -105, color: '#FFFF00', level: '' },
                    { id: 'sinr', name: 'SINR', range: '-105 to -95', min: -105, max: -95, color: '#000088', level: '' },
                    { id: 'dl_thpt', name: 'DL_thpt', range: '-95 to -90', min: -95, max: -90, color: '#ADD8E6', level: '' },
                    { id: 'ul_thpt', name: 'UL_thpt', range: '-90 to -85', min: -90, max: -85, color: '#000088', level: '' },
                ]);
                setLoading(false);
            }, 500);
        };
        fetchSettingsData();
    }, []);

    const handleThresholdChange = (index, field, value) => {
        const newThresholds = [...thresholds];
        newThresholds[index][field] = value;
        setThresholds(newThresholds);
    };

    const handleSaveChanges = () => {
        setLoading(true);
        setTimeout(() => {
            toast.success("Settings saved successfully!");
            setLoading(false);
        }, 1000);
    };

    const handleThemeChange = (checked) => {
        document.documentElement.classList.toggle("dark", checked);
        localStorage.setItem("theme", checked ? "dark" : "light");
        setSettings(prev => ({ ...prev, theme: { ...prev.theme, darkMode: checked } }));
    };

    if (loading || !settings) return <Spinner />;

    return (
        <div className="container mx-auto space-y-8">
            <h1 className="text-3xl font-bold">Settings</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Thresholds</CardTitle>
                    <CardDescription>Define signal strength ranges and corresponding colors for map visualization.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Parameter</TableHead>
                                <TableHead>Range</TableHead>
                                <TableHead>Min</TableHead>
                                <TableHead>Max</TableHead>
                                <TableHead>Color</TableHead>
                                <TableHead>Level</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {thresholds.map((item, index) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell><Input value={item.range} onChange={e => handleThresholdChange(index, 'range', e.target.value)} /></TableCell>
                                    <TableCell><Input type="number" value={item.min} onChange={e => handleThresholdChange(index, 'min', e.target.valueAsNumber)} /></TableCell>
                                    <TableCell><Input type="number" value={item.max} onChange={e => handleThresholdChange(index, 'max', e.target.valueAsNumber)} /></TableCell>
                                    <TableCell><Input type="color" value={item.color} onChange={e => handleThresholdChange(index, 'color', e.target.value)} className="p-1 h-8 w-14" /></TableCell>
                                    <TableCell><Input value={item.level} onChange={e => handleThresholdChange(index, 'level', e.target.value)} /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="justify-end">
                    <Button onClick={handleSaveChanges} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Thresholds'}
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize the look and feel.</CardDescription>
                </CardHeader>
                <CardContent>
                       <div className="flex items-center justify-between">
                            <Label htmlFor="darkMode">Dark Mode</Label>
                            <Switch
                                id="darkMode"
                                checked={settings.theme.darkMode}
                                onCheckedChange={handleThemeChange}
                            />
                        </div>

                        {/* --- NEW BUTTON ADDED HERE --- */}
                        <div className="mt-4 flex items-center justify-between">
                             
                             <Button
                                 onClick={() => handleThemeChange(!settings.theme.darkMode)}
                                 variant="outline"
                             >
                                 {settings.theme.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                             </Button>
                        </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SettingsPage;
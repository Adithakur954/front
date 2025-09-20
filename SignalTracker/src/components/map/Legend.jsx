// src/components/map/Legend.jsx
import React from 'react';

export const Legend = ({ parameter }) => {
    const legends = {
        RSRP: [
            { color: 'green', label: '>= -90 dBm (Excellent)' },
            { color: 'orange', label: '-100 to -90 dBm (Good)' },
            { color: 'red', label: '< -100 dBm (Poor)' },
        ],
        RSRQ: [
            { color: 'green', label: '>= -10 dB (Excellent)' },
            { color: 'orange', label: '-15 to -10 dB (Good)' },
            { color: 'red', label: '< -15 dB (Poor)' },
        ],
        SINR: [
            { color: 'green', label: '>= 20 dB (Excellent)' },
            { color: 'orange', label: '10 to 20 dB (Good)' },
            { color: 'red', label: '< 10 dB (Poor)' },
        ],
    };

    const currentLegend = legends[parameter];
    if (!currentLegend) return null;

    return (
        <div className="absolute bottom-10 right-3 bg-white p-3 rounded shadow-lg z-10">
            <h4 className="font-bold mb-2">{parameter} Legend</h4>
            {currentLegend.map((item, index) => (
                <div key={index} className="flex items-center mt-1">
                    <div style={{ width: '18px', height: '18px', backgroundColor: item.color }} className="mr-2 rounded-full"></div>
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    );
};
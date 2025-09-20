import React from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Map, Pin } from 'lucide-react';

const MapHeader = ({ map }) => {
    const goToMyLocation = () => {
        if (navigator.geolocation && map) {
            navigator.geolocation.getCurrentPosition(position => {
                const newPos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                map.panTo(newPos);
                map.setZoom(15);
            });
        }
    };

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-md z-20 flex items-center space-x-2">
            <div className="flex-grow">
                <Autocomplete>
                    <input
                        type="text"
                        placeholder="Search for a location..."
                        className="w-full px-4 py-2 text-sm bg-white shadow-lg rounded-full border-2 border-transparent focus:border-blue-500 focus:ring-0 outline-none"
                    />
                </Autocomplete>
            </div>
            <button 
                onClick={goToMyLocation}
                className="p-2.5 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                title="Go to my location"
            >
                <Pin className="h-5 w-5 text-blue-600" />
            </button>
        </div>
    );
};

export default MapHeader;

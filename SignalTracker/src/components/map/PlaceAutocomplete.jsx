// This is the recommended replacement for your search component
import React, { useRef, useEffect } from 'react';

const PlaceAutocomplete = ({ onPlaceSelect }) => {
    const inputRef = useRef(null);
    const autocompleteRef = useRef(null);

    useEffect(() => {
        if (!window.google || !inputRef.current) {
            return;
        }

        // Create the new PlaceAutocompleteElement
        const autocompleteElement = new window.google.maps.places.PlaceAutocompleteElement({
            inputElement: inputRef.current,
        });

        autocompleteRef.current = autocompleteElement;

        // Listen for the 'gmp-placeselect' event
        const listener = autocompleteElement.addEventListener('gmp-placeselect', async (event) => {
            const place = await event.target.place;
            if (place) {
                onPlaceSelect(place); // Pass the selected place to the parent component
            }
        });

        return () => {
            // Clean up the event listener
            if (listener) {
                listener.remove();
            }
        };
    }, [onPlaceSelect]);

    return (
        <input 
            ref={inputRef}
            type="text" 
            placeholder="Search for a location" 
            className="your-input-styles"
        />
    );
};

export default PlaceAutocomplete;
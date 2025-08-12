
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Route, Bus, Discount } from './types';
import { allRoutes as initialRoutes, allBuses as initialBuses, generateSeats } from './data';

// Derive initial locations from routes
const getInitialLocations = (routes: Route[]): string[] => {
    const locationSet = new Set<string>();
    routes.forEach(route => {
        locationSet.add(route.origin);
        locationSet.add(route.destination);
    });
    return Array.from(locationSet);
};


interface DataStore {
    routes: Route[];
    buses: Bus[];
    locations: string[];
    discounts: Discount[];
    addRoute: (route: Omit<Route, 'id' | 'arrivalTime'> & { arrivalTime?: Date }) => void;
    updateRoute: (route: Route) => void;
    deleteRoute: (id: string) => void;
    addBus: (bus: Omit<Bus, 'id' | 'layout'> & { layout?: Bus['layout'] }) => void;
    updateBus: (bus: Bus) => void;
    deleteBus: (id: string) => void;
    addLocation: (location: string) => void;
    updateLocation: (oldName: string, newName: string) => void;
    deleteLocation: (name: string) => void;
    addDiscount: (discount: Omit<Discount, 'id'>) => void;
    deleteDiscount: (id: string) => void;
}

export const DataContext = createContext<DataStore | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

// This can't be in a server component, so we define it here.
export function useDataProvider(): DataStore {
    const [routes, setRoutes] = useState<Route[]>(initialRoutes);
    const [buses, setBuses] = useState<Bus[]>(initialBuses);
    const [locations, setLocations] = useState<string[]>(getInitialLocations(initialRoutes));
    const [discounts, setDiscounts] = useState<Discount[]>([]);

    const addRoute = (route: Omit<Route, 'id' | 'arrivalTime'> & { arrivalTime?: Date }) => {
        const newRoute: Route = { 
            ...route, 
            id: `route-${Date.now()}`,
            // If arrivalTime is not provided, set it to 4 hours after departure
            arrivalTime: route.arrivalTime || new Date(route.departureTime.getTime() + 4 * 60 * 60 * 1000)
        };
        setRoutes(prev => [...prev, newRoute]);
    };

    const updateRoute = (updatedRoute: Route) => {
        setRoutes(prev => prev.map(r => r.id === updatedRoute.id ? updatedRoute : r));
    };

    const deleteRoute = (id: string) => {
        setRoutes(prev => prev.filter(r => r.id !== id));
    };

    const addBus = (bus: Omit<Bus, 'id' | 'layout'> & { layout?: Bus['layout'] }) => {
        const newBus: Bus = { 
            ...bus, 
            id: `bus-${Date.now()}`,
            layout: bus.layout || {
                rows: Math.ceil(bus.capacity / 4),
                cols: 5,
                seats: generateSeats(Math.ceil(bus.capacity / 4), 5, [2]),
            }
        };
        setBuses(prev => [...prev, newBus]);
    };
    
    const updateBus = (updatedBus: Bus) => {
        setBuses(prev => prev.map(b => b.id === updatedBus.id ? updatedBus : b));
    };
    
    const deleteBus = (id: string) => {
        setBuses(prev => prev.filter(b => b.id !== id));
    };

    const addLocation = (location: string) => {
        if (!locations.includes(location)) {
            setLocations(prev => [...prev, location].sort());
        }
    };
    
    const updateLocation = (oldName: string, newName: string) => {
        setLocations(prev => prev.map(loc => loc === oldName ? newName : loc));
        setRoutes(prev => prev.map(route => {
            let newRoute = {...route};
            if(route.origin === oldName) newRoute.origin = newName;
            if(route.destination === oldName) newRoute.destination = newName;
            return newRoute;
        }));
    };
    
    const deleteLocation = (name: string) => {
        setLocations(prev => prev.filter(loc => loc !== name));
    };

    const addDiscount = (discount: Omit<Discount, 'id'>) => {
        const newDiscount: Discount = {
            ...discount,
            id: `discount-${Date.now()}`
        };
        setDiscounts(prev => [...prev, newDiscount]);
    };

    const deleteDiscount = (id: string) => {
        setDiscounts(prev => prev.filter(d => d.id !== id));
    };


    return {
        routes, buses, locations, discounts,
        addRoute, updateRoute, deleteRoute,
        addBus, updateBus, deleteBus,
        addLocation, updateLocation, deleteLocation,
        addDiscount, deleteDiscount
    };
}

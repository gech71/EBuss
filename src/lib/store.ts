
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Route, Bus, Discount, Booking } from './types';
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
    bookings: Booking[];
    getBusById: (busId: string) => Bus | undefined;
    addRoute: (route: Omit<Route, 'id'>) => void;
    updateRoute: (route: Route) => void;
    deleteRoute: (id: string) => void;
    addBus: (bus: Omit<Bus, 'id' | 'layout'> & { layout?: Bus['layout'] }) => void;
    updateBus: (bus: Bus) => void;
    deleteBus: (id: string) => void;
    addLocation: (location: string) => void;
    updateLocation: (oldName: string, newName: string) => void;
    deleteLocation: (name: string) => void;
    addDiscount: (discount: Omit<Discount, 'id'>) => void;
    updateDiscount: (discount: Discount) => void;
    deleteDiscount: (id: string) => void;
    addBooking: (booking: Booking) => boolean;
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
    const [bookings, setBookings] = useState<Booking[]>([]);

    const getBusById = (busId: string) => {
        return buses.find(b => b.id === busId);
    };

    const addRoute = (route: Omit<Route, 'id'>) => {
        const newRoute: Route = { 
            ...route, 
            id: `route-${Date.now()}`,
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

    const updateDiscount = (updatedDiscount: Discount) => {
        setDiscounts(prev => prev.map(d => d.id === updatedDiscount.id ? updatedDiscount : d));
    };

    const deleteDiscount = (id: string) => {
        setDiscounts(prev => prev.filter(d => d.id !== id));
    };

    const addBooking = (booking: Booking): boolean => {
        let success = true;
        setBuses(prevBuses => {
            const relevantRoute = routes.find(r => r.id === booking.routeId);
            const busToUpdate = prevBuses.find(bus => bus.id === relevantRoute?.busId);

            if (!busToUpdate) {
                success = false;
                return prevBuses;
            }

            // Check if all selected seats are still available
            for (const selectedSeat of booking.seats) {
                const seatInStore = busToUpdate.layout.seats.find(s => s.id === selectedSeat.id);
                if (!seatInStore || seatInStore.status !== 'available') {
                    success = false;
                    break;
                }
            }

            if (!success) {
                return prevBuses; // Don't update state if booking fails
            }

            // If all seats are available, proceed to book them
            const newBuses = prevBuses.map(bus => {
                if (bus.id === relevantRoute?.busId) {
                    const newSeats = bus.layout.seats.map(seat => {
                        if (booking.seats.find(s => s.id === seat.id)) {
                            return { ...seat, status: 'occupied' };
                        }
                        return seat;
                    });
                    return { ...bus, layout: { ...bus.layout, seats: newSeats } };
                }
                return bus;
            });

            return newBuses;
        });
        
        if (success) {
            setBookings(prev => [...prev, booking]);
        }
        
        return success;
    };


    return {
        routes, buses, locations, discounts, bookings,
        getBusById,
        addRoute, updateRoute, deleteRoute,
        addBus, updateBus, deleteBus,
        addLocation, updateLocation, deleteLocation,
        addDiscount, updateDiscount, deleteDiscount,
        addBooking,
    };
}

    
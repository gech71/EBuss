
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Route, Bus, Discount, Booking, Seat } from './types';
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

const getInitialBookings = (routes: Route[], buses: Bus[]): { bookings: Booking[], updatedBuses: Bus[] } => {
    const sampleBookings: Booking[] = [];
    const busesCopy = JSON.parse(JSON.stringify(buses));

    const bookSeat = (busId: string, seatId: string) => {
        const bus = busesCopy.find((b: Bus) => b.id === busId);
        if (bus) {
            const seat = bus.layout.seats.find((s: Seat) => s.id === seatId);
            if (seat && seat.status === 'available') {
                seat.status = 'occupied';
                return seat;
            }
        }
        return null;
    };

    const route1 = routes[0];
    const route2 = routes[1];
    const route3 = routes[0]; // another booking for the first route to make it popular

    if (route1) {
        const seat1A = bookSeat(route1.busId, '1A');
        if (seat1A) {
            sampleBookings.push({
                id: 'ticket-001',
                routeId: route1.id,
                seats: [seat1A],
                totalPrice: route1.price,
                bookingTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                passengerName: 'Alice Johnson',
                passengerEmail: 'alice@example.com',
            });
        }
    }
    
    if (route2) {
        const seat2B = bookSeat(route2.busId, '2B');
        const seat2C = bookSeat(route2.busId, '2C');
        if (seat2B && seat2C) {
             sampleBookings.push({
                id: 'ticket-002',
                routeId: route2.id,
                seats: [seat2B, seat2C],
                totalPrice: route2.price * 2,
                bookingTime: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
                passengerName: 'Bob Williams',
                passengerEmail: 'bob@example.com',
            });
        }
    }

    if (route3) {
        const seat3D = bookSeat(route3.busId, '3D');
        if (seat3D) {
            sampleBookings.push({
                id: 'ticket-003',
                routeId: route3.id,
                seats: [seat3D],
                totalPrice: route3.price,
                bookingTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                passengerName: 'Charlie Brown',
                passengerEmail: 'charlie@example.com',
            });
        }
    }

    return { bookings: sampleBookings, updatedBuses: busesCopy };
}


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
    const { bookings: initialBookings, updatedBuses: initialBusesWithBookings } = getInitialBookings(initialRoutes, initialBuses);
    const [buses, setBuses] = useState<Bus[]>(initialBusesWithBookings);
    const [locations, setLocations] = useState<string[]>(getInitialLocations(initialRoutes));
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [bookings, setBookings] = useState<Booking[]>(initialBookings);

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

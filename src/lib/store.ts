
"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import type { Route, Bus, Discount, Booking, Seat, BusOwner, CommissionTier } from './types';
import { allRoutes as initialGlobalRoutes, allBuses as initialGlobalBuses, allOwners as initialAllOwnersData, generateSeats } from './data';
import { usePathname } from 'next/navigation';


// --- SIMULATED AUTH ---
// In a real app, this would come from an auth context (e.g., Firebase Auth)
const SUPER_ADMIN_ID = 'super-admin';
const SUPER_ADMIN_USER: BusOwner = { 
    id: SUPER_ADMIN_ID, 
    name: 'System Provider',
    commissionTiers: [] // Super admin has no commission
};
const LOGGED_IN_USER_ID = SUPER_ADMIN_ID; // Simulate logging in as the super admin
// To test as a regular owner, change the above to: const LOGGED_IN_USER_ID = initialAllOwnersData[0].id;
// --- END SIMULATED AUTH ---


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

    const route1 = routes.find(r => r.id === 'route-01');
    const route2 = routes.find(r => r.id === 'route-02');
    const route3 = routes.find(r => r.id === 'route-01'); // another booking for the first route

    if (route1) {
        const seat1A = bookSeat(route1.busId, '1A');
        if (seat1A) {
            sampleBookings.push({
                id: 'ticket-001',
                routeId: route1.id,
                seats: [seat1A],
                totalPrice: route1.price,
                bookingTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
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
                bookingTime: new Date(Date.now() - 12 * 60 * 60 * 1000),
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
                bookingTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
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
    owners: BusOwner[];
    isSuperAdmin: boolean;
    viewedOwnerId: string;
    setViewedOwnerId: (id: string) => void;
    getBusById: (busId: string) => Bus | undefined;
    getOwnerById: (ownerId: string) => BusOwner | undefined;
    addRoute: (route: Omit<Route, 'id'>) => void;
    updateRoute: (route: Route) => void;
    deleteRoute: (id: string) => void;
    addBus: (bus: Omit<Bus, 'id' | 'layout' | 'ownerId'> & { layout?: Bus['layout'] }) => void;
    updateBus: (bus: Bus) => void;
    deleteBus: (id: string) => void;
    addLocation: (location: string) => void;
    updateLocation: (oldName: string, newName: string) => void;
    deleteLocation: (name: string) => void;
    addDiscount: (discount: Omit<Discount, 'id'>) => void;
    updateDiscount: (discount: Discount) => void;
    deleteDiscount: (id: string) => void;
    addBooking: (booking: Booking) => boolean;
    addOwner: (name: string, commissionTiers: CommissionTier[]) => void;
    updateOwner: (owner: BusOwner) => void;
    deleteOwner: (id: string) => void;
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
    const pathname = usePathname();
    const isSuperAdminPage = pathname.startsWith('/super-admin');

    // --- Global State ---
    const [globalRoutes, setGlobalRoutes] = useState<Route[]>(initialGlobalRoutes);
    const { bookings: initialBookings, updatedBuses: initialBusesWithBookings } = getInitialBookings(initialGlobalRoutes, initialGlobalBuses);
    const [globalBuses, setGlobalBuses] = useState<Bus[]>(initialBusesWithBookings);
    const [globalBookings, setGlobalBookings] = useState<Booking[]>(initialBookings);
    const [allOwners, setAllOwners] = useState<BusOwner[]>([SUPER_ADMIN_USER, ...initialAllOwnersData]);


    // --- View State (for super-admin switching) ---
    const [viewState, setViewState] = useState<{ viewedOwnerId?: string }>({});

    // --- Scoped State (based on logged-in user) ---
    const { isSuperAdmin, viewedOwnerId, setViewedOwnerId } = useMemo(() => {
        const admin = LOGGED_IN_USER_ID === SUPER_ADMIN_ID;
        // In super-admin section, view the selected owner. Otherwise, view your own.
        let currentId = admin && isSuperAdminPage 
            ? (viewState.viewedOwnerId || initialAllOwnersData[0]?.id) 
            : LOGGED_IN_USER_ID;

        // If a non-admin somehow lands on super-admin page, default to their own ID.
        if (isSuperAdminPage && !admin) {
            currentId = LOGGED_IN_USER_ID;
        }

        return {
            isSuperAdmin: admin,
            viewedOwnerId: currentId,
            setViewedOwnerId: (id: string) => setViewState(s => ({...s, viewedOwnerId: id})),
        };
    }, [viewState.viewedOwnerId, isSuperAdminPage]);

    
    const buses = useMemo(() => {
        if (!viewedOwnerId) return [];
        if (isSuperAdmin && !isSuperAdminPage) return []; // Super admin on /admin sees nothing
        return globalBuses.filter(bus => bus.ownerId === viewedOwnerId);
    }, [globalBuses, viewedOwnerId, isSuperAdmin, isSuperAdminPage]);

    const busIdsForCurrentUser = useMemo(() => new Set(buses.map(b => b.id)), [buses]);

    const routes = useMemo(() => {
        return globalRoutes.filter(route => busIdsForCurrentUser.has(route.busId));
    }, [globalRoutes, busIdsForCurrentUser]);

    const routeIdsForCurrentUser = useMemo(() => new Set(routes.map(r => r.id)), [routes]);

    const bookings = useMemo(() => {
        if (isSuperAdmin && !isSuperAdminPage) return [];
        return globalBookings.filter(booking => routeIdsForCurrentUser.has(booking.routeId));
    }, [globalBookings, routeIdsForCurrentUser, isSuperAdmin, isSuperAdminPage]);
    
    // Non-scoped data
    const [locations, setLocations] = useState<string[]>(getInitialLocations(initialGlobalRoutes));
    const [discounts, setDiscounts] = useState<Discount[]>([]);


    const getBusById = (busId: string) => {
        return globalBuses.find(b => b.id === busId);
    };
    
    const getOwnerById = (ownerId: string) => {
        return allOwners.find(o => o.id === ownerId);
    };

    const addRoute = (route: Omit<Route, 'id'>) => {
        const newRoute: Route = { 
            ...route, 
            id: `route-${Date.now()}`,
        };
        setGlobalRoutes(prev => [...prev, newRoute]);
    };

    const updateRoute = (route: Route) => {
        setGlobalRoutes(prev => prev.map(r => r.id === route.id ? route : r));
    };

    const deleteRoute = (id: string) => {
        setGlobalRoutes(prev => prev.filter(r => r.id !== id));
    };

    const addBus = (bus: Omit<Bus, 'id' | 'layout' | 'ownerId'> & { layout?: Bus['layout'] }) => {
        const newBus: Bus = { 
            ...bus, 
            id: `bus-${Date.now()}`,
            ownerId: viewedOwnerId, // Assign to the currently viewed/logged-in owner
            layout: bus.layout || {
                rows: Math.ceil(bus.capacity / 4),
                cols: 5,
                seats: generateSeats(Math.ceil(bus.capacity / 4), 5, [2]),
            }
        };
        setGlobalBuses(prev => [...prev, newBus]);
    };
    
    const updateBus = (updatedBus: Bus) => {
        if (updatedBus.ownerId !== viewedOwnerId && !isSuperAdmin) return;
        setGlobalBuses(prev => prev.map(b => b.id === updatedBus.id ? updatedBus : b));
    };
    
    const deleteBus = (id: string) => {
        const busToDelete = globalBuses.find(b => b.id === id);
        if (!busToDelete) return;
        if (busToDelete.ownerId !== viewedOwnerId && !isSuperAdmin) return;
        setGlobalBuses(prev => prev.filter(b => b.id !== id));
    };

    const addLocation = (location: string) => {
        if (!locations.includes(location)) {
            setLocations(prev => [...prev, location].sort());
        }
    };
    
    const updateLocation = (oldName: string, newName: string) => {
        setLocations(prev => prev.map(loc => loc === oldName ? newName : loc));
        setGlobalRoutes(prev => prev.map(route => {
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
        setGlobalBuses(prevBuses => {
            const relevantRoute = globalRoutes.find(r => r.id === booking.routeId);
            const busToUpdate = prevBuses.find(bus => bus.id === relevantRoute?.busId);

            if (!busToUpdate) {
                success = false;
                return prevBuses;
            }

            for (const selectedSeat of booking.seats) {
                const seatInStore = busToUpdate.layout.seats.find(s => s.id === selectedSeat.id);
                if (!seatInStore || seatInStore.status !== 'available') {
                    success = false;
                    break;
                }
            }

            if (!success) {
                return prevBuses;
            }

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
            setGlobalBookings(prev => [...prev, booking]);
        }
        
        return success;
    };
    
    const addOwner = (name: string, commissionTiers: CommissionTier[]) => {
        const newOwner: BusOwner = { id: `owner-${Date.now()}`, name, commissionTiers };
        setAllOwners(prev => [...prev, newOwner]);
    };

    const updateOwner = (updatedOwner: BusOwner) => {
        setAllOwners(prev => prev.map(o => o.id === updatedOwner.id ? updatedOwner : o));
    };

    const deleteOwner = (id: string) => {
        const ownerHasBuses = globalBuses.some(bus => bus.ownerId === id);
        if (ownerHasBuses) {
            console.error("Cannot delete owner with active buses.");
            return;
        }
        setAllOwners(prev => prev.filter(owner => owner.id !== id));
    };


    return {
        routes, buses, locations, discounts, bookings, owners: allOwners, isSuperAdmin, viewedOwnerId, setViewedOwnerId,
        getBusById, getOwnerById,
        addRoute, updateRoute, deleteRoute,
        addBus, updateBus, deleteBus,
        addLocation, updateLocation, deleteLocation,
        addDiscount, updateDiscount, deleteDiscount,
        addBooking,
        addOwner, updateOwner, deleteOwner
    };
}

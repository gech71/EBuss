
"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import type { Route, Bus, Discount, Booking, Seat, BusOwner, CommissionTier, User } from './types';
import { allRoutes as initialGlobalRoutes, allBuses as initialGlobalBuses, allOwners as initialAllOwnersData, allDiscounts as initialGlobalDiscounts, generateSeats } from './data';

// --- SIMULATED AUTH ---
const SUPER_ADMIN_ID = 'super-admin';
const SUPER_ADMIN_USER: BusOwner = { 
    id: SUPER_ADMIN_ID, 
    name: 'System Provider',
    commissionTiers: [] // Super admin has no commission
};
const CUSTOMER_ID = 'customer';

const initialUsers: User[] = [
    { id: 'user-super', name: 'Super Admin', email: 'super@example.com', ownerId: SUPER_ADMIN_ID, password: 'password' },
    { id: 'user-admin-1', name: 'Admin User', email: 'admin@example.com', ownerId: 'owner-01', password: 'password' }
];
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
    loading: boolean;
    routes: Route[];
    buses: Bus[];
    locations: string[];
    discounts: Discount[];
    bookings: Booking[];
    owners: BusOwner[];
    users: User[];
    isSuperAdmin: boolean;
    loggedInUserId: string | null;
    loggedInUser: User | null;
    setLoggedInUserId: (id: string | null) => void;
    login: (email: string, password: string) => { user: User; token: string } | null;
    logout: () => void;
    register: (details: Omit<User, 'id' | 'ownerId'>) => { success: boolean, message?: string };
    getBusById: (busId: string) => Bus | undefined;
    getOwnerById: (ownerId: string) => BusOwner | undefined;
    addRoute: (route: Omit<Route, 'id'>) => void;
    updateRoute: (route: Route) => void;
    deleteRoute: (id: string) => void;
    addBus: (bus: Omit<Bus, 'id' | 'ownerId'> & { layout?: Bus['layout'] }) => void;
    updateBus: (bus: Bus) => void;
    deleteBus: (id: string) => void;
    addLocation: (location: string) => void;
    updateLocation: (oldName: string, newName: string) => void;
    deleteLocation: (name: string) => void;
    addDiscount: (discount: Omit<Discount, 'id'>) => void;
    updateDiscount: (discount: Discount) => void;
    deleteDiscount: (id: string) => void;
    addBooking: (booking: Omit<Booking, 'id'>) => boolean;
    addOwner: (name: string, commissionTiers: Omit<CommissionTier, 'id'>[]) => void;
    updateOwner: (owner: BusOwner) => void;
    deleteOwner: (id: string) => void;
    addUser: (user: Omit<User, 'id' | 'password'>, password?: string) => void;
}

export const DataContext = createContext<DataStore | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export function useDataProvider(): DataStore {
    const [loading, setLoading] = useState(true);
    // --- Global State ---
    const [globalRoutes, setGlobalRoutes] = useState<Route[]>([]);
    const [globalBuses, setGlobalBuses] = useState<Bus[]>([]);
    const [globalBookings, setGlobalBookings] = useState<Booking[]>([]);
    const [allOwners, setAllOwners] = useState<BusOwner[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [locations, setLocations] = useState<string[]>([]);
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    
    const [loggedInUserId, setLoggedInUserIdState] = useState<string | null>(null);

    useEffect(() => {
        const { bookings: initialBookings, updatedBuses: initialBusesWithBookings } = getInitialBookings(initialGlobalRoutes, initialGlobalBuses);
        
        setGlobalRoutes(initialGlobalRoutes);
        setGlobalBuses(initialBusesWithBookings);
        setGlobalBookings(initialBookings);
        setAllOwners([SUPER_ADMIN_USER, ...initialAllOwnersData]);
        setUsers(initialUsers);
        setLocations(getInitialLocations(initialGlobalRoutes));
        setDiscounts(initialGlobalDiscounts);

        // Check for token in localStorage on initial load
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const decoded = JSON.parse(atob(token.split('.')[1]));
                setLoggedInUserIdState(decoded.sub);
            } catch (e) {
                localStorage.removeItem('authToken');
            }
        }

        setLoading(false);
    }, []);


    const setLoggedInUserId = (id: string | null) => {
        setLoggedInUserIdState(id);
    };
    
    const login = (email: string, password: string): { user: User; token: string } | null => {
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            const subject = user.ownerId === CUSTOMER_ID ? user.id : user.ownerId;
            setLoggedInUserIdState(subject);
            // Create a mock JWT token
            const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
            const payload = btoa(JSON.stringify({ sub: subject, name: user.name, iat: Date.now() }));
            const signature = 'mock-signature'; // In a real app, this would be a real signature
            const token = `${header}.${payload}.${signature}`;
            return { user, token };
        }
        return null;
    };

    const logout = () => {
        setLoggedInUserIdState(null);
        localStorage.removeItem('authToken');
    };

    const register = (details: Omit<User, 'id' | 'ownerId'>): { success: boolean, message?: string } => {
        if (users.some(u => u.email === details.email)) {
            return { success: false, message: 'A user with this email already exists.' };
        }
        const newUser: User = {
            id: `user-${Date.now()}`,
            name: details.name,
            email: details.email,
            password: details.password,
            ownerId: CUSTOMER_ID, // All registered users are customers
        };
        setUsers(prev => [...prev, newUser]);
        return { success: true };
    };

    // --- Scoped State (based on logged-in user) ---
    const isSuperAdmin = loggedInUserId === SUPER_ADMIN_ID;
    
    const loggedInUser = useMemo(() => {
        if (!loggedInUserId) return null;
        // The `sub` in the token can be either an ownerId or a customer's userId
        const userById = users.find(u => u.id === loggedInUserId);
        if (userById) return userById;
        const userByOwnerId = users.find(u => u.ownerId === loggedInUserId);
        return userByOwnerId || null;
    }, [users, loggedInUserId]);

    const buses = useMemo(() => {
        if (!loggedInUserId || loggedInUserId.startsWith('user-')) return globalBuses;
        if (isSuperAdmin) return globalBuses;
        return globalBuses.filter(bus => bus.ownerId === loggedInUserId);
    }, [globalBuses, loggedInUserId, isSuperAdmin]);

    const busIdsForCurrentUser = useMemo(() => new Set(buses.map(b => b.id)), [buses]);

    const routes = useMemo(() => {
        if (isSuperAdmin || !loggedInUserId || loggedInUserId.startsWith('user-')) return globalRoutes;
        return globalRoutes.filter(route => busIdsForCurrentUser.has(route.busId));
    }, [globalRoutes, busIdsForCurrentUser, isSuperAdmin, loggedInUserId]);

    const routeIdsForCurrentUser = useMemo(() => new Set(routes.map(r => r.id)), [routes]);

    const bookings = useMemo(() => {
        if (!loggedInUserId || loggedInUserId.startsWith('user-')) return [];
        if (isSuperAdmin) return globalBookings;
        return globalBookings.filter(booking => routeIdsForCurrentUser.has(booking.routeId));
    }, [globalBookings, routeIdsForCurrentUser, isSuperAdmin, loggedInUserId]);
    
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

    const addBus = (bus: Omit<Bus, 'id' | 'ownerId'> & { layout?: Bus['layout'] }) => {
        if (loggedInUserId === CUSTOMER_ID || isSuperAdmin || !loggedInUserId) return;
        
        const newBus: Bus = { 
            ...bus,
            name: bus.name,
            capacity: bus.capacity,
            id: `bus-${Date.now()}`,
            ownerId: loggedInUserId,
            layout: bus.layout || {
                rows: Math.ceil(bus.capacity / 4),
                cols: 5,
                seats: generateSeats(Math.ceil(bus.capacity / 4), 5, [2]),
            }
        };
        setGlobalBuses(prev => [...prev, newBus]);
    };
    
    const updateBus = (updatedBus: Bus) => {
        if (updatedBus.ownerId !== loggedInUserId && !isSuperAdmin) return;
        setGlobalBuses(prev => prev.map(b => b.id === updatedBus.id ? updatedBus : b));
    };
    
    const deleteBus = (id: string) => {
        const busToDelete = globalBuses.find(b => b.id === id);
        if (!busToDelete) return;
        if (busToDelete.ownerId !== loggedInUserId && !isSuperAdmin) return;
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

    const addBooking = (booking: Omit<Booking, 'id'>): boolean => {
        let success = true;
        let newBooking: Booking | null = null;
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
            
            newBooking = { ...booking, id: `ticket-${Date.now()}` };

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
        
        if (success && newBooking) {
            setGlobalBookings(prev => [...prev, newBooking!]);
        }
        
        return success;
    };
    
    const addOwner = (name: string, commissionTiers: Omit<CommissionTier, 'id'>[]) => {
        const newOwner: BusOwner = { 
            id: `owner-${Date.now()}`, 
            name, 
            commissionTiers: commissionTiers.map(tier => ({...tier, id: `tier-${Math.random()}`}))
        };
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

    const addUser = (user: Omit<User, 'id' | 'password'>, password = 'password') => {
        const newUser: User = { ...user, id: `user-${Date.now()}`, password };
        setUsers(prev => [...prev, newUser]);
    };


    return {
        loading,
        routes, buses, locations, discounts, bookings, owners: allOwners, users, isSuperAdmin, loggedInUserId, loggedInUser, setLoggedInUserId, login, logout, register,
        getBusById, getOwnerById,
        addRoute, updateRoute, deleteRoute,
        addBus, updateBus, deleteBus,
        addLocation, updateLocation, deleteLocation,
        addDiscount, updateDiscount, deleteDiscount,
        addBooking,
        addOwner, updateOwner, deleteOwner,
        addUser
    };
}

    

"use client";

import React, { useState, useEffect } from 'react';
import { DataContext } from '@/lib/store';
import type { Route, Bus, Discount, Booking, Seat, BusOwner, CommissionTier, User } from '@/lib/types';
import { allRoutes as initialGlobalRoutes, allBuses as initialGlobalBuses, allOwners as initialAllOwnersData, allDiscounts as initialGlobalDiscounts, generateSeats } from '@/lib/data';

// --- SIMULATED AUTH ---
const SUPER_ADMIN_ID = 'super-admin';
const SUPER_ADMIN_USER: BusOwner = { 
    id: SUPER_ADMIN_ID, 
    name: 'System Provider',
    commissionTiers: [] // Super admin has no commission
};
const CUSTOMER_ID = 'customer';

const initialUsers: User[] = [
    { id: 'user-super', name: 'Super Admin', email: 'super@example.com', ownerId: SUPER_ADMIN_ID, role: 'SUPER_ADMIN', password: 'password' },
    { id: 'user-admin-1', name: 'Admin User', email: 'admin@example.com', ownerId: 'owner-01', role: 'ADMIN', password: 'password' }
];
// --- END SIMULATED AUTH ---


// Derive initial locations from routes
const getInitialLocations = (routes: Route[]): string[] => {
    const locationSet = new Set<string>();
    routes.forEach(route => {
        locationSet.add(route.origin);
        locationSet.add(route.destination);
    });
    return Array.from(locationSet).sort();
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

interface AllData {
    routes: Route[];
    buses: Bus[];
    bookings: Booking[];
    owners: BusOwner[];
    users: User[];
    locations: string[];
    discounts: Discount[];
}

// --- LocalStorage keys ---
const LOCAL_STORAGE_KEY = 'ezbus_data';


export function DataProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    
    // --- Global State ---
    const [allData, setAllData] = useState<AllData>({
        routes: [],
        buses: [],
        bookings: [],
        owners: [],
        users: [],
        locations: [],
        discounts: []
    });
    
    // Effect to load data from localStorage or initialize it
    useEffect(() => {
        try {
            const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedData) {
                const parsedData = JSON.parse(storedData);
                // Dates need to be re-hydrated from strings
                parsedData.routes.forEach((r: Route) => {
                    r.departureTime = new Date(r.departureTime);
                    r.arrivalTime = new Date(r.arrivalTime);
                });
                parsedData.bookings.forEach((b: Booking) => {
                    b.bookingTime = new Date(b.bookingTime);
                });
                parsedData.discounts.forEach((d: Discount) => {
                    d.startDate = new Date(d.startDate);
                    d.endDate = new Date(d.endDate);
                });
                setAllData(parsedData);
            } else {
                // Initialize with default data if nothing is stored
                const { bookings: initialBookings, updatedBuses: initialBusesWithBookings } = getInitialBookings(initialGlobalRoutes, initialGlobalBuses);
                const initialData = {
                    routes: initialGlobalRoutes,
                    buses: initialBusesWithBookings,
                    bookings: initialBookings,
                    owners: [SUPER_ADMIN_USER, ...initialAllOwnersData],
                    users: initialUsers,
                    locations: getInitialLocations(initialGlobalRoutes),
                    discounts: initialGlobalDiscounts,
                };
                setAllData(initialData);
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialData));
            }
        } catch (error) {
            console.error("Failed to load or initialize data:", error);
            // Handle potential errors (e.g., corrupted data) by resetting to default
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateAndPersistData = (updater: (currentData: AllData) => AllData) => {
        setAllData(prevData => {
            const newData = updater(prevData);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));
            return newData;
        });
    };

    const getBusById = (busId: string) => {
        return allData.buses.find(b => b.id === busId);
    };
    
    const getOwnerById = (ownerId: string) => {
        return allData.owners.find(o => o.id === ownerId);
    };

    const addRoute = (route: Omit<Route, 'id'>) => {
        const newRoute: Route = { 
            ...route, 
            id: `route-${Date.now()}`,
        };
        updateAndPersistData(data => ({ ...data, routes: [...data.routes, newRoute] }));
    };

    const updateRoute = (route: Route) => {
        updateAndPersistData(data => ({ ...data, routes: data.routes.map(r => r.id === route.id ? route : r) }));
    };

    const deleteRoute = (id: string) => {
        updateAndPersistData(data => ({ ...data, routes: data.routes.filter(r => r.id !== id) }));
    };

    const addBus = (bus: Omit<Bus, 'id' | 'ownerId'> & { layout?: Bus['layout'] }) => {
        const newBus: Bus = { 
            ...bus,
            name: bus.name,
            capacity: bus.capacity,
            id: `bus-${Date.now()}`,
            ownerId: 'temp-owner', // This will need to be set properly in a real app
            layout: bus.layout || {
                rows: Math.ceil(bus.capacity / 4),
                cols: 5,
                seats: generateSeats(Math.ceil(bus.capacity / 4), 5, [2]),
            }
        };
        updateAndPersistData(data => ({ ...data, buses: [...data.buses, newBus] }));
    };
    
    const updateBus = (updatedBus: Bus) => {
        updateAndPersistData(data => ({ ...data, buses: data.buses.map(b => b.id === updatedBus.id ? updatedBus : b) }));
    };
    
    const deleteBus = (id: string) => {
        updateAndPersistData(data => ({ ...data, buses: data.buses.filter(b => b.id !== id) }));
    };

    const addLocation = (location: string) => {
        if (!allData.locations.includes(location)) {
            updateAndPersistData(data => ({ ...data, locations: [...data.locations, location].sort() }));
        }
    };
    
    const updateLocation = (oldName: string, newName: string) => {
        updateAndPersistData(data => {
            const newLocations = data.locations.map(loc => loc === oldName ? newName : loc);
            const newRoutes = data.routes.map(route => {
                let newRoute = {...route};
                if(route.origin === oldName) newRoute.origin = newName;
                if(route.destination === oldName) newRoute.destination = newName;
                return newRoute;
            });
            return { ...data, locations: newLocations, routes: newRoutes };
        });
    };
    
    const deleteLocation = (name: string) => {
        updateAndPersistData(data => ({ ...data, locations: data.locations.filter(loc => loc !== name) }));
    };

    const addDiscount = (discount: Omit<Discount, 'id' | 'ownerId'>) => {
        const newDiscount: Discount = {
            ...discount,
            id: `discount-${Date.now()}`,
            ownerId: 'temp-owner', // This needs to be dynamic based on logged-in user
        };
        updateAndPersistData(data => ({ ...data, discounts: [...data.discounts, newDiscount] }));
    };

    const updateDiscount = (updatedDiscount: Discount) => {
        updateAndPersistData(data => ({ ...data, discounts: data.discounts.map(d => d.id === updatedDiscount.id ? updatedDiscount : d) }));
    };

    const deleteDiscount = (id: string) => {
        updateAndPersistData(data => ({ ...data, discounts: data.discounts.filter(d => d.id !== id) }));
    };

    const addBooking = (bookingData: Omit<Booking, 'bookingTime'>): boolean => {
        let success = false;
        
        updateAndPersistData(currentData => {
            const relevantRoute = currentData.routes.find(r => r.id === bookingData.routeId);
            const busToUpdate = currentData.buses.find(bus => bus.id === relevantRoute?.busId);

            if (!busToUpdate) {
                console.error("Bus not found for booking.");
                success = false;
                return currentData;
            }

            // Verify all selected seats are available
            for (const selectedSeat of bookingData.seats) {
                const seatInStore = busToUpdate.layout.seats.find(s => s.id === selectedSeat.id);
                if (!seatInStore || seatInStore.status !== 'available') {
                    console.error(`Seat ${selectedSeat.id} is not available.`);
                    success = false;
                    return currentData;
                }
            }

            // All seats are available, proceed with booking
            const newBooking: Booking = {
                ...bookingData,
                bookingTime: new Date(),
            };

            const newBuses = currentData.buses.map(bus => {
                if (bus.id === relevantRoute?.busId) {
                    const newSeats = bus.layout.seats.map(seat => 
                        bookingData.seats.find(s => s.id === seat.id)
                            ? { ...seat, status: 'occupied' as const }
                            : seat
                    );
                    return { ...bus, layout: { ...bus.layout, seats: newSeats } };
                }
                return bus;
            });

            const newData = {
                ...currentData,
                buses: newBuses,
                bookings: [...currentData.bookings, newBooking],
            };

            success = true;
            return newData;
        });

        return success;
    };
    
    const addOwner = (name: string, commissionTiers: Omit<CommissionTier, 'id'>[]) => {
        const newOwner: BusOwner = { 
            id: `owner-${Date.now()}`, 
            name, 
            commissionTiers: commissionTiers.map(tier => ({...tier, id: `tier-${Math.random()}`}))
        };
        updateAndPersistData(data => ({ ...data, owners: [...data.owners, newOwner] }));
    };

    const updateOwner = (updatedOwner: BusOwner) => {
        updateAndPersistData(data => ({ ...data, owners: data.owners.map(o => o.id === updatedOwner.id ? updatedOwner : o) }));
    };

    const deleteOwner = (id: string) => {
        const ownerHasBuses = allData.buses.some(bus => bus.ownerId === id);
        if (ownerHasBuses) {
            console.error("Cannot delete owner with active buses.");
            return;
        }
        updateAndPersistData(data => ({ ...data, owners: data.owners.filter(owner => owner.id !== id) }));
    };

    const addUser = (user: Omit<User, 'id' | 'password' | 'role'>, password = 'password') => {
        const newUser: User = { ...user, id: `user-${Date.now()}`, password, role: 'ADMIN' };
        updateAndPersistData(data => ({ ...data, users: [...data.users, newUser] }));
    };
    
    const value = {
        ...allData,
        loading,
        getBusById, getOwnerById,
        addRoute, updateRoute, deleteRoute,
        addBus, updateBus, deleteBus,
        addLocation, updateLocation, deleteLocation,
        addDiscount, updateDiscount, deleteDiscount,
        addBooking,
        addOwner, updateOwner, deleteOwner,
        addUser
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}

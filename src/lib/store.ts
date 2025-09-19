

"use client";

import React, { createContext, useContext } from 'react';
import type { Route, Bus, Discount, Booking, Seat, BusOwner, CommissionTier, User } from './types';

// This is a placeholder for the data store shape. The actual implementation is in DataProvider.tsx
interface DataStore {
    routes: Route[];
    buses: Bus[];
    bookings: Booking[];
    owners: BusOwner[];
    users: User[];
    locations: string[];
    discounts: Discount[];
    loading: boolean;
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
    addDiscount: (discount: Omit<Discount, 'id' | 'ownerId'>) => void;
    updateDiscount: (discount: Discount) => void;
    deleteDiscount: (id: string) => void;
    addBooking: (booking: Omit<Booking, 'bookingTime'>) => boolean;
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

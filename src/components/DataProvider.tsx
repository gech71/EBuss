
"use client";

import React, { useState, useEffect } from 'react';
import { DataContext } from '@/lib/store';
import type { Route, Bus, Discount, Booking, Seat, BusOwner, CommissionTier, User, Location } from '@/lib/types';
import { allRoutes as initialGlobalRoutes, allBuses as initialGlobalBuses, allOwners as initialAllOwnersData, allDiscounts as initialGlobalDiscounts, generateSeats, allLocations as initialAllLocations } from '@/lib/data';

// This component is now deprecated and will be removed in a future step.
// It is kept for now to avoid breaking the build.
// All data fetching and state management is now handled by Prisma and server components/actions.
export function DataProvider({ children }: { children: React.ReactNode }) {
    const value = {
        routes: [],
        buses: [],
        bookings: [],
        owners: [],
        users: [],
        locations: [],
        discounts: [],
        loading: false,
        getBusById: () => undefined,
        getOwnerById: () => undefined,
        addRoute: () => {},
        updateRoute: () => {},
        deleteRoute: () => {},
        addBus: () => {},
        updateBus: () => {},
        deleteBus: () => {},
        addLocation: () => {},
        updateLocation: () => {},
        deleteLocation: () => {},
        addDiscount: () => {},
        updateDiscount: () => {},
        deleteDiscount: () => {},
        addBooking: () => false,
        addOwner: () => {},
        updateOwner: () => {},
        deleteOwner: () => {},
        addUser: () => {}
    };

    return (
        <DataContext.Provider value={value as any}>
            {children}
        </DataContext.Provider>
    );
}

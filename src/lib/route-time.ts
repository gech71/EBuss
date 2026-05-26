import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const ROUTE_TIME_ZONE = "Africa/Addis_Ababa";

export function combineRouteDateTime(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}:00`, ROUTE_TIME_ZONE);
}

export function getRouteDateRange(date: string) {
  return {
    start: fromZonedTime(`${date}T00:00:00.000`, ROUTE_TIME_ZONE),
    end: fromZonedTime(`${date}T23:59:59.999`, ROUTE_TIME_ZONE),
  };
}

export function formatRouteDateTime(date: Date | string, pattern: string) {
  return formatInTimeZone(date, ROUTE_TIME_ZONE, pattern);
}

export function toRouteTimeZoneDate(date: Date | string) {
  return toZonedTime(date, ROUTE_TIME_ZONE);
}

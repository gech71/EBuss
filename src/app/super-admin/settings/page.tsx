
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SuperAdminSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Settings</CardTitle>
        <CardDescription>
          Manage global settings for the entire platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="maintenance-mode" className="text-base">
              Maintenance Mode
            </Label>
            <p className="text-sm text-muted-foreground">
              Temporarily disable customer access to the booking site.
            </p>
          </div>
          <Switch id="maintenance-mode" />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="new-registrations" className="text-base">
              Allow New Owner Registrations
            </Label>
            <p className="text-sm text-muted-foreground">
              Enable or disable the ability for new bus owners to sign up.
            </p>
          </div>
          <Switch id="new-registrations" checked />
        </div>
      </CardContent>
    </Card>
  );
}

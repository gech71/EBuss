import React from 'react';
import { Bus } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2 text-primary">
      <Bus className="h-8 w-8" />
      <span className="text-2xl font-headline font-bold">NibTeraBuss</span>
    </div>
  );
}

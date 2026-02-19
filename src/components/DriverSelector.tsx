'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDriverSummary, useRecentDrivers } from '@/hooks';
import { formatIRating, formatSafetyRating } from '@/lib/iracing/types';

interface DriverSelectorProps {
  customerId: number | null;
  onCustomerIdChange: (id: number | null) => void;
}

export function DriverSelector({ customerId, onCustomerIdChange }: DriverSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { data: driverData, isLoading } = useDriverSummary(customerId);
  const { drivers: recentDrivers, addDriver, removeDriver, setDefaultDriver } = useRecentDrivers();

  // Update recent drivers when we successfully load a driver
  useEffect(() => {
    if (driverData && customerId) {
      // Find the highest iRating across all licenses
      const highestIRating = Math.max(...(driverData.licenses || []).map((l) => l.iRating || 0), 0);
      const roadLicense = driverData.licenses.find((l) => l.category === 'road' || l.category === 'sports_car');

      addDriver({
        custId: driverData.custId,
        displayName: driverData.displayName,
        iRating: highestIRating,
        safetyRating: roadLicense?.safetyRating || 0,
        licenseClass: roadLicense?.groupName || 'R',
        licenseLevel: roadLicense?.licenseLevel || 1,
        clubName: driverData.clubName,
      });
    }
  }, [driverData, customerId, addDriver]);

  const handleRemoveDriver = (custId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    removeDriver(custId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(inputValue, 10);
    if (!isNaN(id) && id > 0) {
      onCustomerIdChange(id);
      setDefaultDriver(id); // Persist to localStorage so it survives navigation
      setIsEditing(false);
      setInputValue('');
    }
  };

  const handleSelectRecent = (id: number) => {
    onCustomerIdChange(id);
    setDefaultDriver(id); // Persist to localStorage so it survives navigation
  };

  const handleSetDefault = () => {
    if (customerId) {
      setDefaultDriver(customerId);
    }
  };

  // Get license color based on class
  const getLicenseColor = (licenseClass: string) => {
    switch (licenseClass) {
      case 'A':
        return 'bg-blue-500';
      case 'B':
        return 'bg-green-500';
      case 'C':
        return 'bg-yellow-500';
      case 'D':
        return 'bg-orange-500';
      case 'R':
      default:
        return 'bg-red-500';
    }
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Customer ID..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-32"
          autoFocus
        />
        <Button type="submit" size="sm">
          Load
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
          Cancel
        </Button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {customerId && driverData ? (
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium">{driverData.displayName}</div>
            <div className="flex items-center justify-end gap-2 text-xs text-zinc-500">
              {driverData.licenses
                .filter((l) => l.category === 'road')
                .map((license) => (
                  <span key={license.categoryId} className="flex items-center gap-1">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${getLicenseColor(license.groupName)}`}
                    />
                    {license.groupName} {formatSafetyRating(license.safetyRating)}
                    <span className="ml-1">{formatIRating(license.iRating)} iR</span>
                  </span>
                ))}
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="text-sm text-zinc-500">Loading...</div>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {customerId ? 'Switch Driver' : 'Select Driver'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Driver Selection</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            Enter Customer ID...
          </DropdownMenuItem>

          {recentDrivers.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-zinc-500">
                Recent Drivers
              </DropdownMenuLabel>
              {recentDrivers.slice(0, 5).map((driver) => (
                <DropdownMenuItem
                  key={driver.custId}
                  onClick={() => handleSelectRecent(driver.custId)}
                  className="flex items-center justify-between group"
                >
                  <span className="truncate">{driver.displayName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">
                      {formatIRating(driver.iRating)} iR
                    </span>
                    <button
                      onClick={(e) => handleRemoveDriver(driver.custId, e)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity"
                      title="Remove from recent"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}

          {customerId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSetDefault}>
                Set as Default Driver
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

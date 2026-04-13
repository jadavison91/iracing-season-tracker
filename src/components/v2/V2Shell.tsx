'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRecentDrivers, useDriverSummary } from '@/hooks';
import { MOCK_CUSTOMER_ID, USE_MOCK_DATA } from '@/lib/mock-data';
import { formatIRating } from '@/lib/iracing/types';
import { useDriverData } from '@/contexts/DriverDataContext';
import { getSettings, saveSettings, LookbackWeeks } from '@/lib/settings';

interface V2ShellProps {
  children: (customerId: number | null) => ReactNode;
}

// ── Icons ─────────────────────────────────────────────────

function HQIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor">
      <path
        d="M2 6L8 2l6 4v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6z"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <path d="M6 13V9h4v4" strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  );
}

function RacesIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor">
      <circle cx="8" cy="8" r="6" strokeWidth={1.4} />
      <path d="M8 5v3.5l2 1.5" strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}

function RivalsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor">
      <circle cx="5.5" cy="4.5" r="2" strokeWidth={1.4} />
      <circle cx="10.5" cy="4.5" r="2" strokeWidth={1.4} />
      <path d="M2 13c0-2 1.6-3.5 3.5-3.5" strokeWidth={1.4} strokeLinecap="round" />
      <path d="M14 13c0-2-1.6-3.5-3.5-3.5" strokeWidth={1.4} strokeLinecap="round" />
      <path
        d="M8 10v3M6.5 11.5L8 10l1.5 1.5"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

// ── Driver section in rail ────────────────────────────────

function RailDriverSection({
  customerId,
  onSwitch,
}: {
  customerId: number | null;
  onSwitch: () => void;
}) {
  const { data: driver } = useDriverSummary(customerId);

  if (!driver) {
    return (
      <button
        onClick={onSwitch}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          background: 'var(--v2-accent-glow)',
          border: '1px solid rgba(197,241,49,0.2)',
          color: 'var(--v2-accent)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          letterSpacing: '0.05em',
          textAlign: 'center',
          fontFamily: 'inherit',
        }}
      >
        SELECT DRIVER
      </button>
    );
  }

  const roadLicense = driver.licenses.find(
    (l) => l.category === 'road' || l.category === 'sports_car'
  );
  const topIR = Math.max(...driver.licenses.map((l) => l.iRating), 0);

  return (
    <button
      onClick={onSwitch}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 8,
        background: 'var(--v2-surface-2)',
        border: '1px solid var(--v2-border)',
        color: 'var(--v2-text)',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'border-color 0.12s',
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--v2-border-hi)')
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--v2-border)')
      }
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3, lineHeight: 1.2 }}>
        {driver.displayName}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {roadLicense && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: 3,
              background: roadLicense.color + '33',
              color: roadLicense.color,
              letterSpacing: '0.05em',
            }}
          >
            {roadLicense.groupName}
          </span>
        )}
        <span
          style={{
            fontSize: 11,
            color: 'var(--v2-text-muted)',
            fontFamily: 'var(--font-v2-mono, monospace)',
          }}
        >
          {formatIRating(topIR)} iR
        </span>
      </div>
    </button>
  );
}

// ── Driver switch overlay ─────────────────────────────────

function DriverSwitchOverlay({
  onSelect,
  onClose,
}: {
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState('');
  const { drivers, removeDriver } = useRecentDrivers();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(input, 10);
    if (!isNaN(id) && id > 0) {
      onSelect(id);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(9,9,14,0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--v2-surface)',
          border: '1px solid var(--v2-border-hi)',
          borderRadius: 14,
          padding: 24,
          width: '100%',
          maxWidth: 360,
          fontFamily: 'var(--font-v2-sans, system-ui)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: 'var(--v2-text-muted)',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          Select Driver
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            autoFocus
            type="text"
            placeholder="Customer ID..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              flex: 1,
              background: 'var(--v2-surface-2)',
              border: '1px solid var(--v2-border-hi)',
              borderRadius: 8,
              padding: '9px 12px',
              color: 'var(--v2-text)',
              fontSize: 13,
              fontFamily: 'var(--font-v2-mono, monospace)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '9px 16px',
              background: 'var(--v2-accent)',
              color: '#09090e',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.05em',
              fontFamily: 'inherit',
            }}
          >
            LOAD
          </button>
        </form>

        {drivers.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: 'var(--v2-text-dim)',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Recent
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {drivers.slice(0, 5).map((d) => (
                <div key={d.custId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => {
                      onSelect(d.custId);
                      onClose();
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 7,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--v2-text)',
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background =
                        'var(--v2-surface-2)')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')
                    }
                  >
                    <span>{d.displayName}</span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--v2-text-muted)',
                        fontFamily: 'var(--font-v2-mono, monospace)',
                      }}
                    >
                      {formatIRating(d.iRating)} iR
                    </span>
                  </button>
                  <button
                    onClick={() => removeDriver(d.custId)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--v2-text-dim)',
                      padding: 4,
                      display: 'flex',
                    }}
                    title="Remove"
                  >
                    <svg
                      width={12}
                      height={12}
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path d="M2 2l8 8M10 2L2 10" strokeWidth={1.5} strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Settings popover ──────────────────────────────────────

function RailSettingsButton() {
  const [open, setOpen] = useState(false);
  const [lookback, setLookback] = useState<LookbackWeeks>(() => getSettings().lookbackWeeks);
  const { forceRefresh } = useDriverData();

  const options: { value: LookbackWeeks; label: string }[] = [
    { value: 12, label: '1 season' },
    { value: 24, label: '2 seasons' },
    { value: 36, label: '3 seasons' },
  ];

  function handleChange(v: LookbackWeeks) {
    setLookback(v);
    saveSettings({ lookbackWeeks: v });
    setOpen(false);
    forceRefresh();
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Settings"
        style={{
          width: 30,
          height: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          background: 'none',
          border: 'none',
          color: 'var(--v2-text-muted)',
          cursor: 'pointer',
          transition: 'color 0.12s',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = 'var(--v2-text)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = 'var(--v2-text-muted)')
        }
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute',
              bottom: 36,
              left: 0,
              zIndex: 50,
              background: 'var(--v2-surface-2)',
              border: '1px solid var(--v2-border-hi)',
              borderRadius: 10,
              padding: 12,
              minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--v2-text-muted)',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Lookback
            </div>
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleChange(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 6,
                  background: lookback === opt.value ? 'var(--v2-accent-glow)' : 'none',
                  border: 'none',
                  color: lookback === opt.value ? 'var(--v2-accent)' : 'var(--v2-text-muted)',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                }}
              >
                {opt.label}
                {lookback === opt.value && (
                  <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor">
                    <path
                      d="M2 6l3 3 5-5"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Bottom nav tab (mobile) ───────────────────────────────

function BottomTab({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '8px 20px',
        fontSize: 9,
        fontWeight: active ? 700 : 500,
        color: active ? 'var(--v2-accent)' : 'var(--v2-text-muted)',
        textDecoration: 'none',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        transition: 'color 0.12s',
      }}
    >
      {icon}
      {label}
    </Link>
  );
}

// ── Refresh control ───────────────────────────────────────

function RailRefreshButton({ customerId }: { customerId: number | null }) {
  const { data, forceRefresh } = useDriverData();
  const { isLoading, lastFetched } = data;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!customerId) return null;

  const age = lastFetched ? now - lastFetched : null;
  const stale = age !== null && age > 2 * 60 * 60 * 1000;

  const formatAge = (ms: number) => {
    const m = Math.floor(ms / 60_000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h`;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {lastFetched && (
        <span style={{ fontSize: 10, color: stale ? 'var(--v2-warning)' : 'var(--v2-text-dim)' }}>
          {stale ? '⚠ ' : ''}
          {formatAge(age!)}
        </span>
      )}
      <button
        onClick={() => forceRefresh()}
        disabled={isLoading}
        title="Refresh"
        style={{
          width: 30,
          height: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          background: 'none',
          border: 'none',
          color: 'var(--v2-text-muted)',
          cursor: isLoading ? 'default' : 'pointer',
          opacity: isLoading ? 0.4 : 1,
          transition: 'color 0.12s',
        }}
        onMouseEnter={(e) => {
          if (!isLoading) (e.currentTarget as HTMLButtonElement).style.color = 'var(--v2-text)';
        }}
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = 'var(--v2-text-muted)')
        }
      >
        <RefreshIcon spinning={isLoading} />
      </button>
    </div>
  );
}

// ── Main shell ────────────────────────────────────────────

export function V2Shell({ children }: V2ShellProps) {
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [switchOpen, setSwitchOpen] = useState(false);
  const { getDefaultCustId, isLoaded, setDefaultDriver } = useRecentDrivers();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoaded) return;
    const defaultId = getDefaultCustId();
    if (defaultId) setCustomerId(defaultId);
    else if (USE_MOCK_DATA) setCustomerId(MOCK_CUSTOMER_ID);
  }, [isLoaded, getDefaultCustId]);

  function handleSelectDriver(id: number) {
    setCustomerId(id);
    setDefaultDriver(id);
  }

  const navItems = [
    { href: '/v2', label: 'Season HQ', icon: <HQIcon /> },
    { href: '/v2/races', label: 'Races', icon: <RacesIcon /> },
    { href: '/v2/rivals', label: 'Rivals', icon: <RivalsIcon /> },
  ];

  return (
    <>
      {/* CSS for spin animation (can't put keyframes in inline style) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--v2-bg)' }}>
        {/* ── Left rail (desktop only) ── */}
        <aside
          className="hidden lg:flex"
          style={{
            width: 220,
            flexShrink: 0,
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            background: 'var(--v2-surface)',
            borderRight: '1px solid var(--v2-border)',
            flexDirection: 'column',
            zIndex: 40,
          }}
        >
          {/* Logo */}
          <div
            style={{
              padding: '22px 20px 18px',
              borderBottom: '1px solid var(--v2-border)',
            }}
          >
            <Link href="/v2" style={{ textDecoration: 'none' }}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  color: 'var(--v2-accent)',
                  textTransform: 'uppercase',
                }}
              >
                PITWALL
              </span>
            </Link>
            <div
              style={{
                fontSize: 10,
                color: 'var(--v2-text-dim)',
                marginTop: 2,
                letterSpacing: '0.05em',
              }}
            >
              iRacing Analytics
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`v2-nav-link${pathname === item.href ? ' active' : ''}`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}

            {/* Old site link */}
            <div
              style={{
                margin: '20px 0 8px',
                borderTop: '1px solid var(--v2-border)',
                paddingTop: 12,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--v2-text-dim)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                  paddingLeft: 12,
                }}
              >
                Classic
              </div>
              <Link href="/" className="v2-nav-link" style={{ fontSize: 12, opacity: 0.7 }}>
                <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor">
                  <path
                    d="M2 7h10M7 2l5 5-5 5"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back to v1
              </Link>
            </div>
          </nav>

          {/* Bottom: driver + controls */}
          <div
            style={{
              padding: '12px 12px 16px',
              borderTop: '1px solid var(--v2-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <RailDriverSection customerId={customerId} onSwitch={() => setSwitchOpen(true)} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <RailRefreshButton customerId={customerId} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <RailSettingsButton />
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main
          className="lg:ml-[220px]"
          style={{
            flex: 1,
            minHeight: '100vh',
            paddingBottom: 72, // room for mobile bottom bar
          }}
        >
          <style>{`.lg\\:ml-\\[220px\\] { } @media (min-width: 1024px) { .lg\\:ml-\\[220px\\] { margin-left: 220px; } .lg\\:pb-0 { padding-bottom: 0; } }`}</style>
          {children(customerId)}
        </main>

        {/* ── Bottom tab bar (mobile only) ── */}
        <nav
          className="lg:hidden"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 64,
            background: 'var(--v2-surface)',
            borderTop: '1px solid var(--v2-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            zIndex: 50,
          }}
        >
          {navItems.map((item) => (
            <BottomTab
              key={item.href}
              href={item.href}
              label={item.label.replace(' HQ', '')}
              icon={item.icon}
              active={pathname === item.href}
            />
          ))}
          <button
            onClick={() => setSwitchOpen(true)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '8px 20px',
              fontSize: 9,
              fontWeight: 500,
              color: 'var(--v2-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontFamily: 'inherit',
            }}
          >
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor">
              <circle cx="8" cy="5.5" r="2.5" strokeWidth={1.4} />
              <path
                d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5"
                strokeWidth={1.4}
                strokeLinecap="round"
              />
            </svg>
            Driver
          </button>
        </nav>
      </div>

      {/* Driver switch overlay */}
      {switchOpen && (
        <DriverSwitchOverlay onSelect={handleSelectDriver} onClose={() => setSwitchOpen(false)} />
      )}
    </>
  );
}

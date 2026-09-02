import React, { useEffect } from 'react';
import {
  Globe,
  LayoutGrid,
  MapPin,
  Gauge,
  BarChart3,
  TrendingUp,
  Flame,
  FileText,
  Sliders,
  X,
} from 'lucide-react';
import { ActiveTab, LocationData } from '../types';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  currentLocation?: LocationData;
  isDemo?: boolean;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Globe },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'score', label: 'Environmental Score', icon: Gauge },
  { id: 'indicators', label: 'Indicators', icon: BarChart3 },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'hotspots', label: 'Hotspots', icon: Flame },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Sliders },
];

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
}) => {
  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-72 sm:w-80 bg-[#0A1B27] border-r border-white/10 h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
        
        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-[#06131D] border border-[#00E5A0]/40 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#00E5A0]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12h4l3 7 4-14 3 7h4" />
                </svg>
              </div>
              <span className="font-heading font-bold text-base tracking-tight text-[#F1F7F5]">
                EarthPulse
              </span>
            </div>

            <button
              id="drawer-close-btn"
              onClick={onClose}
              className="p-1 text-[#8FA6AE] hover:text-[#F1F7F5] transition-colors rounded-lg hover:bg-white/5"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links with generous vertical spacing */}
          <nav className="p-4 space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`drawer-nav-${item.id}`}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-[#00E5A0]/10 text-[#00E5A0] font-semibold border-l-2 border-[#00E5A0]'
                      : 'text-[#8FA6AE] hover:text-[#F1F7F5] hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#00E5A0]' : 'text-[#8FA6AE]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Minimal Footer */}
        <div className="px-6 py-4 border-t border-white/10 text-xs text-[#8FA6AE] font-mono flex items-center justify-between">
          <span>EarthPulse v2.4</span>
          <span className="text-[#00E5A0] text-[10px] uppercase tracking-wider font-semibold">Active</span>
        </div>

      </div>
    </div>
  );
};

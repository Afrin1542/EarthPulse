import React from 'react';
import { Menu } from 'lucide-react';
import { ActiveTab, LocationData } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenDrawer: () => void;
  onOpenSettings?: () => void;
  isDemo?: boolean;
  currentLocation?: LocationData;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onTabChange,
  onOpenDrawer,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#030B13]/95 backdrop-blur-md border-b border-white/[0.06]">
      <div className="max-w-xl sm:max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        
        {/* Left: Navigation Drawer Trigger & Brand */}
        <div className="flex items-center gap-3">
          <button
            id="nav-drawer-toggle-btn"
            onClick={onOpenDrawer}
            className="p-2 -ml-2 rounded-lg text-[#8FA4AF] hover:text-[#F2F7F7] hover:bg-[#071725] transition-colors focus:outline-none focus:ring-1 focus:ring-[#00D6A3]/40"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            id="nav-logo-btn"
            onClick={() => onTabChange('home')}
            className="flex items-center gap-2.5 group text-left focus:outline-none"
          >
            <div className="w-6 h-6 rounded-md bg-[#071725] border border-[#00D6A3]/40 flex items-center justify-center relative group-hover:border-[#00D6A3] transition-colors">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#00D6A3]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h4l3 7 4-14 3 7h4" />
              </svg>
            </div>
            <span className="font-heading font-bold text-base tracking-tight text-[#F2F7F7] group-hover:text-[#00D6A3] transition-colors">
              EarthPulse
            </span>
          </button>
        </div>

      </div>
    </header>
  );
};

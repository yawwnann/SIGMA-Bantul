"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextType {
  collapsed: boolean;
  toggleSidebar: () => void;
  mobileOpen: boolean;
  toggleMobile: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  toggleSidebar: () => {},
  mobileOpen: false,
  toggleMobile: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Optional: load from localstorage
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebar_collapsed", String(newState));
    // Trigger resize mainly for Leaflet Map sizing
    setTimeout(() => window.dispatchEvent(new Event("resize")), 300);
  };
  
  const toggleMobile = () => setMobileOpen(!mobileOpen);

  return (
    <SidebarContext.Provider value={{ collapsed, toggleSidebar, mobileOpen, toggleMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}

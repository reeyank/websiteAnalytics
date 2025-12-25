"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MousePointer2,
  Activity,
  FlaskConical,
  Sparkles,
  Menu,
  X,
  Globe,
  ChevronDown,
  LogOut,
  Settings,
} from "lucide-react";
import { useAuth } from "./AuthProvider";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/sessions", icon: Users, label: "Sessions" },
  { href: "/heatmaps", icon: MousePointer2, label: "Heatmaps" },
  { href: "/events", icon: Activity, label: "Live Events" },
  { href: "/websites", icon: Globe, label: "Websites" },
  { href: "/test", icon: FlaskConical, label: "Test Tracking" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, websites, currentWebsite, setCurrentWebsite, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showSiteSelector, setShowSiteSelector] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSiteSelector(false);
      setShowUserMenu(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 h-16 glass border-b border-[var(--border)] z-50 lg:hidden">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white">Analytics</h1>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-white"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 glass border-r border-[var(--border)] z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="p-6 pt-20 lg:pt-6 flex flex-col h-full">
          {/* Logo - Hidden on mobile (shown in header) */}
          <div className="hidden lg:flex items-center gap-3 mb-6">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center animate-pulse-glow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Analytics</h1>
              <p className="text-xs text-gray-500">Dashboard</p>
            </div>
          </div>

          {/* Website Selector */}
          {websites.length > 0 && (
            <div className="relative mb-6">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSiteSelector(!showSiteSelector);
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Globe className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <div className="min-w-0 text-left">
                    <p className="text-white text-sm font-medium truncate">
                      {currentWebsite?.name || "Select website"}
                    </p>
                    <p className="text-gray-500 text-xs truncate">
                      {currentWebsite?.domain || "No site selected"}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showSiteSelector ? "rotate-180" : ""}`} />
              </button>

              {showSiteSelector && (
                <div className="absolute top-full left-0 right-0 mt-2 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-xl z-50">
                  {websites.map((site) => (
                    <button
                      key={site.site_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentWebsite(site);
                        setShowSiteSelector(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--background)] transition-colors ${
                        currentWebsite?.site_id === site.site_id ? "bg-purple-500/10" : ""
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${currentWebsite?.site_id === site.site_id ? "bg-purple-400" : "bg-gray-600"}`} />
                      <div className="min-w-0 text-left">
                        <p className="text-white text-sm truncate">{site.name}</p>
                        <p className="text-gray-500 text-xs truncate">{site.domain}</p>
                      </div>
                    </button>
                  ))}
                  <div className="border-t border-[var(--border)] mt-2 pt-2">
                    <Link
                      href="/websites"
                      onClick={() => setShowSiteSelector(false)}
                      className="flex items-center gap-2 px-4 py-2 text-purple-400 hover:bg-[var(--background)] transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-sm">Manage Websites</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="space-y-2 flex-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-[var(--accent)] text-white glow-sm"
                      : "text-gray-400 hover:text-white hover:bg-[var(--card-hover)]"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? "" : "group-hover:scale-110"
                    }`}
                  />
                  <span className="font-medium">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          {user && (
            <div className="mt-auto pt-4 border-t border-[var(--border)]">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(!showUserMenu);
                    setShowSiteSelector(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--card)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name || user.email}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <span className="text-purple-400 text-sm font-medium">
                        {(user.name || user.email)[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 text-left flex-1">
                    <p className="text-white text-sm font-medium truncate">
                      {user.name || "User"}
                    </p>
                    <p className="text-gray-500 text-xs truncate">{user.email}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
                </button>

                {showUserMenu && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-xl z-50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-[var(--background)] transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

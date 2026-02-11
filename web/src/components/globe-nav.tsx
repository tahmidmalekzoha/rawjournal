"use client";

import { Home, BarChart3, BookOpen, HelpCircle } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";

const navItems = [
  { name: "Home", url: "#", icon: Home },
  { name: "Features", url: "#features", icon: BarChart3 },
  { name: "Journal", url: "#journal", icon: BookOpen },
  { name: "FAQ", url: "#faq", icon: HelpCircle },
];

export function GlobeNav() {
  return <NavBar items={navItems} />;
}

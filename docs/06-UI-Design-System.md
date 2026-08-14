# 06 — Nexora UI Design System

## Overview
Nexora's visual design system provides a modern, clean, light-themed desktop interface optimized for enterprise HR users.

---

## 1. Color System

### Base Surface & Backgrounds
- **Application Background**: `#f8fafc` (`slate-50`)
- **Card & Table Containers**: `#ffffff` (`white`)
- **Subtle Surface & Table Headers**: `#f1f5f9` (`slate-100`)
- **Borders & Separators**: `#e2e8f0` (`slate-200`)

### Typography Colors
- **Primary Text / Headings**: `#0f172a` (`slate-900`)
- **Secondary Body Text**: `#475569` (`slate-600`)
- **Subtle / Metadata Text**: `#94a3b8` (`slate-400`)

### Brand & Status Accents
- **Primary Brand / Action**: `#0284c7` / `#0369a1` (`sky-600` / `sky-700`)
- **Success / Confirmed**: `#10b981` (`emerald-500` / `emerald-50`)
- **Warning / Needs Review**: `#f59e0b` (`amber-500` / `amber-50`)
- **Error / Destructive**: `#ef4444` (`rose-600` / `rose-50`)

---

## 2. Typography Hierarchy
- **System Font**: `Inter`, `-apple-system`, `Segoe UI`, `sans-serif`
- **Page Titles**: `20px` / `1.25rem` (`text-xl font-bold text-slate-900`)
- **Section Headers**: `14px` / `0.875rem` (`text-sm font-semibold text-slate-800`)
- **Body Text**: `14px` / `0.875rem` (`text-sm text-slate-700`)
- **Metadata & Badges**: `12px` / `0.75rem` (`text-xs font-medium`)

---

## 3. Navigation Structure
- **Dashboard**: High-level overview, 4 key metrics, and distribution step pipeline.
- **Employees**: Employee list, search bar, and Excel import call to action.
- **Salary Slips**: Folder scanning interface, PDF file status list.
- **Review**: Human confirmation queue for matched salary slips.
- **Send**: Channel selection (Email, WhatsApp, Dual) and dispatch summary.
- **History**: Historical send audit logs with status filters.
- **Settings**: Categorized tabbed configuration interface.

---

## 4. Reusable UI Component Guidelines
- **Button**: `primary` (solid sky-600), `outline` (border slate-300), `ghost` (subtle hover), `danger` (rose-600).
- **Table**: Comfortably spaced rows, hover states, status pill badges, and total record footers.
- **Empty States**: Never show plain "No data". Include descriptive copy and a clear action button.
- **Inputs**: Clean light mode inputs with optional password mask toggle (`Eye` / `EyeOff`).

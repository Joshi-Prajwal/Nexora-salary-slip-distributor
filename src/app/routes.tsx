import React from 'react';
import { useAppStore } from '../stores/appStore';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { EmployeesPage } from '../pages/Employees/EmployeesPage';
import { SalarySlipsPage } from '../pages/SalarySlips/SalarySlipsPage';
import { MatchingPage } from '../pages/Matching/MatchingPage';
import { SendingPage } from '../pages/Sending/SendingPage';
import { HistoryPage } from '../pages/History/HistoryPage';
import { SettingsPage } from '../pages/Settings/SettingsPage';

export const AppRoutes: React.FC = () => {
  const { activePage } = useAppStore();

  switch (activePage) {
    case 'dashboard':
      return <DashboardPage />;
    case 'employees':
      return <EmployeesPage />;
    case 'salary-slips':
      return <SalarySlipsPage />;
    case 'review':
      return <MatchingPage />;
    case 'send':
      return <SendingPage />;
    case 'history':
      return <HistoryPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
};

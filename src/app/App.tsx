import React from 'react';
import { AppProvider } from './providers/AppProvider';
import { MainLayout } from '../components/layout/MainLayout';
import { AppRoutes } from './routes';

export const App: React.FC = () => {
  return (
    <AppProvider>
      <MainLayout>
        <AppRoutes />
      </MainLayout>
    </AppProvider>
  );
};

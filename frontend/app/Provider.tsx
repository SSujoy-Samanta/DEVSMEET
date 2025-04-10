'use client';
import { ReactNode } from 'react';
import { RecoilRoot } from 'recoil';
import { SocketProvider } from '@/contexts/SocketContext';


export const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <SocketProvider>
      <RecoilRoot>{children}</RecoilRoot>
    </SocketProvider>
  );
};

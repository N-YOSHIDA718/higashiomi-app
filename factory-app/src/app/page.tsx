'use client';
import { useState } from 'react';
import DrawingsPage from '@/components/DrawingsPage';
import MaterialsPage from '@/components/MaterialsPage';
import ProcessPage from '@/components/ProcessPage';
import MistakesPage from '@/components/MistakesPage';
import QRScanPage from '@/components/QRScanPage';

const TABS = [
  { id: 'drawings',  label: '📋 図番・原価' },
  { id: 'materials', label: '📦 材料在庫' },
  { id: 'process',   label: '⚙️ 工程管理' },
  { id: 'mistakes',  label: '⚠️ ミス記録' },
  { id: 'qr',        label: '📷 QRスキャン' },
];

export default function Home() {
  const [tab, setTab] = useState('drawings');
  return (
    <>
      <nav>
        <div className="logo">工場管理</div>
        {TABS.map(t => (
          <a key={t.id} href="#" className={tab === t.id ? 'active' : ''}
             onClick={e => { e.preventDefault(); setTab(t.id); }}>
            {t.label}
          </a>
        ))}
      </nav>
      <main>
        {tab === 'drawings'  && <DrawingsPage />}
        {tab === 'materials' && <MaterialsPage />}
        {tab === 'process'   && <ProcessPage />}
        {tab === 'mistakes'  && <MistakesPage />}
        {tab === 'qr'        && <QRScanPage />}
      </main>
    </>
  );
}

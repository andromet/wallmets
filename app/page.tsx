'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

// 1. Definisikan tipe data struktur transaksi
interface Transaction {
  id: string;
  date: string;
  type: string;
  category: string;
  amount: number;
  description: string;
}

export default function Home() {
  // 2. Beri tahu TypeScript bahwa transaksi berbentuk Array dari Transaction
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [netTotal, setNetTotal] = useState<number>(0);

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    // Mengambil data dari tabel Supabase
    const { data, error } = await supabase.from('transactions').select('*');
    
    if (error) {
      console.log("Error:", error);
    } else if (data) {
      // Pastikan data tidak null sebelum diproses
      const typedData = data as Transaction[];
      setTransactions(typedData);
      
      // Hitung Net Total
      const total = typedData.reduce((acc: number, curr: Transaction) => {
        if (curr.type === 'Income') return acc + Number(curr.amount);
        return acc - Number(curr.amount);
      }, 0);
      
      setNetTotal(total);
    }
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Web Personalize Money Tracker</h1>
      
      <div style={{ padding: '1rem', background: '#f0f0f0', borderRadius: '8px', marginBottom: '1rem' }}>
        <h2>Net Total: Rp {netTotal.toLocaleString('id-ID')}</h2>
      </div>

      <h3>Riwayat Transaksi</h3>
      <ul>
        {transactions.map((t) => (
          <li key={t.id}>
            {t.date} | {t.category} ({t.type}): Rp {Number(t.amount).toLocaleString('id-ID')} - {t.description}
          </li>
        ))}
      </ul>
      <p>*(Form input Create, Edit, Delete akan ditambahkan di tahap selanjutnya)*</p>
    </main>
  );
}
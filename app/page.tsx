'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

interface Transaction {
  id: string;
  date: string;
  type: 'Income' | 'Expense' | 'Savings';
  category: 'Income' | 'Food' | 'Shopping' | 'Other' | 'Savings';
  amount: number;
  description: string;
}

const CATEGORIES = ['Income', 'Food', 'Shopping', 'Other', 'Savings'] as const;

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'Income' | 'Expense' | 'Savings'>('Expense');
  const [category, setCategory] = useState<'Income' | 'Food' | 'Shopping' | 'Other' | 'Savings'>('Food');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  // 1. Ambil data transaksi dari Supabase (Read)
  async function fetchTransactions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching data:', error);
    } else if (data) {
      setTransactions(data as Transaction[]);
    }
    setLoading(false);
  }

  // 2. Tambah transaksi baru (Create)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return alert('Masukkan jumlah nominal yang valid');

    const newTransaction = {
      date,
      type,
      category: type === 'Income' ? 'Income' : category,
      amount: Number(amount),
      description,
    };

    const { error } = await supabase.from('transactions').insert([newTransaction]);

    if (error) {
      alert('Gagal menambah transaksi: ' + error.message);
    } else {
      // Reset form
      setAmount('');
      setDescription('');
      fetchTransactions(); // Refresh data
    }
  }

  // 3. Hapus transaksi (Delete)
  async function handleDelete(id: string) {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return;

    const { error } = await supabase.from('transactions').delete().eq('id', id);

    if (error) {
      alert('Gagal menghapus: ' + error.message);
    } else {
      fetchTransactions(); // Refresh data
    }
  }

  // Logika Kalkulasi Ringkasan (Seperti Excel)
  const getCategoryTotal = (catName: string) => {
    return transactions
      .filter((t) => t.category === catName)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const totalIncome = getCategoryTotal('Income');
  const totalExpenses = transactions
    .filter((t) => t.type === 'Expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalSavings = getCategoryTotal('Savings');
  const netTotal = totalIncome - totalExpenses - totalSavings;

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Wallmets — Money Tracker</h1>

      {/* Ringkasan Keseluruhan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1rem', background: '#e6fffa', borderRadius: '8px' }}>
          <small>Total Income</small>
          <h3>Rp {totalIncome.toLocaleString('id-ID')}</h3>
        </div>
        <div style={{ padding: '1rem', background: '#ffeef0', borderRadius: '8px' }}>
          <small>Total Expenses</small>
          <h3>Rp {totalExpenses.toLocaleString('id-ID')}</h3>
        </div>
        <div style={{ padding: '1rem', background: '#ebf8ff', borderRadius: '8px' }}>
          <small>Total Savings</small>
          <h3>Rp {totalSavings.toLocaleString('id-ID')}</h3>
        </div>
        <div style={{ padding: '1rem', background: netTotal >= 0 ? '#f0fff4' : '#fff5f5', borderRadius: '8px', border: '1px solid #ccc' }}>
          <small>Net Total</small>
          <h2>Rp {netTotal.toLocaleString('id-ID')}</h2>
        </div>
      </div>

      {/* Ringkasan Per Kategori (Tabel Sederhana ala Excel) */}
      <section style={{ marginBottom: '2rem', padding: '1rem', background: '#f9f9f9', borderRadius: '8px' }}>
        <h3>Ringkasan Per Kategori</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '8px' }}>Kategori</th>
              <th style={{ padding: '8px' }}>Actual (Terpakai)</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat) => (
              <tr key={cat} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>{cat}</td>
                <td style={{ padding: '8px' }}>Rp {getCategoryTotal(cat).toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Form Tambah Transaksi Baru */}
      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>+ Tambah Transaksi Baru</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <label>
              Tanggal:
              <br />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ padding: '0.5rem' }} />
            </label>

            <label>
              Tipe:
              <br />
              <select
                value={type}
                onChange={(e) => {
                  const val = e.target.value as 'Income' | 'Expense' | 'Savings';
                  setType(val);
                  if (val === 'Income') setCategory('Income');
                  else if (val === 'Savings') setCategory('Savings');
                  else setCategory('Food');
                }}
                style={{ padding: '0.5rem' }}
              >
                <option value="Expense">Expense (Pengeluaran)</option>
                <option value="Income">Income (Pemasukan)</option>
                <option value="Savings">Savings (Tabungan)</option>
              </select>
            </label>

            {type === 'Expense' && (
              <label>
                Kategori Pengeluaran:
                <br />
                <select value={category} onChange={(e) => setCategory(e.target.value as any)} style={{ padding: '0.5rem' }}>
                  <option value="Food">Food</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            )}

            <label>
              Nominal (Rp):
              <br />
              <input
                type="number"
                placeholder="Contoh: 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{ padding: '0.5rem' }}
              />
            </label>
          </div>

          <label>
            Deskripsi / Catatan:
            <br />
            <input
              type="text"
              placeholder="Contoh: Beli Makan Siang"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem' }}
            />
          </label>

          <button type="submit" style={{ padding: '0.7rem', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Simpan Transaksi
          </button>
        </form>
      </section>

      {/* Daftar Riwayat Transaksi */}
      <section>
        <h3>Riwayat Transaksi</h3>
        {loading ? (
          <p>Memuat data...</p>
        ) : transactions.length === 0 ? (
          <p style={{ color: '#666' }}>Belum ada transaksi. Silakan tambah transaksi di atas.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {transactions.map((t) => (
              <li
                key={t.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.8rem',
                  borderBottom: '1px solid #eee',
                }}
              >
                <div>
                  <strong>{t.category}</strong> <small>({t.type})</small> — <span style={{ color: '#555' }}>{t.date}</span>
                  <br />
                  <small style={{ color: '#777' }}>{t.description || 'Tanpa deskripsi'}</small>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontWeight: 'bold', color: t.type === 'Income' ? 'green' : t.type === 'Savings' ? 'blue' : 'red' }}>
                    {t.type === 'Income' ? '+' : '-'} Rp {Number(t.amount).toLocaleString('id-ID')}
                  </span>
                  <button
                    onClick={() => handleDelete(t.id)}
                    style={{ background: '#ff4d4f', color: 'white', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
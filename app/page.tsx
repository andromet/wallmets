'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';

// Tipe Data
interface Transaction {
  id: string;
  date: string;
  type: 'Income' | 'Expense' | 'Savings';
  category: 'Income' | 'Food' | 'Shopping' | 'Other' | 'Savings';
  amount: number;
  description: string;
}

interface Goal {
  id: string;
  month: number;
  year: number;
  category: string;
  goal_amount: number;
}

const CATEGORIES = ['Income', 'Food', 'Shopping', 'Other', 'Savings'] as const;

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);

  // State untuk Filter Bulan & Tahun (Default: Bulan Ini)
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  // State Form Transaksi
  const [date, setDate] = useState(today.toISOString().split('T')[0]);
  const [type, setType] = useState<'Income' | 'Expense' | 'Savings'>('Expense');
  const [category, setCategory] = useState<'Income' | 'Food' | 'Shopping' | 'Other' | 'Savings'>('Food');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // State Form Goal
  const [goalCategory, setGoalCategory] = useState<string>('Food');
  const [goalAmount, setGoalAmount] = useState('');

  // Fungsi untuk mengambil data (dibungkus useCallback agar bisa dipanggil di dalam useEffect dengan aman)
  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Menentukan tanggal 1 dan tanggal terakhir dari bulan yang dipilih
    const strMonth = String(selectedMonth).padStart(2, '0');
    const startDate = `${selectedYear}-${strMonth}-01`;
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const endDate = `${selectedYear}-${strMonth}-${lastDay}`;

    // Ambil Transaksi yang tanggalnya berada di bulan & tahun terpilih
    const { data: trxData } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', startDate) // Lebih besar dari atau sama dengan tanggal awal
      .lte('date', endDate)   // Lebih kecil dari atau sama dengan tanggal akhir
      .order('date', { ascending: false });
      
    if (trxData) setTransactions(trxData as Transaction[]);

    // Ambil Target/Goal untuk bulan & tahun terpilih
    const { data: goalData } = await supabase
      .from('monthly_goals')
      .select('*')
      .eq('month', selectedMonth)
      .eq('year', selectedYear);
      
    if (goalData) setGoals(goalData as Goal[]);

    setLoading(false);
  }, [selectedMonth, selectedYear]);

  // Efek ini akan berjalan setiap kali Bulan atau Tahun pada filter diubah
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Submit Transaksi
  async function handleTransactionSubmit(e: React.FormEvent) {
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
    if (error) alert('Gagal menambah transaksi: ' + error.message);
    else {
      setAmount('');
      setDescription('');
      fetchData();
    }
  }

  // Handle Delete Transaksi
  async function handleDelete(id: string) {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) alert('Gagal menghapus: ' + error.message);
    else fetchData();
  }

  // Handle Submit Goal (Untuk Bulan Terpilih)
  async function handleGoalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goalAmount || Number(goalAmount) <= 0) return alert('Masukkan nominal target yang valid');

    const existingGoal = goals.find((g) => g.category === goalCategory);

    if (existingGoal) {
      const { error } = await supabase
        .from('monthly_goals')
        .update({ goal_amount: Number(goalAmount) })
        .eq('id', existingGoal.id);
      if (error) alert('Gagal update target: ' + error.message);
    } else {
      const { error } = await supabase.from('monthly_goals').insert([{
        month: selectedMonth, // Menggunakan bulan dari filter
        year: selectedYear,   // Menggunakan tahun dari filter
        category: goalCategory,
        goal_amount: Number(goalAmount),
      }]);
      if (error) alert('Gagal tambah target: ' + error.message);
    }

    setGoalAmount('');
    fetchData();
  }

  // Logika Kalkulasi Ringkasan
  const getCategoryActual = (catName: string) => {
    return transactions.filter((t) => t.category === catName).reduce((sum, t) => sum + Number(t.amount), 0);
  };
  const getCategoryGoal = (catName: string) => {
    const goal = goals.find((g) => g.category === catName);
    return goal ? Number(goal.goal_amount) : 0;
  };

  const totalIncome = getCategoryActual('Income');
  const totalExpenses = transactions.filter((t) => t.type === 'Expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalSavings = getCategoryActual('Savings');
  const netTotal = totalIncome - totalExpenses - totalSavings;

  // Render Nama Bulan untuk Dropdown
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const yearOptions = [2024, 2025, 2026, 2027];

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Wallmets — Money Tracker</h1>

      {/* FILTER BULAN DAN TAHUN */}
      <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: '8px', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <strong>Filter Data:</strong>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} style={{ padding: '0.5rem' }}>
          {monthNames.map((m, index) => (
            <option key={index + 1} value={index + 1}>{m}</option>
          ))}
        </select>
        <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} style={{ padding: '0.5rem' }}>
          {yearOptions.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

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

      {/* Ringkasan Per Kategori */}
      <section style={{ marginBottom: '2rem', padding: '1rem', background: '#f9f9f9', borderRadius: '8px' }}>
        <h3>Ringkasan Kategori ({monthNames[selectedMonth - 1]} {selectedYear})</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '8px' }}>Kategori</th>
              <th style={{ padding: '8px' }}>Actual</th>
              <th style={{ padding: '8px' }}>Goal</th>
              <th style={{ padding: '8px' }}>% Terpakai</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat) => {
              const actual = getCategoryActual(cat);
              const goal = getCategoryGoal(cat);
              const percentage = goal > 0 ? ((actual / goal) * 100).toFixed(1) : 0;
              const isOverBudget = cat !== 'Income' && cat !== 'Savings' && Number(percentage) > 100;

              return (
                <tr key={cat} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{cat}</td>
                  <td style={{ padding: '8px' }}>Rp {actual.toLocaleString('id-ID')}</td>
                  <td style={{ padding: '8px', color: '#666' }}>Rp {goal.toLocaleString('id-ID')}</td>
                  <td style={{ padding: '8px', color: isOverBudget ? 'red' : 'inherit', fontWeight: isOverBudget ? 'bold' : 'normal' }}>
                    {goal > 0 ? `${percentage}%` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        {/* Form Tambah Target */}
        <section style={{ padding: '1rem', border: '1px solid #b2f5ea', borderRadius: '8px', background: '#f0fff4' }}>
          <h3>🎯 Set Target (Bulan {monthNames[selectedMonth - 1]})</h3>
          <form onSubmit={handleGoalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label>Kategori:<br/>
              <select value={goalCategory} onChange={(e) => setGoalCategory(e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </label>
            <label>Nominal Target (Rp):<br/>
              <input type="number" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} placeholder="Contoh: 1500000" style={{ width: '100%', padding: '0.5rem' }} />
            </label>
            <button type="submit" style={{ padding: '0.7rem', backgroundColor: '#319795', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Simpan Target
            </button>
          </form>
        </section>

        {/* Form Tambah Transaksi */}
        <section style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>+ Tambah Transaksi</h3>
          <form onSubmit={handleTransactionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label>Tanggal:<br/><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ width: '100%', padding: '0.5rem' }} /></label>
            <label>Tipe:<br/>
              <select value={type} onChange={(e) => {
                const val = e.target.value as 'Income' | 'Expense' | 'Savings';
                setType(val);
                if (val === 'Income') setCategory('Income');
                else if (val === 'Savings') setCategory('Savings');
                else setCategory('Food');
              }} style={{ width: '100%', padding: '0.5rem' }}>
                <option value="Expense">Expense</option>
                <option value="Income">Income</option>
                <option value="Savings">Savings</option>
              </select>
            </label>
            {type === 'Expense' && (
              <label>Kategori:<br/>
                <select value={category} onChange={(e) => setCategory(e.target.value as any)} style={{ width: '100%', padding: '0.5rem' }}>
                  <option value="Food">Food</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            )}
            <label>Nominal (Rp):<br/><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required style={{ width: '100%', padding: '0.5rem' }} /></label>
            <label>Deskripsi:<br/><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} /></label>
            <button type="submit" style={{ padding: '0.7rem', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Simpan Transaksi</button>
          </form>
        </section>
      </div>

      {/* Daftar Riwayat Transaksi */}
      <section>
        <h3>Riwayat Transaksi ({monthNames[selectedMonth - 1]} {selectedYear})</h3>
        {loading ? <p>Memuat data...</p> : transactions.length === 0 ? <p style={{ color: '#666' }}>Tidak ada transaksi di bulan ini.</p> : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {transactions.map((t) => (
              <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', borderBottom: '1px solid #eee' }}>
                <div>
                  <strong>{t.category}</strong> <small>({t.type})</small> — <span style={{ color: '#555' }}>{t.date}</span><br />
                  <small style={{ color: '#777' }}>{t.description || 'Tanpa deskripsi'}</small>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontWeight: 'bold', color: t.type === 'Income' ? 'green' : t.type === 'Savings' ? 'blue' : 'red' }}>
                    {t.type === 'Income' ? '+' : '-'} Rp {Number(t.amount).toLocaleString('id-ID')}
                  </span>
                  <button onClick={() => handleDelete(t.id)} style={{ background: '#ff4d4f', color: 'white', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer' }}>Hapus</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
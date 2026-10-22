'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

// 1. Tambahan tipe data untuk Goal
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

  // Ambil Bulan & Tahun saat ini (Bulan 1 - 12)
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // State Form Transaksi
  const [date, setDate] = useState(today.toISOString().split('T')[0]);
  const [type, setType] = useState<'Income' | 'Expense' | 'Savings'>('Expense');
  const [category, setCategory] = useState<'Income' | 'Food' | 'Shopping' | 'Other' | 'Savings'>('Food');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // State Form Goal
  const [goalCategory, setGoalCategory] = useState<string>('Food');
  const [goalAmount, setGoalAmount] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Modifikasi fetch data untuk mengambil Transaksi & Goal sekaligus
  async function fetchData() {
    setLoading(true);
    
    // Ambil Transaksi
    const { data: trxData } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    if (trxData) setTransactions(trxData as Transaction[]);

    // Ambil Target/Goal untuk bulan ini
    const { data: goalData } = await supabase
      .from('monthly_goals')
      .select('*')
      .eq('month', currentMonth)
      .eq('year', currentYear);
    if (goalData) setGoals(goalData as Goal[]);

    setLoading(false);
  }

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

  // 3. Handle Submit Goal (Insert baru atau Update jika sudah ada)
  async function handleGoalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goalAmount || Number(goalAmount) <= 0) return alert('Masukkan nominal target yang valid');

    const existingGoal = goals.find((g) => g.category === goalCategory);

    if (existingGoal) {
      // Update goal yang sudah ada
      const { error } = await supabase
        .from('monthly_goals')
        .update({ goal_amount: Number(goalAmount) })
        .eq('id', existingGoal.id);
      if (error) alert('Gagal update target: ' + error.message);
    } else {
      // Buat goal baru
      const { error } = await supabase.from('monthly_goals').insert([{
        month: currentMonth,
        year: currentYear,
        category: goalCategory,
        goal_amount: Number(goalAmount),
      }]);
      if (error) alert('Gagal tambah target: ' + error.message);
    }

    setGoalAmount('');
    fetchData();
  }

  // Logika Kalkulasi Ringkasan (Menyatukan Actual & Goal)
  const getCategoryActual = (catName: string) => {
    return transactions
      .filter((t) => t.category === catName)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const getCategoryGoal = (catName: string) => {
    const goal = goals.find((g) => g.category === catName);
    return goal ? Number(goal.goal_amount) : 0;
  };

  const totalIncome = getCategoryActual('Income');
  const totalExpenses = transactions.filter((t) => t.type === 'Expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalSavings = getCategoryActual('Savings');
  const netTotal = totalIncome - totalExpenses - totalSavings;

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
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
        <h3>Ringkasan Kategori (Bulan {currentMonth}/{currentYear})</h3>
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
              
              // Memberi warna peringatan jika pengeluaran melebihi 100% dari goal
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
        {/* Form Tambah Target (Goal) */}
        <section style={{ padding: '1rem', border: '1px solid #b2f5ea', borderRadius: '8px', background: '#f0fff4' }}>
          <h3>🎯 Set Target (Goal) Bulan Ini</h3>
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
        <h3>Riwayat Transaksi</h3>
        {loading ? <p>Memuat data...</p> : (
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
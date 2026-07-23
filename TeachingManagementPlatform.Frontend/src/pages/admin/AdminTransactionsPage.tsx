import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import Pagination, { usePagination } from '../../components/common/Pagination';

interface Transaction {
  id: number;
  orderCode: number;
  userName: string;
  userEmail: string;
  amount: number;
  coinAmount: number;
  status: string;
  subscriptionPackageId: number | null;
  paidAt: string | null;
  createdAt: string;
}

type FilterType = 'day' | 'month' | 'quarter' | 'year';

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [filterType, setFilterType] = useState<FilterType>('day');
  const [filterDay, setFilterDay] = useState(new Date().getDate());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterQuarter, setFilterQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { paginatedItems, currentPage, pageSize, totalItems, setCurrentPage, setPageSize } = usePagination(transactions);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { filterType, year: filterYear };
      if (filterType === 'day') {
        params.month = filterMonth;
        params.day = filterDay;
      } else if (filterType === 'month') {
        params.month = filterMonth;
      } else if (filterType === 'quarter') {
        params.quarter = filterQuarter;
      }
      if (search.trim()) params.search = search.trim();

      const res = await api.get<Transaction[]>('/admin/transactions', { params });
      setTransactions(res.data);
    } catch {
      setError('Không thể tải danh sách giao dịch.');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterDay, filterMonth, filterQuarter, filterYear, search]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  function formatCurrency(amount: number) {
    return amount.toLocaleString('vi-VN') + ' VND';
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function getStatusLabel(status: string) {
    switch (status.toLowerCase()) {
      case 'paid': return <span style={{ color: '#16a34a', fontWeight: 600 }}>Thành công</span>;
      case 'pending': return <span style={{ color: '#d97706', fontWeight: 600 }}>Chờ xử lý</span>;
      case 'failed': return <span style={{ color: '#dc2626', fontWeight: 600 }}>Thất bại</span>;
      default: return <span>{status}</span>;
    }
  }

  function getTypeLabel(t: Transaction) {
    if (t.subscriptionPackageId) return 'Gói đăng ký';
    return 'Mua ECoin';
  }

  const daysInMonth = new Date(filterYear, filterMonth, 0).getDate();

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>Giao dịch</h1>

      {error && <div role="alert" style={{ color: '#d32f2f', marginBottom: 16 }}>{error}</div>}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 20 }}>
        {/* Filter type */}
        <label style={filterLabelStyle}>
          <span style={filterLabelText}>Lọc theo</span>
          <select value={filterType} onChange={e => setFilterType(e.target.value as FilterType)} style={selectStyle}>
            <option value="day">Ngày</option>
            <option value="month">Tháng</option>
            <option value="quarter">Quý</option>
            <option value="year">Năm</option>
          </select>
        </label>

        {/* Day picker */}
        {filterType === 'day' && (
          <label style={filterLabelStyle}>
            <span style={filterLabelText}>Ngày</span>
            <select value={filterDay} onChange={e => setFilterDay(Number(e.target.value))} style={selectStyle}>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
        )}

        {/* Month picker */}
        {(filterType === 'day' || filterType === 'month') && (
          <label style={filterLabelStyle}>
            <span style={filterLabelText}>Tháng</span>
            <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} style={selectStyle}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
          </label>
        )}

        {/* Quarter picker */}
        {filterType === 'quarter' && (
          <label style={filterLabelStyle}>
            <span style={filterLabelText}>Quý</span>
            <select value={filterQuarter} onChange={e => setFilterQuarter(Number(e.target.value))} style={selectStyle}>
              <option value={1}>Quý 1</option>
              <option value={2}>Quý 2</option>
              <option value={3}>Quý 3</option>
              <option value={4}>Quý 4</option>
            </select>
          </label>
        )}

        {/* Year picker */}
        <label style={filterLabelStyle}>
          <span style={filterLabelText}>Năm</span>
          <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} style={selectStyle}>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <label style={filterLabelStyle}>
            <span style={filterLabelText}>Tìm kiếm</span>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Tên hoặc email..."
              style={{ ...selectStyle, minWidth: 180 }}
            />
          </label>
          <button type="submit" className="btn btn-add" style={{ height: 36 }}>Tìm</button>
          {search && (
            <button type="button" className="btn btn-neutral" style={{ height: 36 }} onClick={() => { setSearch(''); setSearchInput(''); }}>Xóa lọc</button>
          )}
        </form>
      </div>

      {/* Summary */}
      <div style={{ marginBottom: 16, fontSize: 14, color: '#64748b' }}>
        Tổng: <strong>{transactions.length}</strong> giao dịch
        {' · '}
        Tổng tiền: <strong>{formatCurrency(transactions.reduce((sum, t) => sum + (t.status === 'paid' ? t.amount : 0), 0))}</strong>
      </div>

      {/* Table */}
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Mã đơn</th>
              <th style={thStyle}>Người dùng</th>
              <th style={thStyle}>Loại</th>
              <th style={thStyle}>Số tiền</th>
              <th style={thStyle}>ECoin</th>
              <th style={thStyle}>Trạng thái</th>
              <th style={thStyle}>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 16 }}>Không có giao dịch nào</td>
              </tr>
            ) : (
              paginatedItems.map(t => (
                <tr key={t.id}>
                  <td style={tdStyle}>{t.orderCode}</td>
                  <td style={tdStyle}>
                    <div>{t.userName}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{t.userEmail}</div>
                  </td>
                  <td style={tdStyle}>{getTypeLabel(t)}</td>
                  <td style={tdStyle}>{formatCurrency(t.amount)}</td>
                  <td style={tdStyle}>{t.coinAmount > 0 ? `+${t.coinAmount}` : '—'}</td>
                  <td style={tdStyle}>{getStatusLabel(t.status)}</td>
                  <td style={tdStyle}>{formatDate(t.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      <Pagination
        totalItems={totalItems}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #ccc', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #eee' };
const filterLabelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const filterLabelText: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#64748b' };
const selectStyle: React.CSSProperties = { padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', height: 36, boxSizing: 'border-box' };

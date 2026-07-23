import { useCallback, useEffect, useState } from 'react';
import {
  Box, Tabs, Tab, Typography, Paper, CircularProgress, Alert,
  TextField, MenuItem, Button, LinearProgress,
} from '@mui/material';
import {
  Users, Star, TrendingUp, HardDrive,
  FileText, Puzzle, BookOpen, School,
  Package, Coins, BarChart3,
} from 'lucide-react';
import api from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeneralStats {
  totalUsers: number;
  totalStorageBytes: number;
  totalSubscriptionPackages: number;
  totalCoinPackages: number;
  totalScoreTemplates: number;
  totalQuizGames: number;
  totalCrosswordGames: number;
  totalLessonPlans: number;
  totalClasses: number;
  totalIncomeAllTime: number;
  activeSubscribers: number;
}

interface DetailStats {
  startDate: string;
  endDate: string;
  newUsers: number;
  totalTransactions: number;
  totalIncome: number;
  subscriptionBreakdown: Array<{ packageId: number; price: number; count: number }>;
  ecoinBreakdown: Array<{ packageId: number; coinAmount: number; price: number; count: number }>;
}

interface ChartDataPoint { date: string; value: number }
interface ChartData {
  unit: string;
  startDate: string;
  endDate: string;
  income: ChartDataPoint[];
  transactions: ChartDataPoint[];
  newUsers: ChartDataPoint[];
}

type FilterType = 'day' | 'month' | 'quarter' | 'year';
type ChartType = 'line' | 'bar';
type ChartGroupBy = 'day' | 'week' | 'month' | 'quarter';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatCurrency(amount: number) {
  return amount.toLocaleString('vi-VN') + ' VND';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>Bảng quản lí</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Thông tin chung" />
        <Tab label="Thông tin chi tiết" />
        <Tab label="Biểu đồ" />
      </Tabs>
      {tab === 0 && <GeneralTab />}
      {tab === 1 && <DetailTab />}
      {tab === 2 && <ChartTab />}
    </Box>
  );
}

// ── Tab 1: Thông tin chung ────────────────────────────────────────────────────

function GeneralTab() {
  const [stats, setStats] = useState<GeneralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<GeneralStats>('/admin/dashboard/general');
        setStats(res.data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (!stats) return <Alert severity="error">Không thể tải dữ liệu</Alert>;

  const primaryCards = [
    { label: 'Tổng số người dùng', value: stats.totalUsers.toLocaleString('vi-VN'), icon: Users, color: '#2563eb' },
    { label: 'Người đang đăng ký Pro', value: stats.activeSubscribers.toLocaleString('vi-VN'), icon: Star, color: '#9333ea' },
    { label: 'Tổng doanh thu', value: formatCurrency(stats.totalIncomeAllTime), icon: TrendingUp, color: '#16a34a' },
    { label: 'Tổng dung lượng kho tài liệu', value: formatBytes(stats.totalStorageBytes), icon: HardDrive, color: '#ea580c' },
  ];

  const secondaryCards = [
    { label: 'Quiz đã tạo', value: stats.totalQuizGames.toLocaleString('vi-VN'), icon: FileText },
    { label: 'Crossword đã tạo', value: stats.totalCrosswordGames.toLocaleString('vi-VN'), icon: Puzzle },
    { label: 'Giáo án', value: stats.totalLessonPlans.toLocaleString('vi-VN'), icon: BookOpen },
    { label: 'Lớp học', value: stats.totalClasses.toLocaleString('vi-VN'), icon: School },
    { label: 'Gói đăng ký', value: stats.totalSubscriptionPackages, icon: Package },
    { label: 'Gói ECoin', value: stats.totalCoinPackages, icon: Coins },
    { label: 'Template Điểm', value: stats.totalScoreTemplates, icon: BarChart3 },
  ];

  return (
    <Box sx={{ mt: 2 }}>
      {/* Primary stats — full width, larger */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3 }}>
        {primaryCards.map((c, i) => {
          const IconComp = c.icon;
          return (
            <Paper key={i} elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', background: `linear-gradient(135deg, ${c.color}08, ${c.color}03)` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 2, bgcolor: `${c.color}14` }}>
                  <IconComp size={22} color={c.color} strokeWidth={2} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{c.label}</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: c.color }}>{c.value}</Typography>
            </Paper>
          );
        })}
      </Box>

      {/* Secondary stats — smaller cards, full width grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(7, 1fr)' }, gap: 2 }}>
        {secondaryCards.map((c, i) => {
          const IconComp = c.icon;
          return (
            <Paper key={i} elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                <IconComp size={20} color="#64748b" strokeWidth={1.8} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{c.value}</Typography>
              <Typography variant="caption" color="text.secondary">{c.label}</Typography>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}

// ── Tab 2: Thông tin chi tiết ─────────────────────────────────────────────────

function DetailTab() {
  const now = new Date();
  const [filterType, setFilterType] = useState<FilterType>('day');
  const [day, setDay] = useState(now.getDate());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [year, setYear] = useState(now.getFullYear());

  const [data, setData] = useState<DetailStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Comparison
  const [comparing, setComparing] = useState(false);
  const [cmpDay, setCmpDay] = useState(now.getDate());
  const [cmpMonth, setCmpMonth] = useState(now.getMonth() + 1);
  const [cmpQuarter, setCmpQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [cmpYear, setCmpYear] = useState(now.getFullYear() - 1);
  const [cmpData, setCmpData] = useState<DetailStats | null>(null);
  const [cmpLoading, setCmpLoading] = useState(false);

  const buildParams = useCallback((ft: FilterType, d: number, m: number, q: number, y: number) => {
    const params: Record<string, string | number> = { filterType: ft, year: y };
    if (ft === 'day') { params.month = m; params.day = d; }
    else if (ft === 'month') { params.month = m; }
    else if (ft === 'quarter') { params.quarter = q; }
    return params;
  }, []);

  const loadMain = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<DetailStats>('/admin/dashboard/detail', { params: buildParams(filterType, day, month, quarter, year) });
      setData(res.data);
    } catch {}
    setLoading(false);
  }, [filterType, day, month, quarter, year, buildParams]);

  useEffect(() => { loadMain(); }, [loadMain]);

  async function loadComparison() {
    setCmpLoading(true);
    try {
      const res = await api.get<DetailStats>('/admin/dashboard/detail', { params: buildParams(filterType, cmpDay, cmpMonth, cmpQuarter, cmpYear) });
      setCmpData(res.data);
    } catch {}
    setCmpLoading(false);
  }

  function toggleCompare() {
    if (comparing) {
      setComparing(false);
      setCmpData(null);
    } else {
      setComparing(true);
      void loadComparison();
    }
  }

  const daysInMonth = new Date(year, month, 0).getDate();

  function DiffIndicator({ current, compare }: { current: number; compare: number }) {
    const diff = current - compare;
    if (diff === 0) return <span style={{ color: '#64748b', marginLeft: 8 }}>= 0</span>;
    if (diff > 0) return <span style={{ color: '#16a34a', marginLeft: 8 }}>▲ +{diff.toLocaleString('vi-VN')}</span>;
    return <span style={{ color: '#dc2626', marginLeft: 8 }}>▼ {diff.toLocaleString('vi-VN')}</span>;
  }

  function StatRow({ label, value, cmpValue }: { label: string; value: number; cmpValue?: number }) {
    return (
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{value.toLocaleString('vi-VN')}</Typography>
          {cmpValue !== undefined && <DiffIndicator current={value} compare={cmpValue} />}
        </Box>
      </Paper>
    );
  }

  return (
    <Box sx={{ mt: 1 }}>
      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <TextField select size="small" label="Lọc theo" value={filterType} onChange={e => setFilterType(e.target.value as FilterType)} sx={{ minWidth: 110 }}>
          <MenuItem value="day">Ngày</MenuItem>
          <MenuItem value="month">Tháng</MenuItem>
          <MenuItem value="quarter">Quý</MenuItem>
          <MenuItem value="year">Năm</MenuItem>
        </TextField>
        {filterType === 'day' && (
          <TextField select size="small" label="Ngày" value={day} onChange={e => setDay(Number(e.target.value))} sx={{ minWidth: 80 }}>
            {Array.from({ length: daysInMonth }, (_, i) => <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>)}
          </TextField>
        )}
        {(filterType === 'day' || filterType === 'month') && (
          <TextField select size="small" label="Tháng" value={month} onChange={e => setMonth(Number(e.target.value))} sx={{ minWidth: 100 }}>
            {Array.from({ length: 12 }, (_, i) => <MenuItem key={i + 1} value={i + 1}>Tháng {i + 1}</MenuItem>)}
          </TextField>
        )}
        {filterType === 'quarter' && (
          <TextField select size="small" label="Quý" value={quarter} onChange={e => setQuarter(Number(e.target.value))} sx={{ minWidth: 90 }}>
            {[1, 2, 3, 4].map(q => <MenuItem key={q} value={q}>Quý {q}</MenuItem>)}
          </TextField>
        )}
        <TextField select size="small" label="Năm" value={year} onChange={e => setYear(Number(e.target.value))} sx={{ minWidth: 90 }}>
          {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>

        <Button variant="outlined" size="small" onClick={toggleCompare}>
          {comparing ? 'Hủy so sánh' : 'So sánh'}
        </Button>
      </Box>

      {/* Comparison filter row */}
      {comparing && (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mr: 1 }}>So sánh với:</Typography>
          {filterType === 'day' && (
            <TextField select size="small" label="Ngày" value={cmpDay} onChange={e => setCmpDay(Number(e.target.value))} sx={{ minWidth: 80 }}>
              {Array.from({ length: 31 }, (_, i) => <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>)}
            </TextField>
          )}
          {(filterType === 'day' || filterType === 'month') && (
            <TextField select size="small" label="Tháng" value={cmpMonth} onChange={e => setCmpMonth(Number(e.target.value))} sx={{ minWidth: 100 }}>
              {Array.from({ length: 12 }, (_, i) => <MenuItem key={i + 1} value={i + 1}>Tháng {i + 1}</MenuItem>)}
            </TextField>
          )}
          {filterType === 'quarter' && (
            <TextField select size="small" label="Quý" value={cmpQuarter} onChange={e => setCmpQuarter(Number(e.target.value))} sx={{ minWidth: 90 }}>
              {[1, 2, 3, 4].map(q => <MenuItem key={q} value={q}>Quý {q}</MenuItem>)}
            </TextField>
          )}
          <TextField select size="small" label="Năm" value={cmpYear} onChange={e => setCmpYear(Number(e.target.value))} sx={{ minWidth: 90 }}>
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>
          <Button variant="contained" size="small" onClick={() => void loadComparison()}>Áp dụng</Button>
        </Box>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Content */}
      {data && (
        <Box sx={{ display: 'grid', gridTemplateColumns: comparing && cmpData ? '1fr 1fr' : '1fr', gap: 3 }}>
          {/* Main box */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Dữ liệu chính</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <StatRow label="Người dùng mới" value={data.newUsers} cmpValue={comparing && cmpData ? cmpData.newUsers : undefined} />
              <StatRow label="Số giao dịch" value={data.totalTransactions} cmpValue={comparing && cmpData ? cmpData.totalTransactions : undefined} />
            </Box>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
              <Typography variant="caption" color="text.secondary">Tổng doanh thu</Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{formatCurrency(data.totalIncome)}</Typography>
                {comparing && cmpData && (
                  <span style={{ color: data.totalIncome >= cmpData.totalIncome ? '#16a34a' : '#dc2626', fontSize: 13 }}>
                    {data.totalIncome >= cmpData.totalIncome ? '▲' : '▼'} {formatCurrency(Math.abs(data.totalIncome - cmpData.totalIncome))}
                  </span>
                )}
              </Box>
            </Paper>
            {data.subscriptionBreakdown.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Gói đăng ký đã bán</Typography>
                {data.subscriptionBreakdown.map((s, i) => (
                  <Typography key={i} variant="body2" sx={{ ml: 1 }}>
                    Gói #{s.packageId} ({formatCurrency(s.price)}): <strong>{s.count}</strong> lượt
                  </Typography>
                ))}
              </Box>
            )}
            {data.ecoinBreakdown.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Gói ECoin đã bán</Typography>
                {data.ecoinBreakdown.map((e, i) => (
                  <Typography key={i} variant="body2" sx={{ ml: 1 }}>
                    Gói #{e.packageId} ({e.coinAmount} ECoin / {formatCurrency(e.price)}): <strong>{e.count}</strong> lượt
                  </Typography>
                ))}
              </Box>
            )}
          </Paper>

          {/* Comparison box */}
          {comparing && cmpData && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Dữ liệu so sánh</Typography>
              {cmpLoading ? <CircularProgress size={24} /> : (
                <>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                    <StatRow label="Người dùng mới" value={cmpData.newUsers} />
                    <StatRow label="Số giao dịch" value={cmpData.totalTransactions} />
                  </Box>
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Tổng doanh thu</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>{formatCurrency(cmpData.totalIncome)}</Typography>
                  </Paper>
                  {cmpData.subscriptionBreakdown.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Gói đăng ký đã bán</Typography>
                      {cmpData.subscriptionBreakdown.map((s, i) => (
                        <Typography key={i} variant="body2" sx={{ ml: 1 }}>
                          Gói #{s.packageId} ({formatCurrency(s.price)}): <strong>{s.count}</strong> lượt
                        </Typography>
                      ))}
                    </Box>
                  )}
                  {cmpData.ecoinBreakdown.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Gói ECoin đã bán</Typography>
                      {cmpData.ecoinBreakdown.map((e, i) => (
                        <Typography key={i} variant="body2" sx={{ ml: 1 }}>
                          Gói #{e.packageId} ({e.coinAmount} ECoin / {formatCurrency(e.price)}): <strong>{e.count}</strong> lượt
                        </Typography>
                      ))}
                    </Box>
                  )}
                </>
              )}
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
}

// ── Tab 3: Biểu đồ ───────────────────────────────────────────────────────────

function ChartTab() {
  const now = new Date();
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(now.toISOString().slice(0, 10));
  const [groupBy, setGroupBy] = useState<ChartGroupBy>('day');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadChart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ChartData>('/admin/dashboard/chart', { params: { from: fromDate, to: toDate, groupBy } });
      setData(res.data);
    } catch {}
    setLoading(false);
  }, [fromDate, toDate, groupBy]);

  useEffect(() => { loadChart(); }, [loadChart]);

  // Determine max interval for groupBy options
  const daysDiff = Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Box sx={{ mt: 1 }}>
      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 3 }}>
        <TextField size="small" type="date" label="Từ ngày" value={fromDate} onChange={e => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="Đến ngày" value={toDate} onChange={e => setToDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField select size="small" label="Nhóm theo" value={groupBy} onChange={e => setGroupBy(e.target.value as ChartGroupBy)} sx={{ minWidth: 110 }}>
          <MenuItem value="day">Ngày</MenuItem>
          {daysDiff >= 7 && <MenuItem value="week">Tuần</MenuItem>}
          {daysDiff >= 28 && <MenuItem value="month">Tháng</MenuItem>}
          {daysDiff >= 90 && <MenuItem value="quarter">Quý</MenuItem>}
        </TextField>
        <TextField select size="small" label="Loại biểu đồ" value={chartType} onChange={e => setChartType(e.target.value as ChartType)} sx={{ minWidth: 120 }}>
          <MenuItem value="line">Đường (Line)</MenuItem>
          <MenuItem value="bar">Cột (Column)</MenuItem>
        </TextField>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {data && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <SimpleChart title="Doanh thu (VND)" points={data.income} type={chartType} color="#2563eb" />
          <SimpleChart title="Số giao dịch" points={data.transactions} type={chartType} color="#16a34a" />
          <SimpleChart title="Người dùng mới" points={data.newUsers} type={chartType} color="#9333ea" />
        </Box>
      )}
    </Box>
  );
}

// ── Simple SVG Chart ──────────────────────────────────────────────────────────

function SimpleChart({ title, points, type, color }: { title: string; points: ChartDataPoint[]; type: ChartType; color: string }) {
  if (points.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">Không có dữ liệu</Typography>
      </Paper>
    );
  }

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const maxVal = Math.max(...sorted.map(p => p.value), 1);
  const width = 960;
  const height = 220;
  const padding = 50;
  const chartW = width - padding * 2;
  const chartH = height - padding;

  const xStep = sorted.length > 1 ? chartW / (sorted.length - 1) : chartW;
  const barWidth = Math.max(8, Math.min(40, chartW / sorted.length - 4));

  const getX = (i: number) => padding + (sorted.length > 1 ? i * xStep : chartW / 2);
  const getY = (v: number) => height - padding - (v / maxVal) * chartH;

  const linePath = sorted.map((p, i) => `${i === 0 ? 'M' : 'L'}${getX(i)},${getY(p.value)}`).join(' ');

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, overflow: 'auto' }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{title}</Typography>
      <svg viewBox={`0 0 ${width} ${height + 30}`} style={{ width: '100%', height: 'auto' }}>
        {/* Y axis labels */}
        <text x={padding - 4} y={height - padding} fontSize="10" textAnchor="end" fill="#94a3b8">0</text>
        <text x={padding - 4} y={padding / 2} fontSize="10" textAnchor="end" fill="#94a3b8">{maxVal.toLocaleString('vi-VN')}</text>
        {/* Grid line */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" />

        {type === 'line' ? (
          <>
            <path d={linePath} fill="none" stroke={color} strokeWidth="2" />
            {sorted.map((p, i) => (
              <circle key={i} cx={getX(i)} cy={getY(p.value)} r="3" fill={color}>
                <title>{p.date}: {p.value.toLocaleString('vi-VN')}</title>
              </circle>
            ))}
          </>
        ) : (
          sorted.map((p, i) => (
            <rect
              key={i}
              x={getX(i) - barWidth / 2}
              y={getY(p.value)}
              width={barWidth}
              height={height - padding - getY(p.value)}
              fill={color}
              opacity={0.8}
              rx={2}
            >
              <title>{p.date}: {p.value.toLocaleString('vi-VN')}</title>
            </rect>
          ))
        )}

        {/* X axis labels (show max ~10) */}
        {sorted.filter((_, i) => sorted.length <= 10 || i % Math.ceil(sorted.length / 10) === 0).map((p, i) => {
          const idx = sorted.indexOf(p);
          return (
            <text key={i} x={getX(idx)} y={height - padding + 16} fontSize="9" textAnchor="middle" fill="#64748b">
              {p.date.length > 7 ? p.date.slice(5) : p.date}
            </text>
          );
        })}
      </svg>
    </Paper>
  );
}

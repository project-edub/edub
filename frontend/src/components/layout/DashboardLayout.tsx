import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Role } from '../../types/auth';

const lecturerMenuItems = [
  { to: '/lecturer/overview', label: 'Thông tin cá nhân' },
  { to: '/lecturer/classes', label: 'Danh sách lớp' },
  { to: '/lecturer/lesson-plans', label: 'Giáo án' },
  { to: '/lecturer/storage', label: 'Kho tài liệu' },
];

const adminMenuItems = [
  { to: '/admin/accounts', label: 'Quản lý tài khoản' },
  { to: '/admin/subscriptions', label: 'Gói đăng ký' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const menuItems = role === Role.Admin ? adminMenuItems : lecturerMenuItems;

  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <nav
        aria-label="Menu chính"
        style={{
          width: 240,
          backgroundColor: '#1e293b',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 0',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '0 16px 24px', fontSize: 20, fontWeight: 700, borderBottom: '1px solid #334155' }}>
          EduB
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0', flex: 1 }}>
          {menuItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '10px 24px',
                  color: isActive ? '#fff' : '#94a3b8',
                  backgroundColor: isActive ? '#334155' : 'transparent',
                  textDecoration: 'none',
                  fontSize: 14,
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                })}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div style={{ padding: '16px', borderTop: '1px solid #334155' }}>
          <button
            onClick={handleLogout}
            className="btn btn-delete"
            style={{
              width: '100%',
              padding: '8px 16px',
            }}
          >
            Đăng xuất
          </button>
        </div>
      </nav>

      <main style={{ flex: 1, padding: 24, backgroundColor: '#f8fafc', overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}

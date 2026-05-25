import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StudentListTabs from './StudentListTabs';
import type { StudentList } from '../../types/studentList';

vi.mock('../../services/studentListService', () => ({
  getAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  setMain: vi.fn(),
  clone: vi.fn(),
  addColumn: vi.fn(),
  updateColumn: vi.fn(),
  deleteColumn: vi.fn(),
  addEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  importExcel: vi.fn(),
  exportExcel: vi.fn(),
}));

import * as studentListService from '../../services/studentListService';

const sampleList: StudentList = {
  id: 1,
  classId: 10,
  name: 'Danh sách 1',
  isMain: true,
  createdAt: '2024-01-01',
  columns: [
    { id: 100, studentListId: 1, name: 'Họ tên', sortOrder: 0 },
    { id: 101, studentListId: 1, name: 'Email', sortOrder: 1 },
  ],
  entries: [
    { id: 200, studentListId: 1, data: { 'Họ tên': 'Nguyễn Văn A', 'Email': 'a@test.com' }, sortOrder: 0 },
  ],
};

const sampleList2: StudentList = {
  id: 2,
  classId: 10,
  name: 'Danh sách 2',
  isMain: false,
  createdAt: '2024-01-02',
  columns: [],
  entries: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StudentListTabs', () => {
  it('shows loading state initially', () => {
    vi.mocked(studentListService.getAll).mockReturnValue(new Promise(() => {}));
    render(<StudentListTabs classId={10} />);
    expect(screen.getByText('Đang tải danh sách học sinh...')).toBeInTheDocument();
  });

  it('shows empty state when no lists exist', async () => {
    vi.mocked(studentListService.getAll).mockResolvedValue([]);
    render(<StudentListTabs classId={10} />);

    await waitFor(() => {
      expect(screen.getByText(/Chưa có danh sách học sinh nào/)).toBeInTheDocument();
    });
    expect(screen.getByText('+ Thêm danh sách')).toBeInTheDocument();
  });

  it('renders tabs for each student list', async () => {
    vi.mocked(studentListService.getAll).mockResolvedValue([sampleList, sampleList2]);
    render(<StudentListTabs classId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Danh sách 1')).toBeInTheDocument();
    });
    expect(screen.getByText('Danh sách 2')).toBeInTheDocument();
    // Main list indicator
    expect(screen.getByText('(Danh sách chính)')).toBeInTheDocument();
  });

  it('displays table with columns and entries for active list', async () => {
    vi.mocked(studentListService.getAll).mockResolvedValue([sampleList]);
    render(<StudentListTabs classId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Họ tên')).toBeInTheDocument();
    });
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('a@test.com')).toBeInTheDocument();
  });

  it('creates a new student list', async () => {
    const user = userEvent.setup();
    vi.mocked(studentListService.getAll).mockResolvedValue([]);
    vi.mocked(studentListService.create).mockResolvedValue({ ...sampleList2, id: 3, name: 'DS Mới' });
    render(<StudentListTabs classId={10} />);

    await waitFor(() => {
      expect(screen.getByText('+ Thêm danh sách')).toBeInTheDocument();
    });

    await user.click(screen.getByText('+ Thêm danh sách'));
    const input = screen.getByLabelText('Tên danh sách mới');
    await user.type(input, 'DS Mới');

    // After create, getAll will be called again
    vi.mocked(studentListService.getAll).mockResolvedValue([{ ...sampleList2, id: 3, name: 'DS Mới' }]);

    await user.click(screen.getAllByText('Lưu')[0]);

    await waitFor(() => {
      expect(studentListService.create).toHaveBeenCalledWith(10, { name: 'DS Mới' });
    });
  });

  it('shows set-main button for non-main list and calls setMain', async () => {
    const user = userEvent.setup();
    vi.mocked(studentListService.getAll).mockResolvedValue([sampleList2]);
    vi.mocked(studentListService.setMain).mockResolvedValue({ ...sampleList2, isMain: true });
    render(<StudentListTabs classId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Đặt làm danh sách chính')).toBeInTheDocument();
    });

    vi.mocked(studentListService.getAll).mockResolvedValue([{ ...sampleList2, isMain: true }]);
    await user.click(screen.getByText('Đặt làm danh sách chính'));

    await waitFor(() => {
      expect(studentListService.setMain).toHaveBeenCalledWith(2);
    });
  });

  it('clones a student list', async () => {
    const user = userEvent.setup();
    vi.mocked(studentListService.getAll).mockResolvedValue([sampleList]);
    vi.mocked(studentListService.clone).mockResolvedValue({ ...sampleList, id: 5, name: 'Danh sách 1 (bản sao)', isMain: false });
    render(<StudentListTabs classId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Nhân bản')).toBeInTheDocument();
    });

    vi.mocked(studentListService.getAll).mockResolvedValue([
      sampleList,
      { ...sampleList, id: 5, name: 'Danh sách 1 (bản sao)', isMain: false },
    ]);
    await user.click(screen.getByText('Nhân bản'));

    await waitFor(() => {
      expect(studentListService.clone).toHaveBeenCalledWith(1);
    });
  });

  it('deletes a student list', async () => {
    const user = userEvent.setup();
    vi.mocked(studentListService.getAll).mockResolvedValue([sampleList]);
    vi.mocked(studentListService.remove).mockResolvedValue(undefined);
    render(<StudentListTabs classId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Xóa danh sách')).toBeInTheDocument();
    });

    vi.mocked(studentListService.getAll).mockResolvedValue([]);
    await user.click(screen.getByText('Xóa danh sách'));

    await waitFor(() => {
      expect(studentListService.remove).toHaveBeenCalledWith(1);
    });
  });

  it('shows error from API', async () => {
    vi.mocked(studentListService.getAll).mockRejectedValue({
      response: { data: { error: { message: 'Lỗi server' } } },
    });
    render(<StudentListTabs classId={10} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Lỗi server');
    });
  });

  it('shows import and export buttons for active list', async () => {
    vi.mocked(studentListService.getAll).mockResolvedValue([sampleList]);
    render(<StudentListTabs classId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Nhập Excel')).toBeInTheDocument();
    });
    expect(screen.getByText('Xuất Excel')).toBeInTheDocument();
  });

  it('opens import modal when clicking Nhập Excel', async () => {
    const user = userEvent.setup();
    vi.mocked(studentListService.getAll).mockResolvedValue([sampleList]);
    render(<StudentListTabs classId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Nhập Excel')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Nhập Excel'));

    expect(screen.getByRole('dialog', { name: 'Nhập Excel' })).toBeInTheDocument();
    expect(screen.getByText('Chọn tệp Excel (.xlsx)')).toBeInTheDocument();
  });

  it('calls exportExcel when clicking Xuất Excel', async () => {
    const user = userEvent.setup();
    vi.mocked(studentListService.getAll).mockResolvedValue([sampleList]);
    vi.mocked(studentListService.exportExcel).mockResolvedValue(undefined);
    render(<StudentListTabs classId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Xuất Excel')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Xuất Excel'));

    await waitFor(() => {
      expect(studentListService.exportExcel).toHaveBeenCalledWith(1);
    });
  });

  it('closes import modal and refreshes list on successful import', async () => {
    const user = userEvent.setup();
    vi.mocked(studentListService.getAll).mockResolvedValue([sampleList]);
    vi.mocked(studentListService.importExcel).mockResolvedValue(sampleList);
    render(<StudentListTabs classId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Nhập Excel')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Nhập Excel'));
    expect(screen.getByRole('dialog', { name: 'Nhập Excel' })).toBeInTheDocument();

    // Simulate file selection
    const fileInput = screen.getByLabelText('Chọn tệp Excel (.xlsx)');
    const testFile = new File(['test'], 'students.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await user.upload(fileInput, testFile);

    // Click submit
    await user.click(screen.getByText('Nhập'));

    await waitFor(() => {
      expect(studentListService.importExcel).toHaveBeenCalledWith(1, testFile);
    });

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('displays header mismatch errors in import modal', async () => {
    const user = userEvent.setup();
    vi.mocked(studentListService.getAll).mockResolvedValue([sampleList]);
    vi.mocked(studentListService.importExcel).mockRejectedValue({
      response: {
        data: {
          mismatchedHeaders: ['Tên', 'Điểm'],
          error: { code: 'HEADER_MISMATCH', message: 'Tiêu đề cột không khớp' },
        },
      },
    });
    render(<StudentListTabs classId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Nhập Excel')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Nhập Excel'));

    const fileInput = screen.getByLabelText('Chọn tệp Excel (.xlsx)');
    const testFile = new File(['test'], 'students.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await user.upload(fileInput, testFile);
    await user.click(screen.getByText('Nhập'));

    await waitFor(() => {
      expect(screen.getByText('Các tiêu đề không khớp:')).toBeInTheDocument();
    });
    expect(screen.getByText('Tên')).toBeInTheDocument();
    expect(screen.getByText('Điểm')).toBeInTheDocument();
  });
});

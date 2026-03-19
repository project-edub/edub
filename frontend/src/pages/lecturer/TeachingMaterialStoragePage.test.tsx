import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TeachingMaterialStoragePage from './TeachingMaterialStoragePage';

vi.mock('../../services/storageService', () => ({
  listItems: vi.fn(),
  createFolder: vi.fn(),
  uploadFile: vi.fn(),
  renameItem: vi.fn(),
  deleteItem: vi.fn(),
}));

import * as storageService from '../../services/storageService';

const sampleFolder = {
  id: 1,
  lecturerId: 1,
  parentFolderId: null,
  name: 'Tài liệu Toán',
  itemType: 'Folder' as const,
  fileReference: null,
  fileType: null,
  fileSize: null,
  modifiedAt: '2024-06-15T10:00:00Z',
  createdAt: '2024-06-15T10:00:00Z',
};

const sampleFile = {
  id: 2,
  lecturerId: 1,
  parentFolderId: null,
  name: 'bai_tap.pdf',
  itemType: 'File' as const,
  fileReference: 'files/bai_tap.pdf',
  fileType: 'pdf',
  fileSize: 2048576,
  modifiedAt: '2024-07-20T14:30:00Z',
  createdAt: '2024-07-20T14:30:00Z',
};

const sampleItems = [sampleFolder, sampleFile];

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <TeachingMaterialStoragePage />
    </MemoryRouter>,
  );
}

describe('TeachingMaterialStoragePage', () => {
  it('renders table with Vietnamese column headers', async () => {
    vi.mocked(storageService.listItems).mockResolvedValue(sampleItems);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tên')).toBeInTheDocument();
      expect(screen.getByText('Ngày sửa đổi')).toBeInTheDocument();
      expect(screen.getByText('Kích cỡ tệp')).toBeInTheDocument();
    });
  });

  it('displays folders and files from API', async () => {
    vi.mocked(storageService.listItems).mockResolvedValue(sampleItems);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Tài liệu Toán/)).toBeInTheDocument();
      expect(screen.getByText(/bai_tap\.pdf/)).toBeInTheDocument();
    });
  });

  it('shows empty message when no items', async () => {
    vi.mocked(storageService.listItems).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Không có tệp hoặc thư mục nào')).toBeInTheDocument();
    });
  });

  it('formats file sizes correctly', async () => {
    const items = [
      { ...sampleFile, id: 10, fileSize: 500, name: 'small.txt' },
      { ...sampleFile, id: 11, fileSize: 2048, name: 'medium.txt' },
      { ...sampleFile, id: 12, fileSize: 5242880, name: 'large.txt' },
    ];
    vi.mocked(storageService.listItems).mockResolvedValue(items);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('500 B')).toBeInTheDocument();
      expect(screen.getByText('2.0 KB')).toBeInTheDocument();
      expect(screen.getByText('5.0 MB')).toBeInTheDocument();
    });
  });

  it('formats dates in dd/MM/yyyy format', async () => {
    vi.mocked(storageService.listItems).mockResolvedValue([sampleFile]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('20/07/2024')).toBeInTheDocument();
    });
  });

  it('navigates into a folder on click', async () => {
    const user = userEvent.setup();
    vi.mocked(storageService.listItems).mockResolvedValue(sampleItems);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Tài liệu Toán/)).toBeInTheDocument();
    });

    // Click folder to navigate
    vi.mocked(storageService.listItems).mockResolvedValue([]);
    await user.click(screen.getByText(/Tài liệu Toán/));

    await waitFor(() => {
      expect(storageService.listItems).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ sortBy: 'name', sortDirection: 'asc', folderPosition: 'above' }),
      );
    });

    // Breadcrumb should show folder name
    expect(screen.getByText('Tài liệu Toán')).toBeInTheDocument();
  });

  it('navigates back via breadcrumb', async () => {
    const user = userEvent.setup();
    vi.mocked(storageService.listItems).mockResolvedValue(sampleItems);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Tài liệu Toán/)).toBeInTheDocument();
    });

    // Navigate into folder
    vi.mocked(storageService.listItems).mockResolvedValue([]);
    await user.click(screen.getByText(/Tài liệu Toán/));

    await waitFor(() => {
      const nav = screen.getByLabelText('Điều hướng thư mục');
      expect(within(nav).getByText('Gốc')).toBeInTheDocument();
    });

    // Click root breadcrumb
    vi.mocked(storageService.listItems).mockResolvedValue(sampleItems);
    const nav = screen.getByLabelText('Điều hướng thư mục');
    await user.click(within(nav).getByText('Gốc'));

    await waitFor(() => {
      expect(storageService.listItems).toHaveBeenCalledWith(
        null,
        expect.anything(),
      );
    });
  });

  it('creates a folder via inline input', async () => {
    const user = userEvent.setup();
    vi.mocked(storageService.listItems).mockResolvedValue([]);
    vi.mocked(storageService.createFolder).mockResolvedValue(sampleFolder);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tạo thư mục')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Tạo thư mục'));
    expect(screen.getByLabelText('Tên thư mục mới')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Tên thư mục mới'), 'Thư mục mới');
    await user.click(screen.getByText('Tạo'));

    await waitFor(() => {
      expect(storageService.createFolder).toHaveBeenCalledWith({
        name: 'Thư mục mới',
        parentFolderId: null,
      });
    });
  });

  it('renames an item via modal', async () => {
    const user = userEvent.setup();
    vi.mocked(storageService.listItems).mockResolvedValue([sampleFile]);
    vi.mocked(storageService.renameItem).mockResolvedValue({ ...sampleFile, name: 'renamed.pdf' });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Đổi tên')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Đổi tên'));
    expect(screen.getByLabelText('Tên mới')).toHaveValue('bai_tap.pdf');

    await user.clear(screen.getByLabelText('Tên mới'));
    await user.type(screen.getByLabelText('Tên mới'), 'renamed.pdf');
    await user.click(screen.getByText('Lưu'));

    await waitFor(() => {
      expect(storageService.renameItem).toHaveBeenCalledWith(2, { name: 'renamed.pdf' });
    });
  });

  it('deletes an item with confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(storageService.listItems).mockResolvedValue([sampleFile]);
    vi.mocked(storageService.deleteItem).mockResolvedValue(undefined);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Xóa')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Xóa'));
    expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();

    // Click the red delete button in the confirmation modal
    const deleteButtons = screen.getAllByText('Xóa');
    const confirmBtn = deleteButtons.find(
      (btn) => (btn as HTMLElement).style?.color === 'rgb(211, 47, 47)',
    );
    await user.click(confirmBtn!);

    await waitFor(() => {
      expect(storageService.deleteItem).toHaveBeenCalledWith(2);
    });
  });

  it('has search, filter, and sort controls with Vietnamese labels', async () => {
    vi.mocked(storageService.listItems).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Tìm kiếm')).toBeInTheDocument();
      expect(screen.getByLabelText('Loại tệp')).toBeInTheDocument();
      expect(screen.getByLabelText('Thời gian')).toBeInTheDocument();
      expect(screen.getByLabelText('Sắp xếp')).toBeInTheDocument();
      expect(screen.getByLabelText(/Thư mục trước/)).toBeInTheDocument();
    });
  });

  it('passes filter params to listItems', async () => {
    const user = userEvent.setup();
    vi.mocked(storageService.listItems).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Tìm kiếm')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Tìm kiếm'), 'toán');

    await waitFor(() => {
      expect(storageService.listItems).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ search: 'toán' }),
      );
    });
  });

  it('shows folder size as dash', async () => {
    vi.mocked(storageService.listItems).mockResolvedValue([sampleFolder]);
    renderPage();

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      // header + 1 data row
      expect(rows).toHaveLength(2);
      expect(within(rows[1]).getByText('—')).toBeInTheDocument();
    });
  });

  it('shows Vietnamese toolbar buttons', async () => {
    vi.mocked(storageService.listItems).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tạo thư mục')).toBeInTheDocument();
      expect(screen.getByText('Tải lên')).toBeInTheDocument();
    });
  });
});

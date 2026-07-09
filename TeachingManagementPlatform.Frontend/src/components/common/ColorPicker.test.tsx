import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ColorPicker from './ColorPicker';

describe('ColorPicker', () => {
  it('renders preset color swatches', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#c48a10" onChange={onChange} />);

    const swatches = screen.getAllByRole('button', { name: /Chọn màu/ });
    expect(swatches.length).toBeGreaterThanOrEqual(10);
  });

  it('renders a HEX input field', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#c48a10" onChange={onChange} />);

    expect(screen.getByLabelText('Mã màu HEX')).toBeInTheDocument();
  });

  it('calls onChange when a preset color is clicked', async () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#c48a10" onChange={onChange} />);

    const blueButton = screen.getByRole('button', { name: 'Chọn màu #1976d2' });
    await userEvent.click(blueButton);

    expect(onChange).toHaveBeenCalledWith('#1976d2');
  });

  it('calls onChange with valid HEX input', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#c48a10" onChange={onChange} />);

    const input = screen.getByLabelText('Mã màu HEX');
    fireEvent.change(input, { target: { value: '#ff5500' } });

    expect(onChange).toHaveBeenCalledWith('#ff5500');
  });

  it('shows error for invalid HEX input', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#c48a10" onChange={onChange} />);

    const input = screen.getByLabelText('Mã màu HEX');
    fireEvent.change(input, { target: { value: '#zzz' } });

    expect(screen.getByText('Mã màu không hợp lệ (VD: #c48a10)')).toBeInTheDocument();
  });

  it('shows a check icon on the selected preset color', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#1976d2" onChange={onChange} />);

    // The selected swatch should contain an SVG (CheckRoundedIcon)
    const selectedButton = screen.getByRole('button', { name: 'Chọn màu #1976d2' });
    expect(selectedButton.querySelector('svg')).toBeInTheDocument();

    // Another swatch should NOT have an SVG
    const otherButton = screen.getByRole('button', { name: 'Chọn màu #388e3c' });
    expect(otherButton.querySelector('svg')).not.toBeInTheDocument();
  });

  it('renders an optional label', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#c48a10" onChange={onChange} label="Chọn màu chủ đạo" />);

    expect(screen.getByText('Chọn màu chủ đạo')).toBeInTheDocument();
  });

  it('accepts HEX without # prefix and normalizes it', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#c48a10" onChange={onChange} />);

    const input = screen.getByLabelText('Mã màu HEX');
    fireEvent.change(input, { target: { value: 'aabbcc' } });

    expect(onChange).toHaveBeenCalledWith('#aabbcc');
  });
});

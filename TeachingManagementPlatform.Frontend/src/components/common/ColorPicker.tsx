import { useCallback } from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import { Check } from 'lucide-react';

/** Preset theme colors available for selection */
const PRESET_COLORS = [
  '#c48a10', // Default gold
  '#1976d2', // Blue
  '#388e3c', // Green
  '#d32f2f', // Red
  '#7b1fa2', // Purple
  '#0097a7', // Teal
  '#f57c00', // Orange
  '#5d4037', // Brown
  '#455a64', // Blue Grey
  '#e91e63', // Pink
  '#00796b', // Dark Teal
  '#303f9f', // Indigo
];

export interface ColorPickerProps {
  /** Currently selected color (HEX format with #) */
  value: string;
  /** Called when a new color is selected */
  onChange: (color: string) => void;
  /** Optional label displayed above the component */
  label?: string;
}

export default function ColorPicker({ value, onChange, label }: ColorPickerProps) {

  const handlePresetClick = useCallback(
    (color: string) => {
      onChange(color);
    },
    [onChange],
  );



  return (
    <Box>
      {label && (
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
          {label}
        </Typography>
      )}

      {/* Preset color swatches */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          mb: 2,
        }}
      >
        {PRESET_COLORS.map((color) => (
          <Box
            key={color}
            role="button"
            aria-label={`Chọn màu ${color}`}
            tabIndex={0}
            onClick={() => handlePresetClick(color)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePresetClick(color);
              }
            }}
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: color,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid',
              borderColor: value === color ? 'text.primary' : 'transparent',
              transition: 'transform 0.15s, border-color 0.15s',
              '&:hover': {
                transform: 'scale(1.15)',
              },
            }}
          >
            {value === color && (
              <Check size={18} color="#fff" />
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

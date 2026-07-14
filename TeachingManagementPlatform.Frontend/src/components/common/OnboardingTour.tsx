import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Button, Paper, Popper, Typography } from '@mui/material';

export interface TourStep {
  /** data-tour-id attribute value to locate the target element */
  targetId: string;
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-quiz',
    title: 'Tạo Quiz nhanh',
    description: 'Tạo câu hỏi trắc nghiệm từ tài liệu hoặc thủ công. Hỗ trợ AI gợi ý câu hỏi thông minh.',
  },
  {
    targetId: 'tour-storage',
    title: 'Kho tài liệu',
    description: 'Lưu trữ và quản lý tài liệu giảng dạy. Upload bài giảng, đề thi, slides tại đây.',
  },
  {
    targetId: 'tour-shared-plans',
    title: 'Giáo án cộng đồng',
    description: 'Khám phá và chia sẻ giáo án với cộng đồng giảng viên. Tham khảo ý tưởng từ đồng nghiệp.',
  },
];

interface OnboardingTourProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingTour({ open, onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStep];
  const totalSteps = TOUR_STEPS.length;

  // Find the target element for the current step
  const updateAnchor = useCallback(() => {
    if (!open || !step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.targetId}"]`);
    if (el) {
      setAnchorEl(el);
      setSpotlightRect(el.getBoundingClientRect());
    } else {
      setAnchorEl(null);
      setSpotlightRect(null);
    }
  }, [open, step]);

  useEffect(() => {
    updateAnchor();
    // Re-calc on resize/scroll
    window.addEventListener('resize', updateAnchor);
    window.addEventListener('scroll', updateAnchor, true);
    return () => {
      window.removeEventListener('resize', updateAnchor);
      window.removeEventListener('scroll', updateAnchor, true);
    };
  }, [updateAnchor]);

  // Focus management: focus tooltip when it appears
  useEffect(() => {
    if (open && tooltipRef.current) {
      tooltipRef.current.focus();
    }
  }, [open, currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setCurrentStep(0);
      onComplete();
    }
  }, [currentStep, totalSteps, onComplete]);

  const handleSkip = useCallback(() => {
    setCurrentStep(0);
    onSkip();
  }, [onSkip]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop with spotlight cutout */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 1300,
          pointerEvents: 'none',
        }}
      >
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <mask id="onboarding-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {spotlightRect && (
                <rect
                  x={spotlightRect.left - 6}
                  y={spotlightRect.top - 4}
                  width={spotlightRect.width + 12}
                  height={spotlightRect.height + 8}
                  rx={8}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.5)"
            mask="url(#onboarding-spotlight-mask)"
          />
        </svg>
      </Box>

      {/* Click blocker (allows clicking only the tooltip) */}
      <Box
        onClick={handleSkip}
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 1301,
        }}
      />

      {/* Tooltip Popper */}
      <Popper
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        placement="right-start"
        sx={{ zIndex: 1302 }}
        modifiers={[
          { name: 'offset', options: { offset: [0, 12] } },
          { name: 'preventOverflow', options: { boundary: 'viewport', padding: 16 } },
          { name: 'flip', options: { fallbackPlacements: ['right', 'bottom', 'left', 'top'] } },
        ]}
      >
        <Paper
          ref={tooltipRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={`Hướng dẫn bước ${currentStep + 1} trên ${totalSteps}`}
          elevation={8}
          onClick={(e) => e.stopPropagation()}
          sx={{
            p: 2.5,
            maxWidth: 320,
            borderRadius: 3,
            outline: 'none',
          }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ mb: 0.5 }}>
            Bước {currentStep + 1}/{totalSteps}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {step.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {step.description}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Button size="small" variant="text" onClick={handleSkip} aria-label="Bỏ qua hướng dẫn">
              Bỏ qua
            </Button>
            <Button size="small" variant="contained" onClick={handleNext} aria-label={currentStep < totalSteps - 1 ? 'Tiếp theo' : 'Hoàn tất'}>
              {currentStep < totalSteps - 1 ? 'Tiếp theo' : 'Hoàn tất'}
            </Button>
          </Box>
        </Paper>
      </Popper>
    </>
  );
}

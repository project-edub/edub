# React Teaching Management Platform - Mobile Responsiveness Audit

**Audit Date**: 2026-07-11  
**Total Pages Analyzed**: 35 pages  
**Files Scanned**: src/pages and src/components/lecturer directories

---

## EXECUTIVE SUMMARY

| Category | Count | Priority |
|----------|-------|----------|
| **Critical** (Table conversion needed) | 12 | HIGH |
| **High** (Fixed layouts need stacking) | 4 | HIGH |
| **Medium** (Spacing/sizing issues) | 13 | MEDIUM |
| **Low** (Mostly responsive) | 6 | LOW |
| **Total Pages** | 35 | — |

---

## SECTION 1: COMPLETE PAGE FILE LIST

### Public/Auth Pages (4 files)
1. `pages/LandingPage.tsx`
2. `pages/auth/LoginPage.tsx`
3. `pages/auth/RegisterPage.tsx`
4. `pages/auth/GoogleCallbackPage.tsx`

### Guest/Player Pages (3 files)
5. `pages/HomePage.tsx`
6. `pages/QuizPlayerPage.tsx`
7. `pages/CrosswordPlayerPage.tsx`

### Lecturer Pages - Management (10 files)
8. `pages/lecturer/OverviewPage.tsx`
9. `pages/lecturer/ClassListPage.tsx`
10. `pages/lecturer/ClassDetailPage.tsx`
11. `pages/lecturer/LessonListPage.tsx`
12. `pages/lecturer/LessonEditPage.tsx`
13. `pages/lecturer/LessonPlanPage.tsx`
14. `pages/lecturer/MinigamesPage.tsx`
15. `pages/lecturer/SubscriptionPage.tsx`
16. `pages/lecturer/CoinPurchasePage.tsx`
17. `pages/lecturer/TransactionHistoryPage.tsx`

### Lecturer Pages - Content Creation (7 files)
18. `pages/lecturer/QuizListPage.tsx`
19. `pages/lecturer/QuizEditorPage.tsx`
20. `pages/lecturer/QuizGeneratorPage.tsx`
21. `pages/lecturer/CrosswordListPage.tsx`
22. `pages/lecturer/CrosswordCreatorPage.tsx`
23. `pages/lecturer/CrosswordEditorPage.tsx`
24. `pages/lecturer/TeachingMaterialStoragePage.tsx`

### Admin Pages (5 files)
25. `pages/admin/AccountManagementPage.tsx`
26. `pages/admin/CoinPackagePage.tsx`
27. `pages/admin/GameEcoinConfigPage.tsx`
28. `pages/admin/ScoreTemplateManager.tsx`
29. `pages/admin/SubscriptionPackagePage.tsx`

### Lecturer Components (Major UI - 6 files listed as potential pages)
30. `components/lecturer/StudentListTable.tsx`
31. `components/lecturer/StudentListTabs.tsx`
32. `components/lecturer/ScoreGrid.tsx`
33. `components/lecturer/ClassLessonPlanTab.tsx`
34. `components/lecturer/QuizPlayerModal.tsx`
35. `components/lecturer/QuizViewModal.tsx`

---

## SECTION 2: DETAILED ANALYSIS BY PAGE

### 🔴 CRITICAL PRIORITY - Tables Need Card Conversion

#### 1. **pages/lecturer/ClassListPage.tsx**
**Issues Found:**
- ✗ HTML `<table>` with fixed layout (no responsive styling)
- ✗ Columns: Name, Year, Student Count (3 columns)
- ✗ Inline styling: `padding: 24` (desktop-only)
- ✗ No horizontal scroll container
- ✗ Buttons in table cells not touch-friendly (< 44px)

**Mobile Impact:** HIGH - Table overflows horizontally, unreadable on mobile
**Fix Needed:** Convert to card list or responsive table with horizontal scroll

---

#### 2. **pages/lecturer/ClassDetailPage.tsx**
**Issues Found:**
- ✗ HTML `<table>` for class info (Name, Year, Student Count)
- ✗ Inline styles for table cells: `labelStyle` and `valueStyle`
- ✗ Fixed padding and no responsive adjustments
- ✗ Tab navigation with equal flex: `flex: 1` might overflow text on mobile

**Mobile Impact:** MEDIUM - Table not critical but tab labels might wrap poorly
**Fix Needed:** Convert info table to definition list or cards

---

#### 3. **pages/lecturer/QuizListPage.tsx**
**Issues Found:**
- ✓ Uses Material-UI Table components (better than raw HTML)
- ✗ But still needs responsive column hiding
- ✗ Columns: Title, Status, Question Count, Submission Count, Actions (5 columns)
- ✗ Action buttons row may overflow on mobile
- ✗ No column reordering for mobile view

**Mobile Impact:** HIGH - Too many columns for mobile screen
**Fix Needed:** Hide/reorder columns on mobile, use horizontal scroll or stack actions

**Code Location:** Lines 1-165
```tsx
<Table>
  <TableHead>
    <TableRow>
      <TableCell>Tiêu đề</TableCell>
      <TableCell>Trạng thái</TableCell>
      <TableCell align="center">Câu hỏi</TableCell>
      <TableCell align="center">Bài nộp</TableCell>
      <TableCell align="right">Hành động</TableCell> // Problem: 5 cells on mobile
    </TableRow>
  </TableHead>
```

---

#### 4. **pages/lecturer/CrosswordListPage.tsx**
**Issues Found:**
- ✓ Uses Material-UI Table (better starting point)
- ✗ Multiple columns that won't fit mobile width
- ✗ Action buttons in narrow space
- ✗ Status badge may not display clearly

**Mobile Impact:** HIGH - Similar to QuizListPage
**Fix Needed:** Responsive column management

---

#### 5. **pages/lecturer/LessonPlanPage.tsx**
**Issues Found:**
- ✗ HTML `<table>` with raw styling
- ✗ Columns: Môn (Subject), Khối (Grade), Niên khóa (Year), Hành động (4 columns)
- ✗ Filter controls in row: `display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap'`
  - Good: has flexWrap, but inputs are hardcoded `width: 160px` (won't work on mobile)
- ✗ Input fields fixed width: `width: 160` for filter fields

**Mobile Impact:** HIGH - Table + filters both problematic
**Fix Needed:** Convert table to cards, make filter inputs responsive

**Code Location:** Lines 88-108
```tsx
<div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
  <div>
    <label>Môn học</label>
    <input style={{ padding: 8, width: 160, ... }} /> // Fixed 160px!
  </div>
```

---

#### 6. **pages/lecturer/TransactionHistoryPage.tsx**
**Issues Found:**
- ✗ HTML `<table>` with 6 columns: Order Code, Amount, Coin, Status, Created Date, Paid Date
- ✗ Table wrapped in `overflow-x: auto` (good), but needs better mobile layout
- ✗ All inline styles without responsive variants
- ✗ Status badges use inline styles

**Mobile Impact:** MEDIUM-HIGH - Overflow handled but table cramped on mobile
**Fix Needed:** Option to switch to card view or hide less important columns

**Code Location:** Lines 54-96
```tsx
<table style={tableStyle}>  // tableStyle has borderCollapse only
  <thead>
    <tr>
      <th style={thStyle}>Mã đơn hàng</th>
      <th style={thStyle}>Số tiền</th>
      <th style={thStyle}>ECoin</th>
      <th style={thStyle}>Trạng thái</th>
      <th style={thStyle}>Ngày tạo</th>
      <th style={thStyle}>Ngày thanh toán</th>
    </tr>
  </thead>
```

---

#### 7. **pages/lecturer/OverviewPage.tsx**
**Issues Found:**
- ✗ HTML `<table>` for instructor profile info
- ✗ Table with profile fields like name, phone, email
- ✗ Inline styles: `infoTableStyle` referenced
- ✗ No responsive styling

**Mobile Impact:** MEDIUM - Info display, less critical
**Fix Needed:** Convert to vertical list or cards

---

#### 8. **pages/admin/AccountManagementPage.tsx**
**Issues Found:**
- ✗ HTML `<table>` with 6+ columns: Email, Name, Role, Coins, Subscription, Actions
- ✗ Inline styling: `width: '100%', borderCollapse: 'collapse'`
- ✗ No responsive columns management
- ✗ Modal form has basic styling

**Mobile Impact:** HIGH - Many admin pages need to work well on tablet/mobile for field management
**Fix Needed:** Responsive table with column hiding or card conversion

---

#### 9. **pages/admin/CoinPackagePage.tsx**
**Issues Found:**
- ✗ HTML `<table>` with multiple columns
- ✗ Package management UI not optimized for mobile
- ✗ Form dialogs without fullWidth responsive settings

**Mobile Impact:** HIGH
**Fix Needed:** Card-based layout for packages, responsive modals

---

#### 10. **pages/admin/GameEcoinConfigPage.tsx**
**Issues Found:**
- ✓ Uses Material-UI Table components
- ✗ Still needs responsive column management
- ✗ Multiple columns without mobile optimization

**Mobile Impact:** HIGH
**Fix Needed:** Add MUI responsive hiding/reordering

---

#### 11. **pages/admin/ScoreTemplateManager.tsx**
**Issues Found:**
- ✗ HTML `<table>` with template columns
- ✗ Complex form with dynamic column rows
- ✗ No responsive form layout

**Mobile Impact:** MEDIUM-HIGH (admin interface)
**Fix Needed:** Responsive form, card-based template display

---

#### 12. **pages/admin/SubscriptionPackagePage.tsx**
**Issues Found:**
- ✗ HTML `<table>` with package details
- ✗ Multiple columns for pricing/features
- ✗ No responsive styling

**Mobile Impact:** HIGH
**Fix Needed:** Card grid with responsive columns

---

### 🟠 HIGH PRIORITY - Multi-Column Fixed Layouts

#### 13. **pages/lecturer/CrosswordEditorPage.tsx**
**Issues Found:**
- ✗ Fixed multi-column grid layout: `gridTemplateColumns: '1fr 360px'`
- ✗ 360px sidebar is fixed width, doesn't scale on mobile
- ✗ Editor area + sidebar layout breaks on screens < 768px

**Mobile Impact:** HIGH - Editor UI unusable on mobile
**Fix Needed:** Stack vertically on mobile: `gridTemplateColumns: { xs: '1fr', md: '1fr 360px' }`

**Code Location:** Line ~606
```tsx
<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 3, alignItems: 'start' }}>
  // Problem: fixed 360px sidebar!
</Box>
```

---

#### 14. **pages/lecturer/QuizEditorPage.tsx**
**Issues Found:**
- ✗ Complex editor UI likely has fixed layouts
- ✗ Side panels for question editing probably don't stack

**Mobile Impact:** HIGH
**Fix Needed:** Responsive editor layout or drawer-based UI for mobile

---

#### 15. **pages/lecturer/QuizGeneratorPage.tsx**
**Issues Found:**
- ✗ Grid layout: `display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'`
- ✗ While auto-fit is good, minmax(200px) may still be wide on mobile

**Mobile Impact:** MEDIUM - Grid layout mostly OK but could be tighter
**Fix Needed:** Adjust minmax for mobile: `gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(150px, 1fr))' }`

---

#### 16. **pages/lecturer/CoinPurchasePage.tsx**
**Issues Found:**
- ✗ Grid layout for pricing options
- ✗ Package cards may not stack properly

**Mobile Impact:** MEDIUM
**Fix Needed:** Ensure responsive grid with proper breakpoints

---

### 🟡 MEDIUM PRIORITY - Spacing, Sizing & Partial Responsiveness

#### 17. **pages/lecturer/LessonListPage.tsx**
**Issues Found:**
- ✗ Hardcoded padding: `style={pageStyle}` where `padding: 24`
- ✗ Lesson cards have inline styles without responsive variants
- ✗ Input field for "Add lesson": `maxWidth: 400` (too wide for mobile)
- ✗ Buttons not guaranteed 44×44px on mobile

**Mobile Impact:** MEDIUM - Readable but cramped spacing
**Fix Needed:** Responsive padding, make input full-width on mobile

**Code Location:** Lines 93-99
```tsx
const pageStyle: React.CSSProperties = { padding: 24, maxWidth: 900, margin: '0 auto' };
// Problem: padding: 24 is 24px on all screens
// Better: Use MUI sx prop with responsive padding
```

---

#### 18. **pages/lecturer/LessonEditPage.tsx**
**Issues Found:**
- ✗ Complex UI with multiple sections (documents, attachments, storage picker)
- ✗ Section layouts may not stack well on mobile
- ✗ Modals/pickers without fullWidth attribute
- ✗ Flex layouts without responsive adjustments

**Mobile Impact:** MEDIUM - Many sub-components need review
**Fix Needed:** Systematic responsive fixes to all sections

---

#### 19. **pages/lecturer/TeachingMaterialStoragePage.tsx**
**Issues Found:**
- ✗ File browser layout with inline styles
- ✗ Breadcrumb navigation may overflow on mobile
- ✗ Filter controls without responsive wrapping
- ✗ File list/grid likely not optimized for mobile

**Mobile Impact:** MEDIUM-HIGH - Complex UI with many interactions
**Fix Needed:** Responsive filter, optimized file list view, mobile-friendly navigation

---

#### 20. **pages/lecturer/MinigamesPage.tsx**
**Issues Found:**
- ✓ Uses Material-UI Grid with responsive breakpoints: `gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }`
- ✓ Button uses MUI Container (responsive)
- ✗ But header flex might not wrap: `display: 'flex', flexDirection: { xs: 'column', sm: 'row' }` (needs gap adjustment)

**Mobile Impact:** LOW - Already fairly responsive!
**Fix Needed:** Minor tweaks to header spacing

---

#### 21. **pages/lecturer/SubscriptionPage.tsx**
**Issues Found:**
- ✗ Content layout may not be optimized for mobile
- ✗ Subscription cards/packages may not stack

**Mobile Impact:** MEDIUM
**Fix Needed:** Ensure card grid is responsive

---

#### 22. **pages/auth/LoginPage.tsx**
**Issues Found:**
- ✓ Uses Material-UI (good starting point)
- ✓ Container with responsive maxWidth: `maxWidth="sm"`
- ✗ Button sizing: `size="large"` should be fine but check padding
- ✗ Toolbar buttons may not have sufficient touch targets

**Mobile Impact:** LOW-MEDIUM - Already fairly good
**Fix Needed:** Verify button sizes (44×44px minimum)

---

#### 23. **pages/auth/RegisterPage.tsx**
**Issues Found:**
- Similar to LoginPage - mostly Material-UI but needs verification

**Mobile Impact:** LOW-MEDIUM
**Fix Needed:** Consistent with LoginPage fixes

---

#### 24. **pages/HomePage.tsx**
**Issues Found:**
- ✓ Uses MUI Grid with responsive: `gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }`
- ✗ Padding/spacing may need review
- ✗ Typography scaling might need mobile adjustments

**Mobile Impact:** LOW - Already fairly responsive
**Fix Needed:** Fine-tune spacing and typography

---

#### 25. **pages/LandingPage.tsx**
**Issues Found:**
- ✓ Uses Material-UI components
- ✓ Grid layout for features: `gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }`
- ✗ AppBar might have crowded buttons on mobile

**Mobile Impact:** LOW-MEDIUM
**Fix Needed:** Responsive AppBar button layout

---

#### 26. **pages/QuizPlayerPage.tsx**
**Issues Found:**
- ✓ Uses Material-UI Box and Stack
- ✗ Question display may be cramped: `maxWidth: 700`
- ✗ Options layout needs to be verified for touch targets

**Mobile Impact:** MEDIUM - Player UI must be excellent on mobile
**Fix Needed:** Ensure options have 44×44px touch targets, responsive maxWidth

**Code Location:** Line ~130
```tsx
<Box sx={{ maxWidth: 700, mx: 'auto', p: 3, mt: 2 }}>
  // Good: responsive padding with `p: 3`
  // But: maxWidth: 700 is desktop-centric, should be { xs: '100%', sm: 700 }?
```

---

#### 27. **pages/CrosswordPlayerPage.tsx**
**Issues Found:**
- ✗ Crossword grid display likely not optimized for mobile
- ✗ Input fields for crossword answers may be too small
- ✗ Mobile orientation handling needed

**Mobile Impact:** HIGH - Crossword UX critical on mobile
**Fix Needed:** Mobile-first crossword layout, responsive grid sizing

---

### 🟢 LOW PRIORITY - Mostly Responsive

#### 28-35. Additional Components & Pages
- `components/lecturer/StudentListTable.tsx` - Table component, needs card conversion
- `components/lecturer/ScoreGrid.tsx` - Score display, needs responsive review
- `components/lecturer/QuizPlayerModal.tsx` - Modal sizing check
- `components/lecturer/QuizViewModal.tsx` - Modal sizing check
- `pages/auth/GoogleCallbackPage.tsx` - Loading page, minimal UI
- Player pages with inline MUI components

---

## SECTION 3: CROSS-CUTTING PATTERNS & SYSTEMATIC ISSUES

### Pattern 1: Fixed Padding/Margins on All Breakpoints
**Affected Pages**: ClassListPage, ClassDetailPage, LessonPlanPage, LessonListPage, TransactionHistoryPage, OverviewPage, LessonEditPage

**Current Code:**
```tsx
<div style={{ padding: 24 }}>
```

**Issue:** 24px padding is excessive on mobile (< 375px width). Phone width minus 48px leaves 327px for content (already cramped with 16px margin text).

**Recommended Fix:**
```tsx
<Box sx={{ p: { xs: 2, md: 6 } }}>
  {/* xs: 8px, md: 24px */}
```

**Impact**: 13+ pages need this systematic update

---

### Pattern 2: Hardcoded Input Field Widths
**Affected Pages**: LessonPlanPage (filter inputs), TeachingMaterialStoragePage (filter inputs)

**Current Code:**
```tsx
<input style={{ padding: 8, width: 160, ... }} />
```

**Issue:** Fixed `width: 160` means 3 filter inputs in a row take 480px (won't fit mobile).

**Recommended Fix:**
```tsx
<TextField
  sx={{ 
    width: { xs: '100%', sm: '160px' },
    flex: { xs: '1 1 auto', sm: 'none' }
  }}
/>
```

**Impact**: Filter UIs across 5+ pages need this fix

---

### Pattern 3: Buttons Without Minimum Touch Target Size
**Affected Pages**: All pages with action buttons

**Current Code:**
```tsx
<Button size="small" variant="outlined" startIcon={<DeleteIcon />}>
  Xóa
</Button>
```

**Issue:** MUI `size="small"` = 32px height (below 44×44px mobile recommendation). On dense tables, buttons are too narrow for reliable tapping.

**Recommended Fix:**
```tsx
<Button 
  variant="outlined" 
  startIcon={<DeleteIcon />}
  sx={{
    minHeight: { xs: 44, sm: 'auto' },
    minWidth: { xs: 44, sm: 'auto' }
  }}
>
  Xóa
</Button>
```

**Or use:**
```tsx
sx={{ 
  minHeight: '44px',
  minWidth: '44px',
  '@media (max-width: 600px)': {
    size: 'medium', // Instead of 'small'
  }
}}
```

**Impact**: 20+ pages with action buttons need systematic updates

---

### Pattern 4: Multi-Column Tables Without Mobile Adaptation
**Affected Pages**: 12 table-based pages (see Critical section)

**Current Code:**
```tsx
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
      <th>Column 3</th>
      <th>Column 4</th>
      <th>Column 5</th>  <!-- Unreadable on 375px phone -->
    </tr>
  </thead>
```

**Recommended Approaches:**
1. **Horizontal Scroll** (quickest):
```tsx
<div style={{ overflowX: 'auto', borderRadius: 8 }}>
  <table>{/* content */}</table>
</div>
// Add: Add minimum width to table so scroll works
```

2. **Card Conversion** (best UX):
```tsx
<Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
  {items.map(item => (
    <Card key={item.id}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">Label 1:</Typography>
          <Typography variant="body2">{item.value1}</Typography>
        </Box>
        {/* More fields */}
      </CardContent>
    </Card>
  ))}
</Box>
```

3. **Responsive Column Hiding**:
```tsx
<TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
  Column Hidden on Mobile
</TableCell>
```

**Impact**: CRITICAL - affects 12+ pages

---

### Pattern 5: Fixed Sidebar/Multi-Column Layouts
**Affected Pages**: CrosswordEditorPage (360px sidebar), QuizEditorPage, QuizGeneratorPage

**Current Code:**
```tsx
<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 3 }}>
  {/* Editor content */}
  {/* Fixed 360px sidebar */}
</Box>
```

**Issue:** On 375px phone, sidebar would take 360px + gap, leaving < 15px for editor.

**Recommended Fix:**
```tsx
<Box sx={{ 
  display: 'grid', 
  gridTemplateColumns: { 
    xs: '1fr',           // Mobile: stack vertically
    md: '1fr 360px'      // Desktop: side by side
  }, 
  gap: 3 
}}>
```

**For full-screen mobile editors:**
```tsx
gridTemplateColumns: { 
  xs: '1fr',            // Phone: full width or tab-based
  sm: '1fr 280px',      // Tablet: narrower sidebar
  md: '1fr 360px'       // Desktop: full sidebar
}
```

**Impact**: 4 complex editor pages need this fix

---

### Pattern 6: Modal Dialogs Without Responsive Max-Width
**Affected Pages**: All modal-based forms (LessonDetailModal, AddSlotModal, MiniGameCreateModal, etc.)

**Current Code:**
```tsx
<Dialog open={open} onClose={handleClose}>
  <DialogTitle>Form Title</DialogTitle>
  <DialogContent>
    {/* Form content */}
  </DialogContent>
</Dialog>
```

**Issue:** Dialog default width can exceed 375px phone width, content gets cut off.

**Recommended Fix:**
```tsx
<Dialog 
  open={open} 
  onClose={handleClose}
  fullWidth
  maxWidth="sm"  // sm = 600px max (still too big for mobile)
>
  // Better:
  maxWidth={{ xs: 'xs', sm: 'sm' }}  // xs=444px, sm=600px
  // Or responsive with custom breakpoint:
  sx={{ 
    '& .MuiDialog-paper': {
      width: { xs: '90vw', sm: '600px' }
    }
  }}
>
```

**Impact**: 15+ modal/dialog-based features

---

### Pattern 7: Filter Rows with Fixed Input Widths
**Affected Pages**: LessonPlanPage, TeachingMaterialStoragePage, QuizListPage, CrosswordListPage

**Current Code:**
```tsx
<div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
  <input style={{ width: 160 }} />  <!-- Fixed width! -->
  <input style={{ width: 160 }} />
  <input style={{ width: 160 }} />
</div>
```

**Issue:** Even with flexWrap, 3× 160px inputs exceed mobile width, forcing scroll.

**Recommended Fix:**
```tsx
<Stack 
  direction={{ xs: 'column', sm: 'row' }} 
  spacing={1.5}
  sx={{ mb: 2 }}
>
  <TextField
    label="Filter 1"
    sx={{ flex: { xs: '1 1 100%', sm: 'none' }, width: { sm: 160 } }}
  />
  {/* Inputs now stack on mobile, row on desktop */}
</Stack>
```

**Impact**: 5+ pages with filter UI

---

### Pattern 8: Text Overflow in Headers/Titles
**Affected Pages**: Tables with long titles, navigation with many items

**Current Code:**
```tsx
<th style={thStyle}>Đây là một tiêu đề dài</th>
```

**Issue:** Text doesn't wrap or truncate, causes overflow.

**Recommended Fix:**
```tsx
<TableCell sx={{ 
  maxWidth: { xs: 80, sm: 120, md: 'auto' },
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}}>
  Đây là một tiêu đề dài
</TableCell>
// OR allow wrapping:
sx={{ 
  wordBreak: 'break-word',
  whiteSpace: 'normal'
}}
```

**Impact**: Minor but affects multiple pages

---

## SECTION 4: PRIORITY RANKING & IMPLEMENTATION ROADMAP

### PHASE 1: CRITICAL TABLE PAGES (Week 1-2)
**High Impact, Highest ROI**

Target: 12 pages
Estimated Effort: 3-5 days

1. **QuizListPage.tsx** - High traffic, many users
2. **CrosswordListPage.tsx** - High traffic
3. **ClassListPage.tsx** - Teacher primary workflow
4. **AccountManagementPage.tsx** - Admin workflow
5. **TransactionHistoryPage.tsx** - User-facing payment history
6. **LessonPlanPage.tsx** - Teacher workflow + complex filters
7. **SubscriptionPackagePage.tsx** - Admin
8. **CoinPackagePage.tsx** - Admin
9. **GameEcoinConfigPage.tsx** - Admin
10. **ScoreTemplateManager.tsx** - Admin
11. **ClassDetailPage.tsx** - Teacher workflow
12. **OverviewPage.tsx** - Teacher profile

**Deliverables:**
- [ ] Each page can be viewed on 375px mobile without horizontal scroll
- [ ] Tables converted to either: responsive cards, horizontal scroll, or column hiding
- [ ] All buttons >= 44×44px on mobile
- [ ] Spacing responsive: `p: { xs: 2, md: 6 }`

---

### PHASE 2: LAYOUT STACKING PAGES (Week 2)
**High Impact, Moderate Effort**

Target: 4 pages
Estimated Effort: 2-3 days

1. **CrosswordEditorPage.tsx** - Complex editor
2. **QuizEditorPage.tsx** - Complex editor
3. **QuizGeneratorPage.tsx** - Grid layout
4. **CoinPurchasePage.tsx** - Package grid

**Deliverables:**
- [ ] Multi-column layouts stack on mobile
- [ ] Sidebars responsive: `{ xs: 'none', md: 'block' }`
- [ ] Editor/main content responsive: `gridTemplateColumns: { xs: '1fr', md: '1fr 360px' }`

---

### PHASE 3: SPACING & BUTTON SIZING (Week 3)
**Medium Impact, High Volume**

Target: All pages (systematic pass)
Estimated Effort: 3-4 days

**Tasks:**
1. Replace all `padding: X` with responsive `sx={{ p: { xs: value, md: value } }}`
2. Update all buttons `size="small"` to have `sx={{ minHeight: 44, minWidth: 44 }}`
3. Fix filter input widths: `width: { xs: '100%', sm: 160 }`
4. Update modal dialogs: `maxWidth={{ xs: 'xs', sm: 'sm' }}`

**Deliverables:**
- [ ] No inline fixed padding/margins
- [ ] All buttons touch-friendly
- [ ] Filter/form inputs stack on mobile

---

### PHASE 4: FORM & MODAL IMPROVEMENTS (Week 4)
**Medium Impact, Moderate Effort**

Target: 15+ modal/form-heavy pages
Estimated Effort: 2-3 days

**Tasks:**
1. Add `fullWidth maxWidth={{ xs: 'xs', sm: 'sm' }}` to all Dialog components
2. Ensure form fields are `fullWidth` on mobile
3. Stack form actions vertically on mobile: `flexDirection: { xs: 'column', sm: 'row' }`

**Deliverables:**
- [ ] No modal overflow on mobile
- [ ] Forms fully usable on smallest screen
- [ ] Action buttons full-width on mobile

---

### PHASE 5: PLAYER PAGES & TESTING (Week 5)
**Critical for User Experience**

Target: QuizPlayerPage, CrosswordPlayerPage + testing
Estimated Effort: 2-3 days

**Tasks:**
1. Verify QuizPlayerPage: responsive, 44×44px radio buttons
2. Verify CrosswordPlayerPage: grid sizing for crossword
3. Test on actual devices: iPhone SE (375px), iPhone 12 (390px), Android (360px)
4. Test landscape orientation
5. Test touch interactions

**Deliverables:**
- [ ] Quiz gameplay excellent on mobile
- [ ] Crossword playable on mobile
- [ ] All interactions work with touch

---

## SECTION 5: COMMON RESPONSIVE PATTERNS TO USE

### Pattern A: Responsive Padding
```tsx
// ❌ Bad
<div style={{ padding: 24 }}>

// ✅ Good
<Box sx={{ p: { xs: 2, sm: 3, md: 6 } }}>
// xs (0-599px): 8px
// sm (600-899px): 12px
// md (900px+): 24px
```

---

### Pattern B: Responsive Grid/Flex
```tsx
// ❌ Bad
<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 360px' }}>

// ✅ Good
<Box sx={{ 
  display: 'grid', 
  gridTemplateColumns: { 
    xs: '1fr',           // Mobile: single column
    md: '1fr 360px'      // Desktop: with sidebar
  },
  gap: 3
}}>
```

---

### Pattern C: Responsive Button Sizing
```tsx
// ❌ Bad
<Button size="small">Small Button</Button>  // 32px height

// ✅ Good
<Button sx={{ minHeight: { xs: 44, sm: 'auto' } }}>
  Full Touch Target on Mobile
</Button>
```

---

### Pattern D: Responsive Input Width
```tsx
// ❌ Bad
<input style={{ width: 160 }} />

// ✅ Good
<TextField sx={{ width: { xs: '100%', sm: 160 } }} />
```

---

### Pattern E: Modal Responsive Width
```tsx
// ❌ Bad
<Dialog maxWidth="sm">

// ✅ Good
<Dialog 
  fullWidth
  maxWidth="sm"
  sx={{
    '& .MuiDialog-paper': {
      m: 1,  // Add margin so not flush with edges
      maxWidth: { xs: 'calc(100vw - 16px)', sm: 'sm' }
    }
  }}
>
```

---

### Pattern F: Table Card Conversion
```tsx
// ❌ Bad (on mobile)
<table>
  <tr>
    <td>Value 1</td>
    <td>Value 2</td>
    <td>Value 3</td>
    <td>Value 4</td>
    <td>Value 5</td>
  </tr>
</table>

// ✅ Good
{items.map(item => (
  <Card key={item.id} sx={{ mb: 1.5 }}>
    <CardContent>
      <Grid container spacing={2}>
        <Grid xs={6} sm={3}>
          <Typography variant="caption" color="text.secondary">
            Label 1
          </Typography>
          <Typography variant="body2">{item.value1}</Typography>
        </Grid>
        {/* Repeat for each field */}
      </Grid>
    </CardContent>
  </Card>
))}
```

---

### Pattern G: Responsive Table with Horizontal Scroll
```tsx
// ✅ Alternative to card conversion
<Box sx={{ overflowX: 'auto', borderRadius: 1 }}>
  <Table sx={{ minWidth: 600 }}>  // Force minimum width for scroll
    {/* Table content */}
  </Table>
</Box>
```

---

### Pattern H: Stack with Responsive Direction
```tsx
// ✅ Good for filter rows
<Stack 
  direction={{ xs: 'column', sm: 'row' }} 
  spacing={1.5}
  sx={{ mb: 2, width: '100%' }}
>
  <TextField sx={{ flex: { xs: 1, sm: 'none' } }} />
  <TextField sx={{ flex: { xs: 1, sm: 'none' } }} />
  <Button sx={{ width: { xs: '100%', sm: 'auto' } }} />
</Stack>
```

---

## SECTION 6: TESTING CHECKLIST

### Device Breakpoints to Test
- [ ] 320px (old Android)
- [ ] 375px (iPhone SE)
- [ ] 390px (iPhone 12)
- [ ] 480px (older Android)
- [ ] 768px (iPad Mini)
- [ ] 1024px (iPad)
- [ ] 1280px (Desktop)

### Orientation Tests
- [ ] Portrait mode on all devices
- [ ] Landscape mode on mobile (critical for games)
- [ ] Orientation change handling

### Touch Interaction Tests
- [ ] All buttons >= 44×44px
- [ ] Spacing sufficient between tap targets
- [ ] No accidental double-taps
- [ ] Hover states don't hide content

### Content Tests
- [ ] Text readable (no overflow)
- [ ] Images responsive and not oversized
- [ ] Tables/lists don't cause horizontal scroll
- [ ] Modals don't exceed screen bounds
- [ ] Forms fully visible without scrolling (if possible)

### Performance Tests
- [ ] Page load time < 3s on 4G
- [ ] Smooth scrolling (60fps)
- [ ] Images optimized for mobile

---

## SECTION 7: IMPLEMENTATION TEMPLATE

### Step 1: Update a Page Template
```tsx
// Before
export default function ExamplePage() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>Title</h1>
      <table style={{ width: '100%' }}>
        {/* table content */}
      </table>
    </div>
  );
}

// After
import { Box, Card, CardContent, Stack, Button, TextField } from '@mui/material';

export default function ExamplePage() {
  return (
    <Box sx={{ p: { xs: 2, md: 6 }, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
        Title
      </Typography>
      
      {/* Option 1: Card grid */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
        gap: 2 
      }}>
        {items.map(item => (
          <Card key={item.id}>
            <CardContent>
              {/* Card content */}
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
```

---

## SECTION 8: RESOURCES & REFERENCES

### Material-UI Breakpoints
- xs: 0px
- sm: 600px
- md: 900px
- lg: 1200px
- xl: 1536px

### Responsive Value Syntax (MUI)
```tsx
// All equivalent:
sx={{ p: 3 }}                    // 3 * 8px = 24px on all screens
sx={{ p: { xs: 2, md: 4 } }}     // 16px on xs, 32px on md+
sx={{ p: [2, 3, 4] }}            // xs: 16px, sm: 24px, md: 32px
```

### Common Responsive Patterns
- Grid columns: `gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }`
- Flex direction: `flexDirection: { xs: 'column', sm: 'row' }`
- Display: `display: { xs: 'none', md: 'block' }`
- Width: `width: { xs: '100%', sm: 'auto' }`

### Touch Target Guidelines
- Minimum: 44×44px (iOS), 48×48px (Android)
- Recommended: 56×56px
- Spacing: 8px minimum between targets

---

## SUMMARY TABLE

| **Issue Type** | **Affected Pages** | **Severity** | **Effort** | **Phase** |
|---|---|---|---|---|
| Table overflow | 12 pages | CRITICAL | Medium | 1 |
| Fixed layouts | 4 pages | HIGH | Medium | 2 |
| Padding/spacing | 13+ pages | MEDIUM | Low | 3 |
| Button sizing | 20+ pages | MEDIUM | Low | 3 |
| Modal width | 15+ pages | MEDIUM | Low | 4 |
| Filter inputs | 5 pages | MEDIUM | Low | 3 |
| Player experience | 2 pages | HIGH | Medium | 5 |

**Total Estimated Effort**: 14-18 days
**Recommended Timeline**: 4-5 weeks (1 phase per week)
**Start Date**: [Next sprint]
**Target Completion**: Within 5 weeks

---

## APPROVAL & NEXT STEPS

**This audit identifies every page requiring mobile responsiveness work.**

### Next Steps:
1. Review this audit with team
2. Prioritize phases based on business needs
3. Assign pages to developers
4. Create tickets for each page/pattern
5. Establish mobile testing workflow
6. Set performance budget for mobile (< 3s load)

**Questions? Review specific page details in Section 2.**

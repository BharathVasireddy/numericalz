# Numericalz Design System

## 🎨 Overview

The Numericalz Design System provides comprehensive design guidelines, UI components, and styling standards for creating a consistent, professional, and accessible user experience across the accounting firm management platform.

## 🎯 Design Principles

### Professional & Trustworthy
- Clean, minimal design that instills confidence
- Professional color palette suitable for financial services
- Clear hierarchy and readable typography
- Consistent spacing and alignment

### User-Centered
- Intuitive navigation and workflows
- Accessible to users of all abilities
- Mobile-first responsive design
- Fast loading and smooth interactions

### Efficient & Productive
- Quick access to common tasks
- Clear visual feedback for actions
- Minimal cognitive load
- Keyboard shortcuts and navigation

## 🎨 Color Palette

### Primary Colors
```css
:root {
  /* Primary Blue - Professional & Trustworthy */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6; /* Main Primary */
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;
  --color-primary-950: #172554;
}
```

### Secondary Colors
```css
:root {
  /* Slate - Professional Grays */
  --color-secondary-50: #f8fafc;
  --color-secondary-100: #f1f5f9;
  --color-secondary-200: #e2e8f0;
  --color-secondary-300: #cbd5e1;
  --color-secondary-400: #94a3b8;
  --color-secondary-500: #64748b; /* Main Secondary */
  --color-secondary-600: #475569;
  --color-secondary-700: #334155;
  --color-secondary-800: #1e293b;
  --color-secondary-900: #0f172a;
  --color-secondary-950: #020617;
}
```

### Status Colors
```css
:root {
  /* Success - Green */
  --color-success-50: #f0fdf4;
  --color-success-100: #dcfce7;
  --color-success-500: #22c55e;
  --color-success-600: #16a34a;
  --color-success-700: #15803d;

  /* Warning - Yellow */
  --color-warning-50: #fffbeb;
  --color-warning-100: #fef3c7;
  --color-warning-500: #f59e0b;
  --color-warning-600: #d97706;
  --color-warning-700: #b45309;

  /* Danger - Red */
  --color-danger-50: #fef2f2;
  --color-danger-100: #fee2e2;
  --color-danger-500: #ef4444;
  --color-danger-600: #dc2626;
  --color-danger-700: #b91c1c;

  /* Info - Blue */
  --color-info-50: #eff6ff;
  --color-info-100: #dbeafe;
  --color-info-500: #3b82f6;
  --color-info-600: #2563eb;
  --color-info-700: #1d4ed8;
}
```

### Neutral Colors
```css
:root {
  /* Text Colors */
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #64748b;
  --color-text-disabled: #94a3b8;
  --color-text-inverse: #ffffff;

  /* Background Colors */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f8fafc;
  --color-bg-tertiary: #f1f5f9;
  --color-bg-inverse: #0f172a;

  /* Border Colors */
  --color-border-primary: #e2e8f0;
  --color-border-secondary: #cbd5e1;
  --color-border-focus: #3b82f6;
}
```

## 📝 Typography

### Font Family
```css
:root {
  --font-family-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### Font Scale
```css
:root {
  /* Font Sizes */
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */
  --font-size-5xl: 3rem;      /* 48px */

  /* Font Weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Line Heights */
  --line-height-tight: 1.25;
  --line-height-snug: 1.375;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;
  --line-height-loose: 2;
}
```

### Typography Classes
```css
/* Headings */
.text-h1 {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  color: var(--color-text-primary);
}

.text-h2 {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  color: var(--color-text-primary);
}

.text-h3 {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-snug);
  color: var(--color-text-primary);
}

.text-h4 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-snug);
  color: var(--color-text-primary);
}

/* Body Text */
.text-body-lg {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-relaxed);
}

.text-body {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-normal);
}

.text-body-sm {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-normal);
}

/* Labels & Captions */
.text-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-normal);
}

.text-caption {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-normal);
  color: var(--color-text-muted);
}
```

## 📏 Spacing System

### Spacing Scale
```css
:root {
  --spacing-0: 0;
  --spacing-1: 0.25rem;   /* 4px */
  --spacing-2: 0.5rem;    /* 8px */
  --spacing-3: 0.75rem;   /* 12px */
  --spacing-4: 1rem;      /* 16px */
  --spacing-5: 1.25rem;   /* 20px */
  --spacing-6: 1.5rem;    /* 24px */
  --spacing-8: 2rem;      /* 32px */
  --spacing-10: 2.5rem;   /* 40px */
  --spacing-12: 3rem;     /* 48px */
  --spacing-16: 4rem;     /* 64px */
  --spacing-20: 5rem;     /* 80px */
  --spacing-24: 6rem;     /* 96px */
}
```

### Layout Spacing
```css
:root {
  /* Container Max Widths */
  --container-sm: 640px;
  --container-md: 768px;
  --container-lg: 1024px;
  --container-xl: 1280px;
  --container-2xl: 1536px;

  /* Common Layout Spacing */
  --page-padding: var(--spacing-6);
  --section-spacing: var(--spacing-12);
  --card-padding: var(--spacing-6);
  --button-padding-x: var(--spacing-4);
  --button-padding-y: var(--spacing-3);
}
```

## 🧩 Component Library

### Button Components

#### Primary Button
```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--button-padding-y) var(--button-padding-x);
  background-color: var(--color-primary-500);
  color: white;
  border: none;
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  min-height: 44px; /* Accessibility - minimum touch target */
}

.btn-primary:hover {
  background-color: var(--color-primary-600);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.btn-primary:focus {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

.btn-primary:disabled {
  background-color: var(--color-secondary-300);
  color: var(--color-text-disabled);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
```

#### Secondary Button
```css
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--button-padding-y) var(--button-padding-x);
  background-color: transparent;
  color: var(--color-primary-500);
  border: 1px solid var(--color-primary-500);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  min-height: 44px;
}

.btn-secondary:hover {
  background-color: var(--color-primary-50);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}
```

#### Ghost Button
```css
.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--button-padding-y) var(--button-padding-x);
  background-color: transparent;
  color: var(--color-text-secondary);
  border: none;
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  min-height: 44px;
}

.btn-ghost:hover {
  background-color: var(--color-secondary-100);
  color: var(--color-text-primary);
}
```

### Form Components

#### Input Field
```css
.input-field {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4);
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  font-family: var(--font-family-primary);
  color: var(--color-text-primary);
  transition: all 0.2s ease-in-out;
  min-height: 44px;
}

.input-field:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-field:disabled {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.input-field.error {
  border-color: var(--color-danger-500);
}

.input-field.error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
```

#### Select Field
```css
.select-field {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4);
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  font-family: var(--font-family-primary);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  min-height: 44px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 12px center;
  background-repeat: no-repeat;
  background-size: 16px;
  padding-right: 40px;
}

.select-field:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

#### Textarea Field
```css
.textarea-field {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4);
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  font-family: var(--font-family-primary);
  color: var(--color-text-primary);
  resize: vertical;
  transition: all 0.2s ease-in-out;
  min-height: 100px;
}

.textarea-field:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

### Card Components

#### Basic Card
```css
.card {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--card-padding);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease-in-out;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}
```

#### Client Card
```css
.client-card {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-6);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease-in-out;
  cursor: pointer;
}

.client-card:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  transform: translateY(-4px);
  border-color: var(--color-primary-200);
}

/* Client card header */
.client-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-4);
}

.client-card-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.client-card-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin: var(--spacing-1) 0 0 0;
}

/* Client card content */
.client-card-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.client-card-field {
  display: flex;
  flex-direction: column;
}

.client-card-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-1);
}

.client-card-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

/* Client card footer */
.client-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--color-border-primary);
}
```

### Status Components

#### Badge Component
```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-success {
  background-color: var(--color-success-100);
  color: var(--color-success-700);
}

.badge-warning {
  background-color: var(--color-warning-100);
  color: var(--color-warning-700);
}

.badge-danger {
  background-color: var(--color-danger-100);
  color: var(--color-danger-700);
}

.badge-info {
  background-color: var(--color-info-100);
  color: var(--color-info-700);
}

.badge-neutral {
  background-color: var(--color-secondary-100);
  color: var(--color-secondary-700);
}
```

#### Status Indicator
```css
.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.status-indicator::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.active::before {
  background-color: var(--color-success-500);
}

.status-indicator.pending::before {
  background-color: var(--color-warning-500);
}

.status-indicator.overdue::before {
  background-color: var(--color-danger-500);
}

.status-indicator.completed::before {
  background-color: var(--color-info-500);
}
```

## 📐 Layout System

### Border Radius
```css
:root {
  --border-radius-none: 0;
  --border-radius-sm: 0.125rem;   /* 2px */
  --border-radius-md: 0.375rem;   /* 6px */
  --border-radius-lg: 0.5rem;     /* 8px */
  --border-radius-xl: 0.75rem;    /* 12px */
  --border-radius-2xl: 1rem;      /* 16px */
  --border-radius-full: 9999px;
}
```

### Shadows
```css
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
  --shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.25);
  --shadow-inner: inset 0 2px 4px rgba(0, 0, 0, 0.06);
}
```

### Grid System
```css
.container {
  width: 100%;
  max-width: var(--container-xl);
  margin: 0 auto;
  padding: 0 var(--page-padding);
}

.grid {
  display: grid;
  gap: var(--spacing-6);
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
.grid-cols-12 { grid-template-columns: repeat(12, 1fr); }

/* Responsive Grid */
@media (min-width: 768px) {
  .md\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
  .md\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
  .md\:grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
  .lg\:grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
  .lg\:grid-cols-6 { grid-template-columns: repeat(6, 1fr); }
}
```

## 🎭 Animation & Transitions

### Timing Functions
```css
:root {
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### Animation Classes
```css
.animate-fade-in {
  animation: fadeIn 0.3s var(--ease-out);
}

.animate-slide-up {
  animation: slideUp 0.3s var(--ease-out);
}

.animate-scale-in {
  animation: scaleIn 0.2s var(--ease-bounce);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

### Hover Effects
```css
.hover-lift {
  transition: transform 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out);
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.hover-scale {
  transition: transform 0.2s var(--ease-out);
}

.hover-scale:hover {
  transform: scale(1.05);
}
```

## 📱 Responsive Design

### Breakpoints
```css
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}

/* Mobile First Media Queries */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

### Responsive Utilities
```css
/* Display */
.hidden { display: none; }
.block { display: block; }
.flex { display: flex; }
.grid { display: grid; }

@media (min-width: 768px) {
  .md\:hidden { display: none; }
  .md\:block { display: block; }
  .md\:flex { display: flex; }
  .md\:grid { display: grid; }
}

/* Text Alignment */
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }

@media (min-width: 768px) {
  .md\:text-left { text-align: left; }
  .md\:text-center { text-align: center; }
  .md\:text-right { text-align: right; }
}
```

## ♿ Accessibility

### Focus States
```css
.focus-ring {
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.focus-ring:focus {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

.focus-ring-inset:focus {
  outline: 2px solid var(--color-primary-500);
  outline-offset: -2px;
}
```

### Screen Reader Only
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Color Contrast
All color combinations meet WCAG 2.1 AA standards:
- Text on background: minimum 4.5:1 ratio
- Large text (18pt+): minimum 3:1 ratio
- Interactive elements: minimum 3:1 ratio

## 🎯 Component Usage Examples

### Client Card Example
```html
<div class="client-card">
  <div class="client-card-header">
    <div>
      <h3 class="client-card-title">Example Ltd</h3>
      <p class="client-card-subtitle">Company #12345678</p>
    </div>
    <span class="badge badge-success">Active</span>
  </div>
  
  <div class="client-card-content">
    <div class="client-card-field">
      <span class="client-card-label">Contact</span>
      <span class="client-card-value">John Director</span>
    </div>
    <div class="client-card-field">
      <span class="client-card-label">Year End</span>
      <span class="client-card-value">31 Mar 2024</span>
    </div>
    <div class="client-card-field">
      <span class="client-card-label">Next Due</span>
      <span class="client-card-value">31 Dec 2024</span>
    </div>
    <div class="client-card-field">
      <span class="client-card-label">Assigned To</span>
      <span class="client-card-value">Jane Accountant</span>
    </div>
  </div>
  
  <div class="client-card-footer">
    <span class="status-indicator active">Active</span>
    <button class="btn-ghost">View Details</button>
  </div>
</div>
```

### Form Example
```html
<form class="space-y-6">
  <div>
    <label for="company-name" class="text-label">Company Name</label>
    <input type="text" id="company-name" class="input-field mt-2" placeholder="Enter company name">
  </div>
  
  <div>
    <label for="company-type" class="text-label">Company Type</label>
    <select id="company-type" class="select-field mt-2">
      <option value="">Select type</option>
      <option value="LTD">Limited Company</option>
      <option value="NON_LTD">Non-Limited</option>
    </select>
  </div>
  
  <div>
    <label for="notes" class="text-label">Additional Notes</label>
    <textarea id="notes" class="textarea-field mt-2" placeholder="Any additional information..."></textarea>
  </div>
  
  <div class="flex gap-4 justify-end">
    <button type="button" class="btn-secondary">Cancel</button>
    <button type="submit" class="btn-primary">Save Client</button>
  </div>
</form>
```

## 🔄 Design Tokens Integration

### CSS Custom Properties Usage
```css
/* Use design tokens for consistency */
.custom-component {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  padding: var(--spacing-4);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s var(--ease-in-out);
}

/* Dark mode support (future) */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-primary: #0f172a;
    --color-text-primary: #f8fafc;
    /* ... other dark mode tokens */
  }
}
```

## 📚 Component Documentation

Each component should include:
- **Purpose**: What the component is used for
- **Props/Attributes**: Available configuration options  
- **States**: Different visual states (default, hover, focus, disabled)
- **Accessibility**: ARIA attributes and keyboard support
- **Examples**: Code examples showing usage
- **Do's and Don'ts**: Best practices and common mistakes

## 🎨 Design File Resources

- **Figma Design System**: [Link to Figma file]
- **Icon Library**: Heroicons v2.0 (outline and solid variants)
- **Logo Assets**: Available in `/public/assets/logos/`
- **Brand Guidelines**: Complete brand guidelines document

---

This design system ensures consistency, accessibility, and maintainability across the entire Numericalz application. All components are built with flexibility in mind while maintaining a cohesive visual language that instills trust and professionalism. 
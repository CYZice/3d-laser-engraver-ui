# Kiosk Transformation Architecture Plan

## 1. 影响范围分析 (Impact Analysis)

### Core Logic
- **[MOD] `src/store/useAppStore.ts`**:
  - Add steps: `ATTRACT`, `CAPTURE`, `PAYMENT`.
  - Update `reset` to return to `ATTRACT`.
- **[MOD] `src/App.tsx`**:
  - Remove `AntD Layout` (Header/Footer).
  - Implement Fullscreen Layout.
  - Add Global Idle Timeout Logic.
  - Update Step Routing.

### New Components
- **[NEW] `src/components/AttractScreen/index.tsx`**: Video/Animation loop.
- **[NEW] `src/components/CameraCapture/index.tsx`**: Webcam integration.
- **[NEW] `src/components/PaymentMock/index.tsx`**: QR Code & Timer.
- **[NEW] `src/components/ResultTicket/index.tsx`**: Order ID display (replaces `ResultPreview` for Kiosk).

### Existing Components (Minor Tweaks)
- **[MOD] `src/components/ImageEditor/index.tsx`**: Optimize for touch (larger buttons).
- **[MOD] `src/components/ProcessingStatus/index.tsx`**: Update text/visuals.

---

## 2. 接口定义 (Interface Definitions)

### Store Updates (`useAppStore.ts`)
```typescript
export type AppStep = 
  | 'ATTRACT'   // New: Idle video
  | 'CAPTURE'   // New: Camera
  | 'UPLOAD'    // Keep: Fallback
  | 'EDIT'      // Keep: Cropper
  | 'PAYMENT'   // New: Mock Payment
  | 'PROCESSING'// Keep: Uploading
  | 'RESULT';   // Keep: Ticket

interface AppState {
  // ... existing state
  orderId: string | null; // New: For ticket
  setOrderId: (id: string) => void;
}
```

### Component Props
- **AttractScreen**: `onStart: () => void`
- **CameraCapture**: `onCapture: (file: File) => void`, `onBack: () => void`
- **PaymentMock**: `onPaymentSuccess: () => void`, `amount: number`
- **ResultTicket**: `orderId: string`, `onDone: () => void`

---

## 3. 实施步骤 (Task List)

1.  **[Step 1] Update Store**: Modify `src/store/useAppStore.ts` to include new steps (`ATTRACT`, `CAPTURE`, `PAYMENT`) and the `orderId` field.
2.  **[Step 2] Create AttractScreen**: Implement `src/components/AttractScreen/index.tsx` with a simple animation/video placeholder.
3.  **[Step 3] Create CameraCapture**: Implement `src/components/CameraCapture/index.tsx` using `react-webcam`.
4.  **[Step 4] Create PaymentMock**: Implement `src/components/PaymentMock/index.tsx` with a simulated timeout.
5.  **[Step 5] Create ResultTicket**: Implement `src/components/ResultTicket/index.tsx`.
6.  **[Step 6] Refactor App.tsx**:
    -   Replace Layout with Kiosk container.
    -   Implement the new routing switch.
    -   Add `useIdleTimer` logic (reset after 60s inactivity).
7.  **[Step 7] Verify**: Run the app and test the full flow.

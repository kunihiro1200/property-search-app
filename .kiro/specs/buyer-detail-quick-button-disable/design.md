# Design Document

## Overview

This design implements a permanent button disable feature for quick action buttons on the buyer detail page. When a user clicks any of the six quick buttons, the button will be grayed out and remain disabled permanently for that specific buyer. The state is persisted using browser localStorage, ensuring the disabled state survives page refreshes, navigation, and browser restarts.

The implementation focuses on simplicity and reliability, using React hooks for state management and localStorage for persistence. Each buyer's button states are stored independently using their buyer ID as the key.

## Architecture

### Component Structure

```
BuyerDetailPage
  └── FrequentlyAskedSection
        └── QuickButton (x6)
              ├── useQuickButtonState (custom hook)
              └── localStorage persistence
```

### Data Flow

1. **Initial Load**: Component reads button states from localStorage using buyer ID
2. **Button Click**: Updates local state and immediately persists to localStorage
3. **State Persistence**: Each button state is stored as a boolean flag per buyer
4. **State Restoration**: On component mount, states are restored from localStorage

### Storage Schema

```typescript
// localStorage key format
`buyer_${buyerId}_quick_buttons`

// Storage value structure
{
  "初見か": true,
  "希望時期": false,
  "駐車場希望台数": false,
  "リフォーム込みの予算（最高額）": false,
  "持ち家か": false,
  "他に気になる物件はあるか？": false
}
```

## Components and Interfaces

### Custom Hook: useQuickButtonState

```typescript
interface QuickButtonStates {
  [buttonLabel: string]: boolean;
}

interface UseQuickButtonStateReturn {
  isDisabled: (buttonLabel: string) => boolean;
  disableButton: (buttonLabel: string) => void;
}

function useQuickButtonState(buyerId: string): UseQuickButtonStateReturn {
  // Manages button states for a specific buyer
  // Handles localStorage read/write operations
  // Returns state query and mutation functions
}
```

### Component: QuickButton

```typescript
interface QuickButtonProps {
  label: string;
  onClick: () => void;
  buyerId: string;
  disabled?: boolean;
}

// Enhanced to support permanent disable state
// Integrates with useQuickButtonState hook
// Provides visual feedback for disabled state
```

### LocalStorage Service

```typescript
interface ButtonStateStorage {
  saveButtonState(buyerId: string, buttonLabel: string, disabled: boolean): void;
  getButtonStates(buyerId: string): QuickButtonStates;
  clearButtonStates(buyerId: string): void; // For future admin functionality
}
```

## Data Models

### Button State Model

```typescript
type ButtonLabel = 
  | "初見か"
  | "希望時期"
  | "駐車場希望台数"
  | "リフォーム込みの予算（最高額）"
  | "持ち家か"
  | "他に気になる物件はあるか？";

interface ButtonState {
  label: ButtonLabel;
  disabled: boolean;
  disabledAt?: Date; // Optional: track when button was disabled
}

interface BuyerButtonStates {
  buyerId: string;
  buttons: Record<ButtonLabel, boolean>;
  lastUpdated: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Button Click Disables State

*For any* quick button and any buyer, when the button is clicked, the button state should change to disabled and prevent further clicks.

**Validates: Requirements 1.1, 1.3**

### Property 2: LocalStorage Round Trip Persistence

*For any* quick button, buyer ID, and disabled state, storing the state to localStorage and then reading it back should return the same state, regardless of page navigation, refresh, or browser restart simulation.

**Validates: Requirements 1.2, 3.1, 3.2, 3.3, 3.4**

### Property 3: Independent Button State Management

*For any* set of quick buttons for a buyer, disabling one button should not affect the enabled/disabled state of any other button.

**Validates: Requirements 1.5**

### Property 4: Buyer State Isolation

*For any* two different buyers, the button states for one buyer should not affect or interfere with the button states of another buyer.

**Validates: Requirements 3.5**

### Property 5: Visual Feedback Consistency

*For any* quick button in disabled state, the button should display consistent visual feedback including reduced opacity, non-clickable cursor, and tooltip on hover.

**Validates: Requirements 1.4, 4.1, 4.2, 4.3**

### Property 6: Consistent Styling Across Buttons

*For any* quick button, the visual styling in both enabled and disabled states should be consistent with all other quick buttons.

**Validates: Requirements 2.2**

### Property 7: Accessibility Compliance

*For any* quick button in any state (enabled or disabled), the color contrast ratio should meet WCAG accessibility standards.

**Validates: Requirements 4.4**

## Error Handling

### LocalStorage Errors

**Scenario**: localStorage is unavailable or quota exceeded

**Handling**:
- Gracefully degrade to in-memory state management
- Log warning to console
- Display user-friendly message if persistence fails
- Button functionality continues to work within the current session

**Implementation**:
```typescript
try {
  localStorage.setItem(key, value);
} catch (error) {
  console.warn('Failed to persist button state:', error);
  // Fall back to in-memory state
  inMemoryState[key] = value;
}
```

### Invalid Buyer ID

**Scenario**: Buyer ID is null, undefined, or invalid

**Handling**:
- Skip localStorage operations
- Use temporary in-memory state
- Log warning for debugging
- Prevent application crash

### Corrupted LocalStorage Data

**Scenario**: localStorage contains invalid JSON or unexpected data structure

**Handling**:
- Clear corrupted data for that buyer
- Initialize with default state (all buttons enabled)
- Log error for monitoring
- Continue normal operation

### Missing Button Labels

**Scenario**: Button label doesn't match expected values

**Handling**:
- Validate button labels against known set
- Ignore unknown button labels
- Log warning for debugging
- Prevent state corruption

## Testing Strategy

### Unit Tests

Unit tests will focus on specific examples and edge cases:

1. **Button Click Behavior**
   - Test single button click disables the button
   - Test disabled button ignores subsequent clicks
   - Test button click triggers localStorage save

2. **LocalStorage Operations**
   - Test saving button state with valid buyer ID
   - Test loading button state with valid buyer ID
   - Test handling of missing localStorage data
   - Test handling of corrupted localStorage data

3. **Edge Cases**
   - Test with null/undefined buyer ID
   - Test with empty button label
   - Test with localStorage quota exceeded
   - Test with localStorage unavailable

4. **Visual Feedback**
   - Test disabled button has correct CSS classes
   - Test disabled button has reduced opacity
   - Test disabled button has correct cursor style
   - Test tooltip appears on hover

### Property-Based Tests

Property tests will verify universal properties across all inputs using a minimum of 100 iterations per test:

1. **Property Test: Button State Persistence**
   - **Feature: buyer-detail-quick-button-disable, Property 2: LocalStorage Round Trip Persistence**
   - Generate random buyer IDs and button labels
   - Disable buttons and verify state persists across simulated page reloads
   - Verify reading from localStorage returns exact state that was written

2. **Property Test: State Independence**
   - **Feature: buyer-detail-quick-button-disable, Property 3: Independent Button State Management**
   - Generate random combinations of enabled/disabled buttons
   - Verify disabling one button doesn't affect others
   - Test with all possible button combinations

3. **Property Test: Buyer Isolation**
   - **Feature: buyer-detail-quick-button-disable, Property 4: Buyer State Isolation**
   - Generate multiple random buyer IDs with different button states
   - Verify states don't interfere with each other
   - Test concurrent state updates for different buyers

4. **Property Test: Visual Consistency**
   - **Feature: buyer-detail-quick-button-disable, Property 6: Consistent Styling Across Buttons**
   - Generate random button states
   - Verify all buttons in same state have identical styling
   - Test across all six button types

5. **Property Test: Accessibility**
   - **Feature: buyer-detail-quick-button-disable, Property 7: Accessibility Compliance**
   - Generate random color combinations for button states
   - Calculate contrast ratios
   - Verify all combinations meet WCAG AA standards (4.5:1 for normal text)

### Integration Tests

Integration tests will verify the feature works correctly within the buyer detail page:

1. Test button disable persists when navigating to different buyer
2. Test button disable persists when refreshing page
3. Test multiple buttons can be disabled independently
4. Test button states are isolated between different buyers

### Testing Configuration

- All property tests configured to run minimum 100 iterations
- Each test tagged with feature name and property reference
- Tests run in both development and CI environments
- Coverage target: 90% for new code

## Implementation Notes

### Performance Considerations

- **LocalStorage Access**: Minimize localStorage reads/writes by batching updates
- **State Updates**: Use React's batching for multiple button state changes
- **Memory Usage**: Clear old buyer states from memory when navigating away

### Browser Compatibility

- **LocalStorage Support**: All modern browsers (IE11+)
- **Fallback Strategy**: In-memory state for browsers without localStorage
- **Storage Limits**: Typical 5-10MB limit, our usage is minimal (~1KB per buyer)

### Future Enhancements

Potential future improvements (not in current scope):

1. **Admin Reset**: Allow administrators to reset button states for a buyer
2. **Expiration**: Add optional expiration time for button states
3. **Sync**: Sync button states across devices via backend API
4. **Analytics**: Track which buttons are used most frequently
5. **Undo**: Allow users to re-enable a button within a short time window

### Migration Strategy

Since this is a new feature with no existing data:

1. No database migration required
2. No API changes required
3. Frontend-only implementation
4. Gradual rollout possible via feature flag
5. No impact on existing functionality


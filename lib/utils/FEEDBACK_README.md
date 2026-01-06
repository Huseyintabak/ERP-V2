# 🔊 Feedback System Documentation

## Overview
The feedback system provides audio, haptic (vibration), and visual feedback for user interactions, particularly for barcode scanning operations. This enhances user experience by providing instant, multi-sensory confirmation of actions.

## Features

### 1. **Audio Feedback** 🔉
- **Success Sound**: High-pitched pleasant beep (800Hz, 150ms)
- **Error Sound**: Low-pitched double beep (300Hz + 250Hz)
- **Warning Sound**: Medium-pitched quick beep (600Hz, 100ms)
- **Info Sound**: Soft high beep (1000Hz, 80ms)
- **Transfer Success**: Ascending melody (600Hz → 800Hz → 1000Hz)

### 2. **Haptic Feedback** 📳
- **Success**: Single short vibration (50ms)
- **Error**: Double vibration with pause (100ms, 50ms, 100ms)
- **Warning**: Two quick vibrations (50ms, 50ms, 50ms)
- **Info**: Very short vibration (30ms)
- **Transfer**: Triple vibration pattern (50ms, 30ms, 50ms, 30ms, 50ms)

### 3. **Visual Feedback** ✨
- **Success**: Green flash (rgba(34, 197, 94, 0.3))
- **Error**: Red flash (rgba(239, 68, 68, 0.3))
- **Warning**: Orange flash (rgba(251, 146, 60, 0.3))
- **Info**: Blue flash (rgba(59, 130, 246, 0.3))
- **Transfer Success**: Bright green flash (rgba(34, 197, 94, 0.4))

## Usage

### Basic Usage

```typescript
import { provideFeedback } from '@/lib/utils/feedback';

// Generic feedback
provideFeedback('success'); // Success feedback
provideFeedback('error');   // Error feedback
provideFeedback('warning'); // Warning feedback
provideFeedback('info');    // Info feedback
```

### Specific Operation Feedback

```typescript
import { 
  scanSuccess, 
  scanError, 
  transferSuccess,
  stockUpdateSuccess 
} from '@/lib/utils/feedback';

// Barcode scan success
scanSuccess();

// Barcode scan error
scanError();

// Successful transfer
transferSuccess();

// Stock update success
stockUpdateSuccess();
```

### Customizing Feedback Options

```typescript
import { provideFeedback } from '@/lib/utils/feedback';

// Disable specific feedback types
provideFeedback('success', {
  sound: true,      // Play sound
  vibration: false, // No vibration
  visual: true      // Show flash
});

// Only sound feedback
provideFeedback('error', {
  sound: true,
  vibration: false,
  visual: false
});
```

### Global Enable/Disable

```typescript
import { 
  setFeedbackEnabled, 
  isFeedbackEnabled,
  provideFeedbackIfEnabled 
} from '@/lib/utils/feedback';

// Disable all feedback globally
setFeedbackEnabled(false);

// Enable feedback
setFeedbackEnabled(true);

// Check if enabled
const isEnabled = isFeedbackEnabled();

// Provide feedback only if globally enabled
provideFeedbackIfEnabled('success');
```

## Browser Support

### Audio Feedback
- **Requires**: Web Audio API
- **Supported**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Fallback**: Silently fails if not supported

### Haptic Feedback
- **Requires**: Navigator Vibration API
- **Supported**: Most mobile browsers, some desktop browsers
- **Fallback**: Silently fails if not supported

### Visual Feedback
- **Requires**: DOM manipulation
- **Supported**: All browsers
- **Fallback**: None needed

### Check Support

```typescript
import { isFeedbackSupported } from '@/lib/utils/feedback';

const support = isFeedbackSupported();
console.log('Audio supported:', support.audio);
console.log('Vibration supported:', support.vibration);
```

## Implementation Examples

### Barcode Scanning Page

```typescript
import { scanSuccess, scanError } from '@/lib/utils/feedback';

const handleScan = async (barcode: string) => {
  try {
    const response = await fetch(`/api/barcode/lookup?barcode=${barcode}`);
    
    if (response.ok) {
      scanSuccess(); // ✅ Beep + Vibration + Green Flash
      toast.success('Barkod bulundu!');
    } else {
      scanError(); // ❌ Error beep + Vibration + Red Flash
      toast.error('Barkod bulunamadı');
    }
  } catch (error) {
    scanError();
    toast.error('Hata oluştu');
  }
};
```

### Transfer Operation

```typescript
import { transferSuccess, scanError } from '@/lib/utils/feedback';

const handleTransfer = async () => {
  try {
    const response = await fetch('/api/warehouse/transfer', {
      method: 'POST',
      body: JSON.stringify(transferData)
    });
    
    if (response.ok) {
      transferSuccess(); // 🎵 Melody + Triple vibration + Bright green flash
      toast.success('Transfer tamamlandı! 🎉');
    } else {
      scanError();
      toast.error('Transfer başarısız');
    }
  } catch (error) {
    scanError();
    toast.error('Hata oluştu');
  }
};
```

### User Settings Integration

```typescript
import { setFeedbackEnabled } from '@/lib/utils/feedback';
import { Switch } from '@/components/ui/switch';

function SettingsPage() {
  const [feedbackEnabled, setFeedbackEnabledState] = useState(true);
  
  const handleToggle = (enabled: boolean) => {
    setFeedbackEnabledState(enabled);
    setFeedbackEnabled(enabled); // Update global setting
  };
  
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={feedbackEnabled}
        onCheckedChange={handleToggle}
      />
      <Label>🔊 Ses & Titreşim</Label>
    </div>
  );
}
```

## Performance Considerations

1. **Lazy Audio Context**: Audio context is created only when first needed
2. **Minimal DOM Manipulation**: Flash elements are created and destroyed efficiently
3. **No Memory Leaks**: All resources are properly cleaned up
4. **Graceful Degradation**: Failures in feedback don't affect main functionality

## Best Practices

### ✅ DO
- Use `scanSuccess()` for successful barcode reads
- Use `scanError()` for failed barcode reads or errors
- Use `transferSuccess()` for completed transfers (more celebratory)
- Use `provideFeedback('info')` for informational events
- Allow users to disable feedback in settings
- Test on mobile devices for best haptic experience

### ❌ DON'T
- Don't provide feedback for every minor UI interaction
- Don't use error feedback for warnings (use 'warning' type)
- Don't block UI while playing feedback
- Don't forget to provide visual alternatives for accessibility

## Accessibility

- **Visual Feedback**: Ensures users who can't hear get confirmation
- **Audio Feedback**: Helps users who may not notice visual changes
- **Haptic Feedback**: Provides confirmation without looking at screen
- **User Control**: Allow users to disable any/all feedback types

## Troubleshooting

### Audio Not Playing
- Check browser supports Web Audio API
- Ensure user has interacted with page (autoplay policy)
- Check device is not muted
- Try clicking anywhere on page first to initialize audio context

### Vibration Not Working
- Check device supports vibration (mainly mobile)
- Check browser permissions
- Ensure site is served over HTTPS (required for some features)

### Visual Flash Not Showing
- Check browser console for errors
- Ensure no CSS conflicts with z-index
- Verify DOM manipulation is allowed

## Future Enhancements

- [ ] Custom sound files support
- [ ] Configurable feedback patterns
- [ ] Persistent user preferences (localStorage)
- [ ] Advanced haptic patterns (iOS Taptic Engine)
- [ ] Accessibility mode with enhanced feedback
- [ ] Analytics for feedback usage

## License

Part of Thunder ERP system - Internal use only
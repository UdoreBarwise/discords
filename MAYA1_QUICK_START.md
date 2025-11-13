# Maya1 TTS Quick Start Guide

## Voice Connection Issue Fix

The voice connection error has been improved with:
- Better error messages showing the exact issue
- Automatic disconnection from old channels
- Channel full detection
- Better permission checking

**If you still get connection errors, check:**
1. Bot has "Connect" and "Speak" permissions in the voice channel
2. Channel is not full (if it has a user limit)
3. Bot is not already stuck in another voice channel (try `/voice leave` first)

## Maya1 TTS Installation

### Quick Setup (Windows)

1. **Open PowerShell/CMD in the project root**

2. **Navigate to Maya1 server:**
   ```powershell
   cd backend\maya1-tts-server
   ```

3. **Create virtual environment:**
   ```powershell
   python -m venv venv
   venv\Scripts\activate
   ```

4. **Install dependencies:**
   
   **Auto-detect (recommended - will use best available GPU):**
   ```powershell
   pip install -r requirements.txt
   ```
   
   The server will automatically detect and use:
   - **NVIDIA GPU (CUDA)** if available - fastest (Windows & Linux)
   - **AMD GPU (ROCm)** if available - fast (Linux only)
   - **CPU** if no GPU or AMD on Windows - slower but works
   
   **Important:** ROCm (AMD GPU acceleration) is **Linux-only**. On Windows, AMD GPUs will use CPU.
   
   **For maximum performance, install GPU-specific PyTorch first:**
   ```powershell
   # NVIDIA GPU (Windows & Linux)
   pip install torch --index-url https://download.pytorch.org/whl/cu121
   
   # AMD GPU (Linux only - ROCm doesn't work on Windows)
   pip install torch --index-url https://download.pytorch.org/whl/rocm5.7
   
   # Then install rest
   pip install -r requirements.txt
   ```

5. **Test the server:**
   ```powershell
   python app.py
   ```

   You should see:
   ```
   [Maya1] Starting Maya1 TTS server on http://127.0.0.1:5002
   [Maya1] Loading model...
   [Maya1] Using device: cuda  # or cpu
   [Maya1] Model loaded successfully!
   ```

6. **Enable in your bot:**
   
   Create or edit `backend/.env`:
   ```env
   USE_MAYA1_TTS=true
   ```

7. **Restart your bot**

### What Happens on First Run

- Model downloads automatically (~6GB, takes 5-10 minutes)
- Model is cached for future use
- First request may be slow as model loads into memory

### Requirements

- **Python 3.8+** (download from python.org)
- **GPU (optional but recommended):**
  - NVIDIA: 16GB+ VRAM (RTX 3090, RTX 4090, etc.)
  - AMD: ROCm-compatible GPU (RX 6000/7000 series)
  - CPU: Works but 10-20x slower
- **~6GB disk space** for the model

### Troubleshooting

**"Python not found"**
- Make sure Python is installed and in PATH
- Try `python3` instead of `python`

**GPU issues or "CUDA out of memory"**
- Server automatically falls back to CPU if GPU unavailable
- **AMD on Windows**: Will always use CPU (ROCm is Linux-only)
- **AMD on Linux**: Install ROCm for GPU acceleration, otherwise uses CPU
- **NVIDIA**: CPU mode works, or use a GPU with more VRAM

**"Model download failed"**
- Check internet connection
- Visit https://huggingface.co/maya-research/maya1 to verify access

**Voice connection still fails**
- Check bot permissions in Discord server settings
- Make sure the voice channel allows the bot to join
- Try disconnecting the bot from any other voice channels first

## Using Maya1

Once enabled, use the `/voice` command with optional voice description:

```
/voice channel:#general text:"Hello <laugh> this is amazing!" voice:"Male voice, warm tone, energetic"
```

**Emotion tags supported:**
- `<laugh>`, `<cry>`, `<whisper>`, `<angry>`, `<giggle>`, `<chuckle>`, `<gasp>`, `<sigh>`, and more!

**Voice description examples:**
- `"Male voice, warm tone"`
- `"Female, in her 20s, American accent, energetic"`
- `"Dark villain character, Male voice in their 40s with a British accent, low pitch"`

See `backend/maya1-tts-server/SETUP.md` for detailed documentation.


import { spawn, exec } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

const processes = []
let isShuttingDown = false

function spawnProcess(name, command, args, cwd) {
  const proc = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
    detached: false,
  })

  proc.on('error', (error) => {
    if (!isShuttingDown) {
      console.error(`Error starting ${name}:`, error)
    }
  })

  proc.on('exit', (code) => {
    if (!isShuttingDown && code !== 0 && code !== null) {
      console.error(`${name} exited with code ${code}`)
    }
  })

  processes.push({ name, proc, pid: proc.pid })
  return proc
}

async function killProcessTree(pid) {
  if (process.platform === 'win32') {
    try {
      // Kill the process tree on Windows
      await execAsync(`taskkill /pid ${pid} /f /t`, { windowsHide: true })
    } catch (err) {
      // Process might already be dead, ignore
    }
  } else {
    try {
      // Kill the process tree on Unix
      await execAsync(`pkill -P ${pid}`)
      process.kill(pid, 'SIGTERM')
    } catch (err) {
      // Process might already be dead, ignore
    }
  }
}

async function killAllProcesses() {
  const killPromises = processes.map(async ({ name, proc, pid }) => {
    if (pid) {
      try {
        await killProcessTree(pid)
      } catch (err) {
        // Ignore errors
      }
    }
    // Also try to kill the process directly
    try {
      if (!proc.killed) {
        proc.kill('SIGTERM')
      }
    } catch (err) {
      // Ignore
    }
  })

  await Promise.all(killPromises)
  
  // Also kill any remaining node processes on the ports
  if (process.platform === 'win32') {
    try {
      // Kill processes on port 5000 (backend)
      await execAsync('netstat -ano | findstr :5000', { windowsHide: true })
        .then(({ stdout }) => {
          const lines = stdout.split('\n')
          const pids = new Set()
          lines.forEach(line => {
            const match = line.match(/\s+(\d+)\s*$/)
            if (match) pids.add(match[1])
          })
          pids.forEach(pid => {
            execAsync(`taskkill /pid ${pid} /f`, { windowsHide: true }).catch(() => {})
          })
        })
        .catch(() => {})
      
      // Kill processes on port 3000 (frontend)
      await execAsync('netstat -ano | findstr :3000', { windowsHide: true })
        .then(({ stdout }) => {
          const lines = stdout.split('\n')
          const pids = new Set()
          lines.forEach(line => {
            const match = line.match(/\s+(\d+)\s*$/)
            if (match) pids.add(match[1])
          })
          pids.forEach(pid => {
            execAsync(`taskkill /pid ${pid} /f`, { windowsHide: true }).catch(() => {})
          })
        })
        .catch(() => {})
    } catch (err) {
      // Ignore
    }
  }
}

// Handle Ctrl+C - exit immediately without confirmation
process.on('SIGINT', async () => {
  if (isShuttingDown) return
  isShuttingDown = true
  
  console.log('\nShutting down servers...')
  
  await killAllProcesses()
  
  // Give processes a moment to clean up
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  process.exit(0)
})

process.on('SIGTERM', async () => {
  if (isShuttingDown) return
  isShuttingDown = true
  
  await killAllProcesses()
  await new Promise(resolve => setTimeout(resolve, 1000))
  process.exit(0)
})

// Start frontend
spawnProcess('frontend', 'npm', ['run', 'dev'], join(rootDir, 'frontend'))

// Start backend
spawnProcess('backend', 'npm', ['run', 'dev'], join(rootDir, 'backend'))

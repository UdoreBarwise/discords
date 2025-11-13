import { useState } from 'react'
import { MdSupport, MdCode, MdCasino, MdSmartToy, MdSettings, MdVpnKey, MdPalette, MdInfo } from 'react-icons/md'
import { HiChevronDown, HiChevronUp } from 'react-icons/hi'
import './Help.css'

interface HelpSection {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  content: React.ReactNode
}

export default function Help() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    gettingStarted: true,
  })

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const helpSections: HelpSection[] = [
    {
      id: 'gettingStarted',
      title: 'Getting Started',
      icon: MdInfo,
      content: (
        <div className="help-content">
          <h3>Welcome to KaasBot</h3>
          <p>KaasBot is a comprehensive Discord bot management interface that allows you to configure and manage various bot features.</p>
          
          <h4>Quick Setup Steps:</h4>
          <ol>
            <li><strong>Configure Bot Token:</strong> Go to Settings → Bot Token and enter your Discord bot token</li>
            <li><strong>Customize Theme:</strong> Go to Settings → Theme to customize the interface appearance</li>
            <li><strong>Configure Features:</strong> Visit the General page to set up Tickets, Embed Builder, Dice Game, and AI features</li>
          </ol>

          <h4>Important Notes:</h4>
          <ul>
            <li>Your bot token is stored securely in the database</li>
            <li>All configurations are saved per Discord server (guild)</li>
            <li>Changes take effect immediately after saving</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'botToken',
      title: 'Bot Token Configuration',
      icon: MdVpnKey,
      content: (
        <div className="help-content">
          <h3>Setting Up Your Discord Bot Token</h3>
          <p>The bot token is required for the bot to connect to Discord and function properly.</p>

          <h4>How to Get a Bot Token:</h4>
          <ol>
            <li>Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer">Discord Developer Portal</a></li>
            <li>Create a new application or select an existing one</li>
            <li>Navigate to the "Bot" section</li>
            <li>Click "Reset Token" or "Copy" to get your token</li>
            <li>Paste it in Settings → Bot Token and click "Save Token"</li>
          </ol>

          <h4>Security:</h4>
          <ul>
            <li>The token is stored securely in the database</li>
            <li>Never share your bot token with anyone</li>
            <li>If your token is compromised, reset it immediately in the Discord Developer Portal</li>
            <li>You can delete the token from the interface if needed</li>
          </ul>

          <h4>Default Server:</h4>
          <p>You can set a default Discord server that will be pre-selected in all dropdowns throughout the application for convenience.</p>
        </div>
      ),
    },
    {
      id: 'ticketSystem',
      title: 'Ticket System',
      icon: MdSupport,
      content: (
        <div className="help-content">
          <h3>Discord Ticket System</h3>
          <p>The ticket system allows users to create private support channels by clicking a button.</p>

          <h4>Configuration Steps:</h4>
          <ol>
            <li>Go to General → Ticket System</li>
            <li>Select your Discord server</li>
            <li>Choose the channel where the ticket creation message will be posted</li>
            <li>Select a category where ticket channels will be created</li>
            <li>Configure who to mention when tickets are created (roles and/or users)</li>
            <li>Customize the ticket creation message (title, description, embed or plain text)</li>
            <li>Click "Save Configuration"</li>
          </ol>

          <h4>How It Works:</h4>
          <ul>
            <li>Users click the "Create Ticket" button in the configured channel</li>
            <li>A private channel is created in the specified category</li>
            <li>The ticket creator and mentioned roles/users can see and message in the ticket</li>
            <li>Users can close their own tickets using the "Close Ticket" button</li>
            <li>Closed tickets are logged with transcripts before deletion</li>
          </ul>

          <h4>Features:</h4>
          <ul>
            <li>Automatic channel creation with proper permissions</li>
            <li>Mention roles and users when tickets are created</li>
            <li>Ticket logging with message transcripts</li>
            <li>View ticket history and logs</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'embedBuilder',
      title: 'Embed Builder',
      icon: MdCode,
      content: (
        <div className="help-content">
          <h3>Discord Embed Builder</h3>
          <p>Create and send custom Discord embed messages with a visual preview.</p>

          <h4>How to Use:</h4>
          <ol>
            <li>Go to General → Embed Builder</li>
            <li>Select your Discord server and channel</li>
            <li>Fill in the embed fields:
              <ul>
                <li><strong>Title:</strong> Main heading of the embed</li>
                <li><strong>Description:</strong> Main content text</li>
                <li><strong>Color:</strong> Sidebar color (hex code)</li>
                <li><strong>Author:</strong> Optional author name, icon, and link</li>
                <li><strong>Thumbnail/Image:</strong> Optional images</li>
                <li><strong>Fields:</strong> Add multiple key-value pairs</li>
                <li><strong>Footer:</strong> Optional footer text</li>
                <li><strong>Timestamp:</strong> Show current time in embed</li>
              </ul>
            </li>
            <li>Preview your embed in real-time</li>
            <li>Click "Send Embed" to post it to the selected channel</li>
          </ol>

          <h4>Tips:</h4>
          <ul>
            <li>Use the preview to see how your embed will look before sending</li>
            <li>Fields can be inline (side by side) or full width</li>
            <li>Image URLs must be publicly accessible</li>
            <li>Color can be specified as hex code (e.g., #5865f2)</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'diceGame',
      title: 'Dice Game',
      icon: MdCasino,
      content: (
        <div className="help-content">
          <h3>Dice Game Feature</h3>
          <p>An interactive dice game where users can play against the bot.</p>

          <h4>Configuration:</h4>
          <ol>
            <li>Go to General → Dice Game</li>
            <li>Select your Discord server</li>
            <li>Toggle "Enable Dice Game" to activate the feature</li>
            <li>Optionally select a specific channel (leave empty for all channels)</li>
            <li>Set user cooldown (how long users must wait between games)</li>
            <li>Click "Save Configuration"</li>
          </ol>

          <h4>How to Play:</h4>
          <ul>
            <li>Users type <code>!dice</code> in Discord</li>
            <li>The bot creates a game interface with buttons</li>
            <li>Users choose who goes first (user or bot)</li>
            <li>Players take turns rolling dice</li>
            <li>First to reach the target score wins</li>
          </ul>

          <h4>Settings:</h4>
          <ul>
            <li><strong>Channel Restriction:</strong> Limit the game to specific channels</li>
            <li><strong>User Cooldown:</strong> Prevent spam by setting wait time between games (1-1440 minutes)</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'aiConfiguration',
      title: 'AI Configuration',
      icon: MdSmartToy,
      content: (
        <div className="help-content">
          <h3>AI Bot Configuration</h3>
          <p>Configure AI-powered responses using DeepSeek AI. The bot responds when mentioned or replied to.</p>

          <h4>Initial Setup:</h4>
          <ol>
            <li>Go to Settings → AI</li>
            <li>Enter your DeepSeek API key (get it from <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer">DeepSeek Platform</a>)</li>
            <li>Toggle "Enable AI responses" to activate</li>
            <li>Go to General → AI Configuration for advanced settings</li>
          </ol>

          <h4>Model Configuration:</h4>
          <p>In Settings → AI, you can configure:</p>
          <ul>
            <li><strong>Model Selection:</strong> Choose between deepseek-chat (general), deepseek-coder (code-focused), or deepseek-reasoner (reasoning-focused)</li>
            <li><strong>Temperature:</strong> Control response randomness (0-2, default: 0.7)</li>
            <li><strong>Max Tokens:</strong> Set maximum response length (1-4096, default: 2000)</li>
          </ul>

          <h4>Advanced Configuration:</h4>
          <p>In General → AI Configuration, you can configure:</p>
          <ul>
            <li><strong>Allowed Channels:</strong> Restrict AI to specific channels (empty = all channels)</li>
            <li><strong>Rate Limits:</strong> Set maximum responses per minute and per hour per user</li>
            <li><strong>Allowed Roles:</strong> Whitelist specific roles that can use AI (empty = all users)</li>
            <li><strong>Blocked Users:</strong> Blacklist specific users from using AI</li>
          </ul>

          <h4>How It Works:</h4>
          <ul>
            <li>Users mention the bot (<code>@BotName your question</code>) or reply to the bot's message</li>
            <li>The bot checks if AI is enabled and if the user/channel is allowed</li>
            <li>Rate limits are enforced per user</li>
            <li>The bot maintains conversation context when replying to previous messages</li>
            <li>Responses are generated using DeepSeek AI</li>
            <li><strong>Note:</strong> The bot will NOT respond to messages starting with "!" (commands like !dice, !model, !personality)</li>
          </ul>

          <h4>Discord Commands:</h4>
          <ul>
            <li><code>!model</code> - Switch the Ollama model for the current channel. The bot will show available models with number reactions (1️⃣-🔟). React to select a model.</li>
            <li><code>!personality</code> - Switch the AI personality for the current channel. The bot will show personalities with emoji reactions (😐 normal, 😈 rude, 💼 professional, 😊 friendly, 😏 sarcastic). React to select a personality.</li>
            <li><code>!dice</code> - Start a dice game (if enabled)</li>
            <li><code>!ping</code> - Check if the bot is online</li>
          </ul>

          <h4>Model & Personality Switching:</h4>
          <ul>
            <li>Both <code>!model</code> and <code>!personality</code> commands work per-channel</li>
            <li>Only the person who ran the command can select (others' reactions will be removed)</li>
            <li>Settings are saved immediately and apply to all future AI responses in that channel</li>
            <li>Model switching only works when using Ollama as the AI provider</li>
            <li>The current selection is marked with "(current)" in the list</li>
          </ul>

          <h4>Rate Limiting:</h4>
          <ul>
            <li>Prevents abuse by limiting how often users can get AI responses</li>
            <li>Two limits: per minute (1-60) and per hour (1-500)</li>
            <li>Users who exceed limits will need to wait before getting more responses</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'themeSettings',
      title: 'Theme Settings',
      icon: MdPalette,
      content: (
        <div className="help-content">
          <h3>Customizing the Interface Theme</h3>
          <p>Personalize the appearance of the KaasBot interface to match your preferences.</p>

          <h4>How to Customize:</h4>
          <ol>
            <li>Go to Settings → Theme</li>
            <li>Choose from preset themes or create a custom theme</li>
            <li>Adjust colors for:
              <ul>
                <li>Primary color (buttons, links, highlights)</li>
                <li>Background colors</li>
                <li>Text colors</li>
                <li>Border colors</li>
              </ul>
            </li>
            <li>Changes are saved automatically</li>
            <li>Your theme preference is stored and persists across sessions</li>
          </ol>

          <h4>Preset Themes:</h4>
          <ul>
            <li>Default: Standard blue theme</li>
            <li>Dark: Dark mode optimized</li>
            <li>Custom: Create your own color scheme</li>
          </ul>

          <h4>Tips:</h4>
          <ul>
            <li>Use color pickers to select exact colors</li>
            <li>Preview changes in real-time</li>
            <li>Ensure sufficient contrast for readability</li>
          </ul>
        </div>
      ),
    },
  ]

  return (
    <div className="help-page">
      <div className="help-header">
        <h1>Help & Documentation</h1>
        <p className="help-subtitle">
          Learn how to use all features of KaasBot
        </p>
      </div>

      <div className="help-sections">
        {helpSections.map((section) => {
          const Icon = section.icon
          const isOpen = openSections[section.id] || false
          const ChevronIcon = isOpen ? HiChevronUp : HiChevronDown

          return (
            <div key={section.id} className="help-section">
              <button
                className="help-section-header"
                onClick={() => toggleSection(section.id)}
                aria-expanded={isOpen}
              >
                <div className="help-section-title">
                  <Icon className="help-section-icon" size={24} />
                  <span>{section.title}</span>
                </div>
                <ChevronIcon className="help-section-chevron" size={20} />
              </button>
              {isOpen && (
                <div className="help-section-content">
                  {section.content}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


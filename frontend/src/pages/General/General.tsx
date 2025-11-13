import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MdSupport, MdCode, MdCasino, MdTextFields, MdSmartToy, MdVerifiedUser, MdSecurity, MdSearch, MdClose, MdWavingHand, MdHowToVote, MdImage, MdSports, MdAttachMoney } from 'react-icons/md'
import { FaYoutube } from 'react-icons/fa'
import './General.css'

interface CardData {
  id: string
  to: string
  icon: React.ComponentType
  title: string
  subtitle: string
  description: string
  actionText: string
  tags: string[]
}

const allCards: CardData[] = [
  {
    id: 'tickets',
    to: '/tickets',
    icon: MdSupport,
    title: 'Ticket System',
    subtitle: 'Configure Discord ticketing',
    description: 'Set up your Discord ticket system. Configure channels, categories, and who to mention when tickets are created.',
    actionText: 'Configure Tickets',
    tags: ['Support', 'Configuration']
  },
  {
    id: 'embed-builder',
    to: '/embed-builder',
    icon: MdCode,
    title: 'Embed Builder',
    subtitle: 'Create custom embed messages',
    description: 'Build and send custom Discord embed messages with a visual preview. Easy-to-use interface with all embed options.',
    actionText: 'Open Embed Builder',
    tags: ['Tools', 'Messages']
  },
  {
    id: 'dice-game',
    to: '/dice-game',
    icon: MdCasino,
    title: 'Dice Game',
    subtitle: 'Configure dice game settings',
    description: 'Enable and configure the interactive dice game. Set channel restrictions and user cooldowns for the !dice command.',
    actionText: 'Configure Dice Game',
    tags: ['Games', 'Entertainment']
  },
  {
    id: 'wordle',
    to: '/wordle',
    icon: MdTextFields,
    title: 'Wordle',
    subtitle: 'Configure Wordle game settings',
    description: 'Enable and configure the Wordle game. Set channel restrictions, allowed roles/users, DM-only mode, and user cooldowns for the !wordle command.',
    actionText: 'Configure Wordle',
    tags: ['Games', 'Entertainment']
  },
  {
    id: 'ai-config',
    to: '/general/ai-config',
    icon: MdSmartToy,
    title: 'AI Configuration',
    subtitle: 'Configure AI response settings',
    description: 'Configure AI response settings, rate limits, channel restrictions, allowed roles, and blocked users for the AI bot.',
    actionText: 'Configure AI',
    tags: ['AI', 'Configuration']
  },
  {
    id: 'auto-roles',
    to: '/auto-roles',
    icon: MdVerifiedUser,
    title: 'Auto Roles',
    subtitle: 'Configure reaction-based role assignment',
    description: 'Set up an embed message where users can react to automatically get roles. Configure the embed appearance and map emojis to roles.',
    actionText: 'Configure Auto Roles',
    tags: ['Roles', 'Automation']
  },
  {
    id: 'auto-moderator',
    to: '/auto-moderator',
    icon: MdSecurity,
    title: 'Auto Moderator',
    subtitle: 'Configure automatic message moderation',
    description: 'Set up automatic message moderation with configurable severity levels, word filtering, and whitelist/blacklist for users, channels, and roles.',
    actionText: 'Configure Auto Moderator',
    tags: ['Moderation', 'Security']
  },
  {
    id: 'welcome-message',
    to: '/welcome-message',
    icon: MdWavingHand,
    title: 'Welcome Messages',
    subtitle: 'Configure automatic welcome messages',
    description: 'Set up automatic welcome messages sent to new members when they join your server. Supports text messages, rich embeds, DMs, and customizable variables.',
    actionText: 'Configure Welcome Messages',
    tags: ['Messages', 'Automation']
  },
  {
    id: 'voting',
    to: '/voting',
    icon: MdHowToVote,
    title: 'Voting System',
    subtitle: 'Create anonymous voting polls',
    description: 'Create anonymous voting polls with text-based options. Users can vote via Discord buttons or slash commands. Supports poll expiration and real-time results.',
    actionText: 'Configure Voting',
    tags: ['Tools', 'Polls']
  },
  {
    id: 'youtube-notifications',
    to: '/youtube-notifications',
    icon: FaYoutube,
    title: 'YouTube Notifications',
    subtitle: 'Configure YouTube channel notifications',
    description: 'Set up automatic notifications when your tracked YouTube channels upload new videos. Configure channels, notification settings, and check intervals.',
    actionText: 'Configure YouTube',
    tags: ['Notifications', 'Automation']
  },
  {
    id: 'meme',
    to: '/meme',
    icon: MdImage,
    title: 'Meme Feature',
    subtitle: 'Configure dark meme posting',
    description: 'Enable the !meme command to post dark memes from Reddit. Configure auto-posting every 2 hours, auto-delete messages, and channel restrictions.',
    actionText: 'Configure Memes',
    tags: ['Entertainment', 'Automation']
  },
  {
    id: 'sports-tracker',
    to: '/sports-tracker',
    icon: MdSports,
    title: 'F1 Commands',
    subtitle: 'Configure F1 Discord bot commands',
    description: 'Enable or disable F1 commands. Use /f1 commands in Discord to get race positions, starting grid, race info, and current leader.',
    actionText: 'Configure F1 Commands',
    tags: ['Commands', 'Sports']
  },
  {
    id: 'exchange-rate',
    to: '/exchange-rate',
    icon: MdAttachMoney,
    title: 'Exchange Rate',
    subtitle: 'Currency conversion and exchange rates',
    description: 'Convert between currencies and view current exchange rates. Configure bot commands to respond to currency conversion requests in Discord channels.',
    actionText: 'Open Exchange Rate',
    tags: ['Tools', 'Currency', 'Finance']
  }
]

const allTags = Array.from(new Set(allCards.flatMap(card => card.tags))).sort()

export default function General() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const filteredCards = useMemo(() => {
    return allCards.filter(card => {
      const matchesSearch = searchQuery === '' || 
        card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesTag = selectedTag === null || card.tags.includes(selectedTag)
      
      return matchesSearch && matchesTag
    })
  }, [searchQuery, selectedTag])

  const toggleTag = (tag: string) => {
    setSelectedTag(prev => prev === tag ? null : tag)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedTag(null)
  }

  const hasActiveFilters = searchQuery !== '' || selectedTag !== null

  return (
    <div className="general-page">
      <div className="general-header">
        <h1>General</h1>
        <p className="general-subtitle">
          General bot configuration and settings
        </p>
      </div>

      <div className="general-search-section">
        <div className="search-bar-container">
          <MdSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="clear-search-button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <MdClose />
            </button>
          )}
        </div>

        <div className="tag-filters">
          <div className="tag-filters-header">
            <span className="tag-filters-label">Filter by tags:</span>
            {hasActiveFilters && (
              <button className="clear-filters-button" onClick={clearFilters}>
                Clear all
              </button>
            )}
          </div>
          <div className="tag-buttons">
            {allTags.map(tag => (
              <button
                key={tag}
                className={`tag-button ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredCards.length === 0 ? (
        <div className="no-results">
          <p>No features found matching your search criteria.</p>
          {hasActiveFilters && (
            <button className="clear-filters-link" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="general-cards-grid">
          {filteredCards.map(card => {
            const IconComponent = card.icon
            return (
              <Link key={card.id} to={card.to} className="general-card action-card">
                <div className="card-header">
                  <div className="card-icon">
                    <IconComponent />
                  </div>
                  <div className="card-title-group">
                    <h2>{card.title}</h2>
                    <p className="card-subtitle">{card.subtitle}</p>
                  </div>
                </div>
                <div className="card-content">
                  <p>{card.description}</p>
                </div>
                <div className="card-tags">
                  {card.tags.map(tag => (
                    <span key={tag} className="card-tag">{tag}</span>
                  ))}
                </div>
                <div className="card-action">
                  <span>{card.actionText}</span>
                  <IconComponent />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}


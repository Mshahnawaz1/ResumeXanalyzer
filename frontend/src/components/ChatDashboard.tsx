import React, { useState, useRef, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { NavBar } from './NavBar';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

type PersonaType = 'general' | 'developer' | 'designer' | 'writer' | 'custom';

// Star 4-point SVG icon representing AI
const GeminiSparkIcon: React.FC<{ className?: string }> = ({ className = "spark-icon" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} width="16" height="16">
    <path d="M12 2c-.3 3.8-3.2 6.7-7 7 3.8.3 6.7 3.2 7 7 .3-3.8 3.2-6.7 7-7-3.8-.3-6.7-3.2-7-7z" />
  </svg>
);

// Sleek User Profile icon
const UserIcon: React.FC<{ className?: string }> = ({ className = "user-icon" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className} width="16" height="16" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// CodeBlock component to manage its copy state
const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  return (
    <div className="code-block-container animate-fade-in">
      <div className="code-block-header">
        <div className="code-lang-badge">
          <span className="lang-dot"></span>
          <span>{language}</span>
        </div>
        <button 
          onClick={handleCopy}
          className="copy-btn"
          title="Copy code"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const ChatDashboard: React.FC = () => {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Persona states loaded from LocalStorage
  const [persona, setPersona] = useState<PersonaType>(() => {
    const saved = localStorage.getItem('chat_persona');
    return (saved as PersonaType) || 'general';
  });

  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>(() => {
    return localStorage.getItem('chat_custom_prompt') || '';
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Sync persona selections
  useEffect(() => {
    localStorage.setItem('chat_persona', persona);
  }, [persona]);

  useEffect(() => {
    localStorage.setItem('chat_custom_prompt', customSystemPrompt);
  }, [customSystemPrompt]);

  const getPersonaInstruction = (type: PersonaType, customPrompt: string) => {
    switch (type) {
      case 'developer':
        return 'You are an expert software engineer. Provide high-quality, secure, and well-structured code. Explain your design decisions clearly and focus on best practices.';
      case 'designer':
        return 'You are a senior UI/UX designer. Offer design feedback focusing on typography, layout hierarchy, color harmony, responsiveness, and clean aesthetics.';
      case 'writer':
        return 'You are a professional technical writer. Explain complex topics using clear, concise, and structured language. Use bullet points and appropriate headings.';
      case 'custom':
        return customPrompt.trim() || 'You are a helpful assistant.';
      case 'general':
      default:
        return '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessageText = input.trim();
    setInput('');
    setChatError(null);

    // Format the first message if persona is active
    let finalQuery = userMessageText;
    if (messages.length === 0 && persona !== 'general') {
      const instruction = getPersonaInstruction(persona, customSystemPrompt);
      if (instruction) {
        finalQuery = `[System instruction: ${instruction}]\n\n${userMessageText}`;
      }
    }

    // Append user message locally
    const newUserMessage: ChatMessage = { role: 'user', content: finalQuery };
    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);

    try {
      // Send request to secure /chat/ endpoint
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: finalQuery,
          // Pass the existing message history to the backend for contextual memory
          history: messages,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to get response from AI.');
      }

      const data = await response.json();
      const modelResponseText = data.response;

      setMessages((prev) => [...prev, { role: 'model', content: modelResponseText }]);
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || 'An error occurred while sending the message.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setChatError(null);
  };

  // Strip system instructions when rendering messages to user
  const cleanDisplayContent = (content: string): string => {
    if (content.startsWith('[System instruction:')) {
      const splitIdx = content.indexOf(']\n\n');
      if (splitIdx !== -1) {
        return content.substring(splitIdx + 3);
      }
    }
    return content;
  };

  // Utility to render message content with basic formatting
  const renderMessageContent = (text: string) => {
    const cleanText = cleanDisplayContent(text);
    const parts = cleanText.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const codeLines = part.slice(3, -3).trim().split('\n');
        let language = 'code';
        let code = codeLines.join('\n');
        if (codeLines[0] && codeLines[0].length < 15 && !codeLines[0].includes(' ') && codeLines.length > 1) {
          language = codeLines[0];
          code = codeLines.slice(1).join('\n');
        }
        return <CodeBlock key={index} code={code} language={language} />;
      }
      
      const inlineParts = part.split(/(`[^`\n]+`)/g);
      return (
        <span key={index} className="text-span">
          {inlineParts.map((subPart, subIdx) => {
            if (subPart.startsWith('`') && subPart.endsWith('`')) {
              return <code key={subIdx} className="inline-code">{subPart.slice(1, -1)}</code>;
            }
            return subPart.split('\n').map((line, lineIdx, array) => (
              <React.Fragment key={lineIdx}>
                {line}
                {lineIdx < array.length - 1 && <br />}
              </React.Fragment>
            ));
          })}
        </span>
      );
    });
  };

  return (
    <div className="chat-dashboard-page">
      <NavBar />

      <div className="dashboard-container">
        {/* Sidebar Navigation */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <span className="sidebar-sec-title">Workspace Utilities</span>
            
            <button 
              type="button" 
              className="sidebar-btn active"
            >
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Active Chat Session
            </button>
            
            <button 
              type="button" 
              className="sidebar-btn danger" 
              onClick={handleClearChat}
              disabled={messages.length === 0}
            >
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
              Clear Chat History
            </button>
          </div>

          <div className="sidebar-section divider-top">
            <span className="sidebar-sec-title">AI Persona Settings</span>
            <div className="persona-select-container">
              <label htmlFor="persona-select" className="control-label">Active Persona</label>
              <select 
                id="persona-select"
                value={persona}
                onChange={(e) => setPersona(e.target.value as PersonaType)}
                className="persona-dropdown"
              >
                <option value="general">General Assistant</option>
                <option value="developer">Software Engineer</option>
                <option value="designer">UI/UX Designer</option>
                <option value="writer">Technical Writer</option>
                <option value="custom">Custom Persona...</option>
              </select>
            </div>

            {persona === 'custom' && (
              <div className="custom-prompt-container animate-slide-down">
                <label htmlFor="custom-prompt-text" className="control-label">System Guidelines</label>
                <textarea
                  id="custom-prompt-text"
                  placeholder="E.g., You are an expert chef who only suggests gluten-free meals..."
                  value={customSystemPrompt}
                  onChange={(e) => setCustomSystemPrompt(e.target.value)}
                  rows={4}
                  className="custom-prompt-textarea"
                />
              </div>
            )}
          </div>

          <div className="sidebar-section info-card-container divider-top">
            <span className="sidebar-sec-title">Keyboard Hotkeys</span>
            <div className="hotkeys-card">
              <div className="hotkey-item">
                <kbd>Enter</kbd>
                <span>Submit message</span>
              </div>
              <div className="hotkey-item">
                <kbd>Shift</kbd> + <kbd>Enter</kbd>
                <span>New line</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Chat Workspace */}
        <main className="chat-workspace">
          <header className="chat-header">
            <div className="header-title">
              <h1>Workspace Chat Agent</h1>
              <div className="status-indicator">
                <span className="dot online"></span>
                <span>Gemini API Online</span>
              </div>
            </div>

            {persona !== 'general' && (
              <div className="active-persona-badge animate-fade-in">
                <GeminiSparkIcon className="spark-icon-active" />
                <span>
                  {persona === 'developer' && 'Software Engineer Mode'}
                  {persona === 'designer' && 'UI/UX Designer Mode'}
                  {persona === 'writer' && 'Technical Writer Mode'}
                  {persona === 'custom' && 'Custom Persona Active'}
                </span>
              </div>
            )}
          </header>

          {/* Message Thread */}
          <div className="message-container">
            {messages.length === 0 ? (
              <div className="chat-placeholder">
                <div className="placeholder-icon">
                  <GeminiSparkIcon className="spark-icon-placeholder" />
                </div>
                <h3>Ask Gemini anything</h3>
                <p>Start a secure, local-first conversation. Your key and logs are saved on your computer, never exposed.</p>
                
                <div className="suggested-prompts-grid">
                  <div 
                    onClick={() => setInput('Explain the difference between JWT and OAuth in detail.')} 
                    className="suggested-card"
                  >
                    <div className="card-icon">⚙️</div>
                    <div className="card-info">
                      <h4>Explain JWT vs OAuth</h4>
                      <p>Understand secure token-based web auth</p>
                    </div>
                  </div>
                  <div 
                    onClick={() => setInput('Write a fast Python decorator to cache API responses with expiration.')} 
                    className="suggested-card"
                  >
                    <div className="card-icon">🐍</div>
                    <div className="card-info">
                      <h4>Python Cache Decorator</h4>
                      <p>Write an expiring API cache decorator</p>
                    </div>
                  </div>
                  <div 
                    onClick={() => setInput('Help me optimize a slow PostgreSQL query.')} 
                    className="suggested-card"
                  >
                    <div className="card-icon">💾</div>
                    <div className="card-info">
                      <h4>Optimize SQL Query</h4>
                      <p>Boost database retrieval performance</p>
                    </div>
                  </div>
                  <div 
                    onClick={() => setInput('Create a custom React hook for handling local storage state with sync across tabs.')} 
                    className="suggested-card"
                  >
                    <div className="card-icon">⚛️</div>
                    <div className="card-info">
                      <h4>React LocalStorage Hook</h4>
                      <p>Build reactive, cross-tab synced storage</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="messages-list">
                {messages.map((msg, index) => (
                  <div key={index} className={`message-wrapper ${msg.role}`}>
                    <div className="message-avatar">
                      {msg.role === 'user' ? <UserIcon /> : <GeminiSparkIcon />}
                    </div>
                    <div className="message-bubble">
                      <div className="message-content">
                        {renderMessageContent(msg.content)}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="message-wrapper model loading">
                    <div className="message-avatar">
                      <GeminiSparkIcon />
                    </div>
                    <div className="message-bubble">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}

                {chatError && (
                  <div className="chat-error-banner animate-fade-in">
                    <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>{chatError}</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Footer */}
          <footer className="chat-footer">
            <form onSubmit={handleSendMessage} className="chat-input-form">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder={
                  persona === 'general' 
                    ? "Ask Gemini a question... (Press Enter to send)" 
                    : `Ask Gemini as a ${persona === 'custom' ? 'Custom Persona' : persona}...`
                }
                rows={1}
                disabled={loading}
              />
              <button 
                id="send-chat-btn" 
                type="submit" 
                className="btn-send" 
                disabled={!input.trim() || loading}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </form>
          </footer>
        </main>
      </div>
    </div>
  );
};

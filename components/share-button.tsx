import React, { useState } from 'react';
import { 
  Share2, 
  MessageCircle, 
  Send, 
  Check, 
  Copy, 
  Mail,
  Linkedin,
  Twitter,
  X
} from 'lucide-react';

type PlatformName = 'facebook' | 'whatsapp' | 'twitter' | 'linkedin' | 'telegram' | 'reddit' | 'email' | 'copy';
type ButtonSize = 'sm' | 'md' | 'lg';

interface SocialPlatform {
  name: string;
  icon: React.ReactNode;
  getUrl: (url: string, text?: string, title?: string) => string;
  color: string;
  bg?: string;
}

interface SocialShareButtonsProps {
  url?: string;
  title?: string;
  text?: string;
  buttonText?: string;
  className?: string;
  buttonClassName?: string;
  expandable?: boolean;
  platforms?: PlatformName[];
  size?: ButtonSize;
  onShare?: (platform: string, url: string) => void;
}

/**
 * SocialShareButtons - A fully TypeScript-compatible social media sharing component
 * Uses Lucide React icons for optimal consistency and performance
 * 
 * @example
 * // Basic usage (expandable)
 * <SocialShareButtons />
 * 
 * @example
 * // Custom project sharing with type safety
 * <SocialShareButtons
 *   url="https://example.com/projects/water-project"
 *   title="Help Build Clean Water Access"
 *   text="Join us in making clean water accessible! 💧"
 *   platforms={['facebook', 'whatsapp', 'twitter', 'copy']}
 *   size="lg"
 * />
 * 
 * @example
 * // Always visible (non-expandable)
 * <SocialShareButtons
 *   expandable={false}
 *   size="sm"
 *   platforms={['facebook', 'whatsapp', 'copy']}
 * />
 * 
 * Available platforms: 'facebook' | 'whatsapp' | 'twitter' | 'linkedin' | 'telegram' | 'reddit' | 'email' | 'copy'
 * Sizes: 'sm' | 'md' | 'lg'
 */
export default function SocialShareButtons({
  url = "https://example.com",
  title = "MORRIS MONYE - Funding impact, transparently",
  text = "Check out MORRIS MONYE - a platform connecting communities to fund impactful projects with transparent reporting.",
  buttonText = "Spread the word",
  className = "",
  buttonClassName = "",
  expandable = true,
  platforms = ['facebook', 'whatsapp', 'twitter', 'linkedin', 'telegram', 'copy'] as PlatformName[],
  size = 'md',
  onShare
}: SocialShareButtonsProps) {
  const [isExpanded, setIsExpanded] = useState(!expandable);

  const sizeConfig: Record<ButtonSize, {
    iconSize: string;
    buttonHeight: string;
    buttonPadding: string;
    socialPadding: string;
    textSize: string;
  }> = {
    sm: {
      iconSize: '!w-3 h-3',
      buttonHeight: 'h-8',
      buttonPadding: 'px-4 py-2',
      socialPadding: 'p-2',
      textSize: 'text-sm'
    },
    md: {
      iconSize: '!w-4 h-4',
      buttonHeight: 'h-10',
      buttonPadding: 'px-6 py-3',
      socialPadding: 'p-3',
      textSize: 'text-base'
    },
    lg: {
      iconSize: '!w-5 h-5',
      buttonHeight: 'h-12',
      buttonPadding: 'px-8 py-4',
      socialPadding: 'p-4',
      textSize: 'text-lg'
    }
  };

  const config = sizeConfig[size];

  const allPlatforms: Record<string, SocialPlatform> = {
    facebook: {
      name: 'Facebook',
      icon: (
        <svg className={config.iconSize} fill="currentColor" viewBox="0 0 24 24" aria-label="Facebook">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      getUrl: (shareUrl: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      color: 'text-blue-600 hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-200',
      bg: 'bg-blue-50 border-blue-200'
    },
    whatsapp: {
      name: 'WhatsApp',
      icon: <MessageCircle className={config.iconSize} />,
      getUrl: (shareUrl: string, shareText?: string) => `https://wa.me/?text=${encodeURIComponent((shareText || '') + ' ' + shareUrl)}`,
      color: 'text-green-600 hover:bg-green-600 hover:text-white hover:shadow-lg hover:shadow-green-200',
      bg: 'bg-green-50 border-green-200'
    },
    twitter: {
      name: 'X (Twitter)',
      icon: <X className={config.iconSize} />,
      getUrl: (shareUrl: string, shareText?: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText || '')}&url=${encodeURIComponent(shareUrl)}`,
      color: 'text-gray-800 hover:bg-black hover:text-white hover:shadow-lg hover:shadow-gray-300',
      bg: 'bg-gray-50 border-gray-200'
    },
    linkedin: {
      name: 'LinkedIn',
      icon: <Linkedin className={config.iconSize} />,
      getUrl: (shareUrl: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      color: 'text-blue-700 hover:bg-blue-700 hover:text-white hover:shadow-lg hover:shadow-blue-200',
      bg: 'bg-blue-50 border-blue-200'
    },
    telegram: {
      name: 'Telegram',
      icon: <Send className={config.iconSize} />,
      getUrl: (shareUrl: string, shareText?: string) => `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText || '')}`,
      color: 'text-blue-500 hover:bg-blue-500 hover:text-white hover:shadow-lg hover:shadow-blue-200',
      bg: 'bg-blue-50 border-blue-200'
    },
    reddit: {
      name: 'Reddit',
      icon: (
        <svg className={config.iconSize} fill="currentColor" viewBox="0 0 24 24" aria-label="Reddit">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
        </svg>
      ),
      getUrl: (shareUrl: string, shareText?: string, shareTitle?: string) => `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle || '')}`,
      color: 'text-orange-600 hover:bg-orange-600 hover:text-white hover:shadow-lg hover:shadow-orange-200',
      bg: 'bg-orange-50 border-orange-200'
    },
    email: {
      name: 'Email',
      icon: <Mail className={config.iconSize} />,
      getUrl: (shareUrl: string, shareText?: string, shareTitle?: string) => `mailto:?subject=${encodeURIComponent(shareTitle || '')}&body=${encodeURIComponent((shareText || '') + '\n\n' + shareUrl)}`,
      color: 'text-gray-600 hover:bg-gray-600 hover:text-white hover:shadow-lg hover:shadow-gray-200',
      bg: 'bg-gray-50 border-gray-200'
    },
    copy: {
      name: 'Copy Link',
      icon: <Copy className={`${config.iconSize} text-gray-200`} />,
      getUrl: () => '',
      color: 'text-white bg-gradient-to-r from-theme-500 to-theme-600 hover:from-theme-600 hover:to-theme-700 hover:shadow-lg hover:shadow-theme-300/50 border-theme-400',
      bg: ''
    }
  };

  const activePlatforms = platforms
    .map(p => allPlatforms[p])
    .filter((platform): platform is SocialPlatform => Boolean(platform));

  const handleShare = (platform: SocialPlatform): void => {
    if (platform.name === 'Copy Link') {
      handleCopyLink();
      return;
    }
    
    const shareUrl = platform.getUrl(url, text, title);
    
    if (onShare) {
      onShare(platform.name.toLowerCase(), shareUrl);
    }
    
    if (platform.name === 'Email') {
      window.location.href = shareUrl;
    } else {
      window.open(shareUrl, `share-${platform.name.toLowerCase()}`, 'width=600,height=400,scrollbars=yes,resizable=yes');
    }
  };

  const [copied, setCopied] = useState(false);

  const handleCopyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (onShare) {
        onShare('copy-link', url);
      }
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const baseClasses = `w-full max-w-xs mx-auto ${className}`;
  const buttonClasses = `bg-theme-100 hover:bg-theme-200 text-theme-800 w-full rounded-lg ${config.buttonPadding} transition-colors flex items-center justify-center gap-2 group ${config.textSize} ${buttonClassName}`;

  if (!expandable) {
    return (
      <div className={baseClasses}>
        <div className="bg-theme-50 rounded-lg p-3 border border-theme-200">
          {/* Social Media Icons Row */}
          <div className="flex justify-center gap-2 mb-3 flex-wrap">
            {activePlatforms.map((platform) => (
              <button
                key={platform.name}
                onClick={() => handleShare(platform)}
                className={`!px-2
                  ${platform.bg} ${platform.color}
                  ${config.buttonHeight} ${config.buttonHeight} rounded-xl !block items-center justify-center
                  border-2 transition-all duration-300 hover:scale-110 hover:-translate-y-1
                  active:scale-95 active:translate-y-0 group relative overflow-hidden
                  backdrop-blur-sm font-medium
                `}
                title={`Share on ${platform.name}`}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                
                <span className="relative z-10 transition-transform group-hover:scale-110">
                  {platform.name === 'Copy Link' && copied ? (
                    <Check className={`${config.iconSize} text-green-600`} />
                  ) : (
                    platform.icon
                  )}
                </span>
              </button>
            ))}
          </div>
          
          {/* Success Message */}
          {copied && (
            <div className="text-center py-2">
              <span className="text-green-600 font-medium text-sm flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                Link copied to clipboard!
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      {/* Main Button */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className={buttonClasses}
      >
        <Share2 className={`${config.iconSize} transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        <span>{buttonText}</span>
      </button>
      
      {/* Expandable Social Options */}
      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
        <div className="bg-gradient-to-br from-theme-50 to-theme-100 rounded-xl p-4 border border-theme-200 shadow-sm">
          {/* Social Media Icons Row */}
          <div className="flex justify-center gap-3 mb-3 flex-wrap">
            {activePlatforms.map((platform) => (
              <button
                key={platform.name}
                onClick={() => handleShare(platform)}
                className={`
                  ${platform.name === 'Copy Link' ? platform.color : `${platform.bg} ${platform.color}`}
                  ${config.buttonHeight} ${config.buttonHeight} rounded-xl flex items-center justify-center
                  border-2 transition-all duration-300 hover:scale-110 hover:-translate-y-1
                  active:scale-95 active:translate-y-0 group relative overflow-hidden
                  backdrop-blur-sm font-medium shadow-sm
                `}
                title={platform.name === 'Copy Link' ? (copied ? 'Copied!' : 'Copy Link') : `Share on ${platform.name}`}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                
                <span className="relative z-10 transition-transform group-hover:scale-110">
                  {platform.name === 'Copy Link' && copied ? (
                    <Check className={`${config.iconSize} text-white`} />
                  ) : (
                    platform.icon
                  )}
                </span>
              </button>
            ))}
          </div>
          
          {/* Success Message */}
          {copied && (
            <div className="text-center">
              <span className="text-theme-600 font-medium text-sm flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                Link copied to clipboard!
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

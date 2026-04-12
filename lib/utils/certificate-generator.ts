import jsPDF from 'jspdf';
import { upperCase } from 'lodash';

// ========================================
// TYPE DEFINITIONS
// ========================================

type ImageFormat = 'PNG' | 'JPEG' | 'JPG';
type DonationType = 'project' | 'general';
type CurrencyDisplayMode = 'symbol' | 'code' | 'both';
type FontWeight = 'normal' | 'bold' | 'italic';

interface ImageData {
  data: string;
  format: ImageFormat;
  width?: number;
  height?: number;
}

type ImageInput = string | ImageData;

interface ProcessedImage {
  data: string;
  format: ImageFormat;
  isDataUrl: boolean;
  customWidth?: number;
  customHeight?: number;
}

interface CurrencyInfo {
  symbol: string;
  text: string;
  fallback: string;
}

interface DonationData {
  // Donor information
  donorName: string;
  donorEmail?: string;
  
  // Donation details
  amount: number;
  currency: string;
  donationType: DonationType;
  donationDate: Date;
  transactionId: string;
  
  // Project details (required for project donations)
  projectTitle?: string;
  projectId?: string;
  projectLocation?: string;
  
  // Organization details
  orgName: string;
  orgLogo?: ImageInput;
  orgWebsite?: string;
  orgAddress?: string;
  orgTaxId?: string;
  
  // Signature details
  signatureName?: string;
  signatureTitle?: string;
  signatureImage?: ImageInput;
  
  // Additional metadata
  paymentMethod?: string;
  campaignName?: string;
  impactMessage?: string;
}

interface CertificateColors {
  readonly primary: string;
  readonly primaryLight: string;
  readonly primaryDark: string;
  readonly gold: string;
  readonly background: string;
  readonly cardBackground: string;
  readonly text: string;
  readonly textLight: string;
  readonly success: string;
  readonly accent: string;
}

interface LayoutConfig {
  readonly pageMargin: number;
  readonly headerHeight: number;
  readonly cardPadding: number;
  readonly sectionSpacing: number;
  readonly logo: {
    readonly maxWidth: number;
    readonly maxHeight: number;
    readonly x: number;
    readonly y: number;
  };
  readonly signature: {
    readonly maxWidth: number;
    readonly maxHeight: number;
    readonly lineWidth: number;
  };
}

interface FontConfig {
  readonly size: number;
  readonly weight: FontWeight;
}

interface FontsConfig {
  readonly title: FontConfig;
  readonly subtitle: FontConfig;
  readonly donorName: FontConfig;
  readonly body: FontConfig;
  readonly small: FontConfig;
}

interface TextConfig {
  readonly mainTitle: string;
  readonly subtitle: {
    readonly project: string;
    readonly general: string;
  };
  readonly openingText: string;
  readonly projectText: {
    readonly contributing: string;
    readonly toward: string;
  };
  readonly generalText: {
    readonly contribution: string;
    readonly mission: string;
  };
  readonly impactMessages: {
    readonly project: string;
    readonly general: string;
  };
  readonly footer: {
    readonly signature: string;
    readonly generated: string;
    readonly taxNote: string;
  };
}

interface CurrencyConfig {
  readonly displayMode: CurrencyDisplayMode;
  readonly fallbackToCode: boolean;
}

interface CertificateConfig {
  readonly colors: CertificateColors;
  readonly layout: LayoutConfig;
  readonly fonts: FontsConfig;
  readonly text: TextConfig;
  readonly currency: CurrencyConfig;
}

interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

interface CertificateResult {
  readonly success: true;
  readonly pdf: Buffer;
  readonly pdfBlob: Blob;
  readonly blobUrl: string;
  readonly filename: string;
  readonly metadata: {
    readonly donorName: string;
    readonly amount: number;
    readonly currency: string;
    readonly donationType: DonationType;
    readonly projectTitle?: string;
    readonly transactionId: string;
    readonly generatedAt: string;
  };
  readonly actions: {
    openInNewTab: () => Window | null;
    download: () => void;
    cleanup: () => void;
  };
}

interface CertificateError {
  readonly success: false;
  readonly error: string;
  readonly details?: string;
}

type CertificateGenerationResult = CertificateResult | CertificateError;

interface RGBColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

// ========================================
// CONFIGURATION - EASY TO MODIFY
// ========================================

const defaultConfig: CertificateConfig = {
  colors: {
    primary: "#093f85", // theme-500 (brand blue)
    primaryLight: "#8aadd6", // theme-300
    primaryDark: "#062c5a", // theme-700
    gold: "#d4a017",
    background: "#f5f9fc", // light blue tint
    cardBackground: "#ffffff",
    text: "#02152e", // theme-900
    textLight: "#5e8fc3", // theme-400
    success: "#4caf50",
    accent: "#b3cae6", // theme-200
  },
  
  layout: {
    pageMargin: 15,
    headerHeight: 50,
    cardPadding: 20,
    sectionSpacing: 15,
    logo: {
      maxWidth: 20,
      maxHeight: 20,
      x: 20,
      y: 20,
    },
    signature: {
      maxWidth: 40,
      maxHeight: 15,
      lineWidth: 60,
    },
  },
  
  fonts: {
    title: { size: 24, weight: 'bold' },
    subtitle: { size: 11, weight: 'normal' },
    donorName: { size: 20, weight: 'bold' },
    body: { size: 12, weight: 'normal' },
    small: { size: 9, weight: 'normal' },
  },
  
  text: {
    mainTitle: 'CERTIFICATE OF IMPACT',
    subtitle: {
      project: 'In Recognition of Educational Support',
      general: 'For Advancing Educational Opportunities'
    },
    openingText: 'This certificate is presented to',
    projectText: {
      contributing: 'for contributing',
      toward: 'toward'
    },
    generalText: {
      contribution: 'for your generous contribution of',
      mission: 'to advance educational opportunities'
    },
    impactMessages: {
      project: 'Your investment in education is transforming lives and communities.',
      general: 'Together, we are building brighter futures through education.'
    },
    footer: {
      signature: 'Authorized Signature',
      generated: 'Certificate generated on:',
      taxNote: 'This may be tax deductible'
    }
  },

  currency: {
    displayMode: 'code',
    fallbackToCode: true,
  }
} as const;

// ========================================
// CERTIFICATE BUILDER CLASS
// ========================================

class CertificateBuilder {
  private readonly pdf: jsPDF;
  private readonly config: CertificateConfig;
  private readonly pageWidth: number;
  private readonly pageHeight: number;

  constructor(config: CertificateConfig = defaultConfig) {
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
    this.config = config;
    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.pageHeight = this.pdf.internal.pageSize.getHeight();
  }

  // Utility methods
  private hexToRgb(hex: string): RGBColor | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private setColor(color: string): void {
    const rgb = this.hexToRgb(color);
    if (rgb) this.pdf.setTextColor(rgb.r, rgb.g, rgb.b);
  }

  private setFillColor(color: string): void {
    const rgb = this.hexToRgb(color);
    if (rgb) this.pdf.setFillColor(rgb.r, rgb.g, rgb.b);
  }

  private setDrawColor(color: string): void {
    const rgb = this.hexToRgb(color);
    if (rgb) this.pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
  }

  // Image handling utilities
  private processImageData(imageData: ImageInput | undefined): ProcessedImage | null {
    if (!imageData) return null;
    
    if (typeof imageData === 'string') {
      if (imageData.startsWith('data:image/')) {
        return {
          data: imageData,
          format: this.getImageFormatFromDataUrl(imageData),
          isDataUrl: true
        };
      } else if (imageData.startsWith('http')) {
        console.warn('External URLs may not work reliably. Consider converting to base64.');
        return {
          data: imageData,
          format: this.getImageFormatFromUrl(imageData),
          isDataUrl: false
        };
      } else {
        return {
          data: `data:image/png;base64,${imageData}`,
          format: 'PNG',
          isDataUrl: true
        };
      }
    } else {
      const format = imageData.format.toUpperCase() as ImageFormat;
      const data = imageData.data.startsWith('data:') 
        ? imageData.data 
        : `data:image/${format.toLowerCase()};base64,${imageData.data}`;
      
      return {
        data,
        format,
        isDataUrl: true,
        customWidth: imageData.width,
        customHeight: imageData.height
      };
    }
  }

  private getImageFormatFromDataUrl(dataUrl: string): ImageFormat {
    const match = dataUrl.match(/data:image\/([^;]+)/);
    const format = match ? match[1].toUpperCase() : 'PNG';
    return format as ImageFormat;
  }

  private getImageFormatFromUrl(url: string): ImageFormat {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'JPEG';
      case 'png':
        return 'PNG';
      default:
        return 'PNG';
    }
  }

  private addImageSafely(
    imageData: ImageInput,
    x: number,
    y: number,
    maxWidth: number,
    maxHeight: number,
    customWidth?: number,
    customHeight?: number
  ): boolean {
    try {
      const processedImage = this.processImageData(imageData);
      if (!processedImage) return false;

      const width = customWidth || processedImage.customWidth || maxWidth;
      const height = customHeight || processedImage.customHeight || maxHeight;

      this.pdf.addImage(
        processedImage.data,
        processedImage.format,
        x,
        y,
        width,
        height
      );
      
      return true;
    } catch (error) {
      console.warn('Could not add image:', error);
      return false;
    }
  }

  // Currency formatting utility
  private formatCurrency(amount: number, currency: string): CurrencyInfo {
    const currencyMap: Record<string, { symbol: string; name: string; fallback: string }> = {
      'NGN': { symbol: '₦', name: 'Naira', fallback: 'NGN' },
      'USD': { symbol: '$', name: 'Dollars', fallback: 'USD' },
      'EUR': { symbol: '€', name: 'Euros', fallback: 'EUR' },
      'GBP': { symbol: '£', name: 'Pounds', fallback: 'GBP' },
      'CAD': { symbol: 'C$', name: 'CAD', fallback: 'CAD' },
      'AUD': { symbol: 'A$', name: 'AUD', fallback: 'AUD' },
      'JPY': { symbol: '¥', name: 'Yen', fallback: 'JPY' },
      'CNY': { symbol: '¥', name: 'Yuan', fallback: 'CNY' },
      'INR': { symbol: '₹', name: 'Rupees', fallback: 'INR' },
    } as const;

    const currencyInfo = currencyMap[currency.toUpperCase()] || { 
      symbol: currency, 
      name: currency, 
      fallback: currency 
    };

    const formattedNumber = amount.toLocaleString();
    
    let displayText: string;
    let fallbackText: string;
    
    switch (this.config.currency.displayMode) {
      case 'code':
        displayText = `${currencyInfo.fallback} ${formattedNumber}`;
        fallbackText = displayText;
        break;
      case 'both':
        displayText = `${currencyInfo.symbol} ${formattedNumber} ${currencyInfo.fallback}`;
        fallbackText = `${currencyInfo.fallback} ${formattedNumber}`;
        break;
      case 'symbol':
      default:
        displayText = `${currencyInfo.symbol} ${formattedNumber}`;
        fallbackText = `${currencyInfo.fallback} ${formattedNumber}`;
        break;
    }
    
    return {
      symbol: currencyInfo.symbol,
      text: displayText,
      fallback: this.config.currency.fallbackToCode ? fallbackText : displayText
    };
  }

  private renderTextWithFallback(
    text: string, 
    fallback: string, 
    x: number, 
    y: number, 
    options?: Parameters<jsPDF['text']>[3]
  ): void {
    try {
      this.pdf.text(text, x, y, options);
      const testWidth = this.pdf.getTextWidth(text);
      if (testWidth === 0 && text.length > 0) {
        this.pdf.text(fallback, x, y, options);
      }
    } catch (error) {
      console.warn('Currency symbol rendering failed, using fallback:', error);
      this.pdf.text(fallback, x, y, options);
    }
  }

  // Drawing methods
  private drawBackground(): number {
    this.setFillColor(this.config.colors.background);
    this.pdf.rect(0, 0, this.pageWidth, this.pageHeight, 'F');
    return 0;
  }

  private drawHeader(data: DonationData): number {
    const { headerHeight, logo } = this.config.layout;
    
    this.setFillColor(this.config.colors.primary);
    this.pdf.rect(0, 0, this.pageWidth, headerHeight, 'F');
    
    this.setFillColor(this.config.colors.gold);
    this.pdf.rect(0, headerHeight - 3, this.pageWidth, 3, 'F');

    let logoAdded = false;
    if (data.orgLogo) {
      logoAdded = this.addImageSafely(
        data.orgLogo,
        logo.x,
        logo.y,
        logo.maxWidth,
        logo.maxHeight
      );
    }

    const textX = logoAdded ? logo.x + logo.maxWidth + 5 : 20;
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(18);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(upperCase(data.orgName), textX, 35);

    if (data.orgWebsite) {
      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(data.orgWebsite, textX, 22);
    }

    this.pdf.setFontSize(8);
    this.pdf.text(`Certificate #${data.transactionId}`, this.pageWidth - 20, 22, { align: 'right' });
    this.pdf.text(data.donationDate.toLocaleDateString("en-GB", {day: "2-digit", month: "long", year: "numeric"}), 
      this.pageWidth - 20, 27, 
      { align: 'right' });

    return headerHeight + 10;
  }

  private drawTitle(data: DonationData, startY: number): number {
    const titleY = startY + 15;
    
    this.setColor(this.config.colors.primary);
    this.pdf.setFontSize(this.config.fonts.title.size);
    this.pdf.setFont('helvetica', this.config.fonts.title.weight as any);
    this.pdf.text(this.config.text.mainTitle, this.pageWidth / 2, titleY, { align: 'center' });

    this.setColor(this.config.colors.textLight);
    this.pdf.setFontSize(this.config.fonts.subtitle.size);
    this.pdf.setFont('helvetica', this.config.fonts.subtitle.weight as any);
    
    const subtitle = data.donationType === 'project' 
      ? this.config.text.subtitle.project 
      : this.config.text.subtitle.general;
    this.pdf.text(subtitle, this.pageWidth / 2, titleY + 8, { align: 'center' });

    this.setDrawColor(this.config.colors.gold);
    this.pdf.setLineWidth(0.8);
    this.pdf.line(60, titleY + 15, this.pageWidth - 60, titleY + 15);

    return titleY + 25;
  }

  private drawContentCard(data: DonationData, startY: number): number {
    const cardHeight = 85;
    
    this.setFillColor('#f0f0f0');
    this.pdf.roundedRect(22, startY + 1, this.pageWidth - 42, cardHeight, 3, 3, 'F');
    
    this.setFillColor(this.config.colors.cardBackground);
    this.pdf.roundedRect(20, startY, this.pageWidth - 40, cardHeight, 3, 3, 'F');
    
    this.setDrawColor(this.config.colors.accent);
    this.pdf.setLineWidth(0.3);
    this.pdf.roundedRect(20, startY, this.pageWidth - 40, cardHeight, 3, 3, 'S');

    this.drawCardContent(data, startY + 18);

    return startY + cardHeight + this.config.layout.sectionSpacing;
  }

  private drawCardContent(data: DonationData, contentY: number): void {
    const centerX = this.pageWidth / 2;
    
    this.setColor(this.config.colors.textLight);
    this.pdf.setFontSize(this.config.fonts.body.size);
    this.pdf.setFont('helvetica', this.config.fonts.body.weight as any);
    this.pdf.text(this.config.text.openingText, centerX, contentY, { align: 'center' });
    
    this.setColor(this.config.colors.primary);
    this.pdf.setFontSize(this.config.fonts.donorName.size);
    this.pdf.setFont('helvetica', this.config.fonts.donorName.weight as any);
    this.pdf.text(data.donorName, centerX, contentY + 12, { align: 'center' });
    
    const nameWidth = this.pdf.getTextWidth(data.donorName);
    this.setDrawColor(this.config.colors.gold);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(centerX - nameWidth/2, contentY + 15, centerX + nameWidth/2, contentY + 15);
    
    if (data.donationType === 'project' && data.projectTitle) {
      this.drawProjectContent(data, contentY + 24);
    } else {
      this.drawGeneralContent(data, contentY + 24);
    }
  }

  private drawProjectContent(data: DonationData, startY: number): void {
    const centerX = this.pageWidth / 2;
    const currencyInfo = this.formatCurrency(data.amount, data.currency);
    
    this.setColor(this.config.colors.text);
    this.pdf.setFontSize(this.config.fonts.body.size);
    this.pdf.setFont('helvetica', this.config.fonts.body.weight as any);
    this.pdf.text(this.config.text.projectText.contributing, centerX, startY, { align: 'center' });
    
    this.setColor(this.config.colors.success);
    this.pdf.setFontSize(18);
    this.pdf.setFont('helvetica', 'bold');
    this.renderTextWithFallback(
      currencyInfo.text, 
      currencyInfo.fallback, 
      centerX, 
      startY + 12, 
      { align: 'center' }
    );
    
    this.setColor(this.config.colors.text);
    this.pdf.setFontSize(this.config.fonts.body.size);
    this.pdf.setFont('helvetica', this.config.fonts.body.weight as any);
    this.pdf.text(this.config.text.projectText.toward, centerX, startY + 24, { align: 'center' });
    
    this.setColor(this.config.colors.primary);
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(data.projectTitle!, centerX, startY + 34, { 
      align: 'center', 
      maxWidth: this.pageWidth - 60 
    });
  }

  private drawGeneralContent(data: DonationData, startY: number): void {
    const centerX = this.pageWidth / 2;
    const currencyInfo = this.formatCurrency(data.amount, data.currency);
    
    this.setColor(this.config.colors.text);
    this.pdf.setFontSize(this.config.fonts.body.size);
    this.pdf.setFont('helvetica', this.config.fonts.body.weight as any);
    this.pdf.text(this.config.text.generalText.contribution, centerX, startY, { align: 'center' });
    
    this.setColor(this.config.colors.success);
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.renderTextWithFallback(
      currencyInfo.text, 
      currencyInfo.fallback, 
      centerX, 
      startY + 16, 
      { align: 'center' }
    );
    
    this.setColor(this.config.colors.text);
    this.pdf.setFontSize(this.config.fonts.body.size);
    this.pdf.setFont('helvetica', this.config.fonts.body.weight as any);
    this.pdf.text(this.config.text.generalText.mission, centerX, startY + 30, { align: 'center' });
  }

  private drawImpactStatement(data: DonationData, startY: number): number {
    const centerX = this.pageWidth / 2;
    
    this.setFillColor(this.config.colors.primaryLight);
    this.pdf.roundedRect(30, startY, this.pageWidth - 60, 22, 2, 2, 'F');
    
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(13);
    this.pdf.setFont('helvetica', 'normal');
    
    const impactText = data.impactMessage || 
      (data.donationType === 'project' 
        ? this.config.text.impactMessages.project
        : this.config.text.impactMessages.general);
    
    this.pdf.text(impactText, centerX, startY + 8, { align: 'center', maxWidth: this.pageWidth - 70 });
    
    return startY + 35;
  }

  private drawSignature(data: DonationData, startY: number): number {
    const centerX = this.pageWidth / 2;
    const { signature } = this.config.layout;
    
    this.setColor(this.config.colors.textLight);
    this.pdf.setFontSize(this.config.fonts.small.size);
    this.pdf.setFont('helvetica', this.config.fonts.small.weight as any);
    
    if (data.signatureImage) {
      const signatureAdded = this.addImageSafely(
        data.signatureImage,
        centerX - signature.maxWidth / 2,
        startY - 5,
        signature.maxWidth,
        signature.maxHeight
      );
      
      if (signatureAdded) {
        const detailsY = startY + signature.maxHeight + 2;
        
        if (data.signatureName) {
          this.setColor(this.config.colors.text);
          this.pdf.setFontSize(10);
          this.pdf.setFont('helvetica', 'bold');
          this.pdf.text(data.signatureName, centerX, detailsY, { align: 'center' });
        }
        
        if (data.signatureTitle) {
          this.setColor(this.config.colors.textLight);
          this.pdf.setFontSize(9);
          this.pdf.setFont('helvetica', 'normal');
          this.pdf.text(data.signatureTitle, centerX, detailsY + 5, { align: 'center' });
        }
        
        return detailsY + 10;
      }
    }
    
    this.setDrawColor(this.config.colors.textLight);
    this.pdf.setLineWidth(0.3);
    this.pdf.line(centerX - signature.lineWidth/2, startY, centerX + signature.lineWidth/2, startY);
    
    const signatureText = data.signatureName || this.config.text.footer.signature;
    this.pdf.text(signatureText, centerX, startY + 6, { align: 'center' });
    
    if (data.signatureTitle) {
      this.pdf.text(data.signatureTitle, centerX, startY + 12, { align: 'center' });
      return startY + 20;
    }

    return startY + 15;
  }

  private drawFooter(data: DonationData, startY: number): number {
    const centerX = this.pageWidth / 2;
    
    this.setFillColor(this.config.colors.background);
    this.pdf.roundedRect(20, startY, this.pageWidth - 40, 25, 2, 2, 'F');
    
    this.setColor(this.config.colors.textLight);
    this.pdf.setFontSize(this.config.fonts.small.size);
    this.pdf.setFont('helvetica', this.config.fonts.small.weight as any);
    
    this.pdf.text('Transaction Details:', 25, startY + 6);
    this.pdf.text(`ID: ${data.transactionId}`, 25, startY + 12);
    this.pdf.text(`Date: ${data.donationDate.toLocaleDateString()}`, 25, startY + 18);
    
    this.pdf.text(this.config.text.footer.generated, this.pageWidth - 25, startY + 6, { align: 'right' });
    this.pdf.text(new Date().toLocaleDateString(), this.pageWidth - 25, startY + 12, { align: 'right' });
    
    if (data.orgTaxId) {
      this.pdf.setFontSize(8);
      this.pdf.text(`Tax ID: ${data.orgTaxId} | ${this.config.text.footer.taxNote}`, centerX, startY + 21, { align: 'center' });
    }

    return startY + 30;
  }

  private drawBorder(): void {
    const margin = this.config.layout.pageMargin;
    
    this.setDrawColor(this.config.colors.primaryLight);
    this.pdf.setLineWidth(1.5);
    this.pdf.rect(margin, margin, this.pageWidth - (margin * 2), this.pageHeight - (margin * 2), 'S');
    
    this.setFillColor(this.config.colors.gold);
    const accentSize = 20;
    const accentThickness = 2;
    
    // Corner accents
    this.pdf.rect(margin, margin, accentSize, accentThickness, 'F');
    this.pdf.rect(margin, margin, accentThickness, accentSize, 'F');
    this.pdf.rect(this.pageWidth - margin - accentSize, margin, accentSize, accentThickness, 'F');
    this.pdf.rect(this.pageWidth - margin - accentThickness, margin, accentThickness, accentSize, 'F');
    this.pdf.rect(margin, this.pageHeight - margin - accentThickness, accentSize, accentThickness, 'F');
    this.pdf.rect(margin, this.pageHeight - margin - accentSize, accentThickness, accentSize, 'F');
    this.pdf.rect(this.pageWidth - margin - accentSize, this.pageHeight - margin - accentThickness, accentSize, accentThickness, 'F');
    this.pdf.rect(this.pageWidth - margin - accentThickness, this.pageHeight - margin - accentSize, accentThickness, accentSize, 'F');
  }

  public build(data: DonationData): jsPDF {
    let currentY = 0;
    
    currentY = this.drawBackground();
    currentY = this.drawHeader(data);
    currentY = this.drawTitle(data, currentY);
    currentY = this.drawContentCard(data, currentY);
    currentY = this.drawImpactStatement(data, currentY);
    currentY = this.drawSignature(data, currentY);
    currentY = this.drawFooter(data, currentY);
    this.drawBorder();
    
    return this.pdf;
  }
}

// ========================================
// MAIN EXPORT FUNCTION
// ========================================

export function generateDonationCertificate(
  donationData: DonationData, 
  customConfig?: Partial<CertificateConfig>
): CertificateGenerationResult {
  try {
    // Removed server-side auth check - now purely client-side
    
    // Deep merge configuration
    const config: CertificateConfig = customConfig 
      ? mergeConfig(defaultConfig, customConfig)
      : defaultConfig;
    
    const builder = new CertificateBuilder(config);
    const pdf = builder.build(donationData);

    const pdfBuffer = pdf.output('arraybuffer');
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(pdfBlob);
    
    const filename = donationData.donationType === 'project'
      ? `isee-${donationData.transactionId}.pdf`
      : `isee-${donationData.transactionId}.pdf`;
    
    return {
      success: true,
      pdf: Buffer.from(pdfBuffer),
      pdfBlob,
      blobUrl,
      filename: filename.toLowerCase(),
      metadata: {
        donorName: donationData.donorName,
        amount: donationData.amount,
        currency: donationData.currency,
        donationType: donationData.donationType,
        projectTitle: donationData.projectTitle,
        transactionId: donationData.transactionId,
        generatedAt: new Date().toISOString(),
      },
      actions: {
        openInNewTab: () => openPdfInNewTab(blobUrl, filename.toLowerCase()),
        download: () => downloadPdf(blobUrl, filename.toLowerCase()),
        cleanup: () => URL.revokeObjectURL(blobUrl)
      }
    };

  } catch (error) {
    console.error('Certificate generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate certificate',
      details: error instanceof Error ? error.stack : undefined
    };
  }
}

// Helper function for deep merging configuration
function mergeConfig(
  defaultConfig: CertificateConfig, 
  customConfig: Partial<CertificateConfig>
): CertificateConfig {
  return {
    colors: { ...defaultConfig.colors, ...customConfig.colors },
    layout: {
      ...defaultConfig.layout,
      ...customConfig.layout,
      logo: { ...defaultConfig.layout.logo, ...customConfig.layout?.logo },
      signature: { ...defaultConfig.layout.signature, ...customConfig.layout?.signature }
    },
    fonts: { ...defaultConfig.fonts, ...customConfig.fonts },
    text: {
      ...defaultConfig.text,
      ...customConfig.text,
      subtitle: { ...defaultConfig.text.subtitle, ...customConfig.text?.subtitle },
      projectText: { ...defaultConfig.text.projectText, ...customConfig.text?.projectText },
      generalText: { ...defaultConfig.text.generalText, ...customConfig.text?.generalText },
      impactMessages: { ...defaultConfig.text.impactMessages, ...customConfig.text?.impactMessages },
      footer: { ...defaultConfig.text.footer, ...customConfig.text?.footer }
    },
    currency: { ...defaultConfig.currency, ...customConfig.currency }
  };
}

// Validation function with better typing
export function validateDonationData(data: Partial<DonationData>): ValidationResult {
  const errors: string[] = [];

  if (!data.donorName?.trim()) {
    errors.push('Donor name is required');
  }

  if (!data.amount || data.amount <= 0) {
    errors.push('Valid donation amount is required');
  }

  if (!data.currency?.trim()) {
    errors.push('Currency is required');
  }

  if (!data.donationType || !(['project', 'general'] as const).includes(data.donationType as DonationType)) {
    errors.push('Valid donation type is required (project or general)');
  }

  if (data.donationType === 'project' && !data.projectTitle?.trim()) {
    errors.push('Project title is required for project donations');
  }

  if (!data.transactionId?.trim()) {
    errors.push('Transaction ID is required');
  }

  if (!data.orgName?.trim()) {
    errors.push('Organization name is required');
  }

  // Updated date validation without parseToDate dependency
  if (!data.donationDate) {
    errors.push('Donation date is required');
  } else {
    const date = data.donationDate instanceof Date ? data.donationDate : new Date(data.donationDate);
    if (isNaN(date.getTime())) {
      errors.push('Valid donation date is required');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: Object.freeze(errors)
  };
}

// ========================================
// PDF PREVIEW AND DOWNLOAD UTILITIES
// ========================================

export function openPdfInNewTab(blobUrl: string, filename: string): Window | null {
  try {
    const newTab = window.open(blobUrl, '_blank');
    
    if (newTab) {
      // Set the document title to the filename for better UX
      newTab.onload = () => {
        try {
          newTab.document.title = filename;
        } catch (error) {
          // Cross-origin restrictions might prevent this, which is fine
          console.debug('Could not set tab title:', error);
        }
      };
      
      return newTab;
    } else {
      // Popup blocked - fallback to download
      console.warn('Popup blocked, falling back to download');
      downloadPdf(blobUrl, filename);
      return null;
    }
  } catch (error) {
    console.error('Error opening PDF in new tab:', error);
    downloadPdf(blobUrl, filename);
    return null;
  }
}

export function downloadPdf(blobUrl: string, filename: string): void {
  try {
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = filename;
    downloadLink.style.display = 'none';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    // Fallback: open in same tab
    window.location.href = blobUrl;
  }
}

// ========================================
// CERTIFICATE PREVIEW COMPONENT UTILITIES
// ========================================

interface CertificatePreviewOptions {
  showPreviewFirst?: boolean;
  autoCleanup?: boolean;
  cleanupDelay?: number; // in milliseconds
  onPreviewOpen?: (tab: Window | null) => void;
  onDownloadComplete?: () => void;
  onCleanup?: () => void;
}

export function createCertificateActions(
  result: CertificateResult,
  options: CertificatePreviewOptions = {}
) {
  const {
    showPreviewFirst = true,
    autoCleanup = true,
    cleanupDelay = 30000, // 30 seconds
    onPreviewOpen,
    onDownloadComplete,
    onCleanup
  } = options;

  let cleanupTimer: NodeJS.Timeout | null = null;

  const preview = () => {
    const tab = result.actions.openInNewTab();
    onPreviewOpen?.(tab);
    
    if (autoCleanup) {
      scheduleCleanup();
    }
    
    return tab;
  };

  const download = () => {
    result.actions.download();
    onDownloadComplete?.();
    
    if (autoCleanup) {
      scheduleCleanup();
    }
  };

  const cleanup = () => {
    if (cleanupTimer) {
      clearTimeout(cleanupTimer);
      cleanupTimer = null;
    }
    
    result.actions.cleanup();
    onCleanup?.();
  };

  const scheduleCleanup = () => {
    if (cleanupTimer) {
      clearTimeout(cleanupTimer);
    }
    
    cleanupTimer = setTimeout(() => {
      cleanup();
    }, cleanupDelay);
  };

  const previewThenDownload = () => {
    const tab = preview();
    
    // Wait a moment for the preview to load, then offer download
    setTimeout(() => {
      if (confirm('Would you like to download the certificate?')) {
        download();
      }
    }, 1000);
    
    return tab;
  };

  return {
    preview,
    download,
    cleanup,
    previewThenDownload,
    // Combined action based on preference
    execute: showPreviewFirst ? previewThenDownload : download
  };
}

// ========================================
// REACT HOOK FOR CERTIFICATE MANAGEMENT
// ========================================

export interface UseCertificateReturn {
  generateCertificate: (
    data: DonationData, 
    config?: Partial<CertificateConfig>
  ) => void; // Changed from Promise<void> to void
  isGenerating: boolean;
  error: string | null;
  result: CertificateResult | null;
  preview: () => Window | null;
  download: () => void;
  cleanup: () => void;
  reset: () => void;
}

// For React applications - usage example
/*
export function useCertificate(
  options: CertificatePreviewOptions = {}
): UseCertificateReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CertificateResult | null>(null);

  const generateCertificate = (
    data: DonationData,
    config?: Partial<CertificateConfig>
  ) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const certificateResult = generateDonationCertificate(data, config); // Now synchronous
      
      if (certificateResult.success) {
        setResult(certificateResult);
      } else {
        setError(certificateResult.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  const actions = result ? createCertificateActions(result, options) : null;

  const reset = () => {
    if (result) {
      result.actions.cleanup();
    }
    setResult(null);
    setError(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (result) {
        result.actions.cleanup();
      }
    };
  }, [result]);

  return {
    generateCertificate,
    isGenerating,
    error,
    result,
    preview: () => actions?.preview() || null,
    download: () => actions?.download(),
    cleanup: () => actions?.cleanup(),
    reset
  };
}
*/

export function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image'));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function validateImage(file: File): ValidationResult {
  const errors: string[] = [];
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'] as const;
  
  if (!allowedTypes.includes(file.type as typeof allowedTypes[number])) {
    errors.push('Image must be PNG or JPEG format');
  }
  
  if (file.size > maxSize) {
    errors.push('Image must be smaller than 5MB');
  }
  
  return {
    isValid: errors.length === 0,
    errors: Object.freeze(errors)
  };
}

export function resizeImage(
  file: File, 
  maxWidth: number = 400, 
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (quality < 0 || quality > 1) {
      reject(new Error('Quality must be between 0 and 1'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// Export types for external use
export type {
  DonationData,
  CertificateConfig,
  CertificateGenerationResult,
  CertificateResult,
  CertificateError,
  ValidationResult,
  ImageInput,
  DonationType,
  CurrencyDisplayMode,
  CertificatePreviewOptions
};

// ========================================
// USAGE EXAMPLES WITH PREVIEW FUNCTIONALITY
// ========================================

/*
// ========================
// BASIC USAGE WITH PREVIEW
// ========================

// Simple preview then download
const handleGenerateCertificate = () => {
  const result = generateDonationCertificate(donationData); // Now synchronous!
  
  if (result.success) {
    // Option 1: Open in new tab first
    const previewTab = result.actions.openInNewTab();
    
    if (previewTab) {
      // User can see the certificate, then choose to download
      console.log('Certificate opened for preview');
      
      // Optionally, auto-download after a delay
      setTimeout(() => {
        if (confirm('Download certificate?')) {
          result.actions.download();
        }
      }, 2000);
    }
    
    // Clean up blob URL after use (important for memory management)
    setTimeout(() => {
      result.actions.cleanup();
    }, 30000); // Clean up after 30 seconds
  }
};

// ========================
// ADVANCED USAGE WITH ACTIONS
// ========================

const handleCertificateWithOptions = () => {
  const result = generateDonationCertificate(donationData); // Synchronous
  
  if (result.success) {
    const actions = createCertificateActions(result, {
      showPreviewFirst: true,
      autoCleanup: true,
      cleanupDelay: 60000, // 1 minute
      onPreviewOpen: (tab) => {
        if (tab) {
          console.log('Certificate preview opened');
        } else {
          console.log('Preview blocked, downloaded instead');
        }
      },
      onDownloadComplete: () => {
        console.log('Certificate downloaded');
        // Maybe show a success message
      },
      onCleanup: () => {
        console.log('Certificate resources cleaned up');
      }
    });

    // Execute the preferred action (preview first by default)
    actions.execute();
  }
};

// ========================
// REACT COMPONENT EXAMPLE
// ========================

function CertificateGenerator() {
  const [donationData, setDonationData] = useState<DonationData>(...);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<CertificateResult | null>(null);

  const handleGenerate = () => {
    setIsGenerating(true);
    try {
      const certificateResult = generateDonationCertificate(donationData); // Synchronous
      
      if (certificateResult.success) {
        setResult(certificateResult);
      } else {
        alert(certificateResult.error);
      }
    } catch (error) {
      alert('Failed to generate certificate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = () => {
    if (result) {
      result.actions.openInNewTab();
    }
  };

  const handleDownload = () => {
    if (result) {
      result.actions.download();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (result) {
        result.actions.cleanup();
      }
    };
  }, [result]);

  return (
    <div>
      <button 
        onClick={handleGenerate} 
        disabled={isGenerating}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        {isGenerating ? 'Generating...' : 'Generate Certificate'}
      </button>

      {result && (
        <div className="mt-4 space-x-2">
          <button
            onClick={handlePreview}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Preview Certificate
          </button>
          
          <button
            onClick={handleDownload}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Download Certificate
          </button>
        </div>
      )}
    </div>
  );
}

// ========================
// CUSTOM HOOK USAGE
// ========================

function CertificateGeneratorWithHook() {
  const [donationData, setDonationData] = useState<DonationData>(...);
  
  const {
    generateCertificate,
    isGenerating,
    error,
    result,
    preview,
    download,
    cleanup,
    reset
  } = useCertificate({
    showPreviewFirst: true,
    autoCleanup: true,
    cleanupDelay: 30000,
    onPreviewOpen: (tab) => {
      if (tab) {
        toast.success('Certificate preview opened!');
      }
    },
    onDownloadComplete: () => {
      toast.success('Certificate downloaded!');
    }
  });

  const handleGenerate = () => {
    generateCertificate(donationData); // Now synchronous
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate Certificate'}
      </button>

      {error && (
        <div className="text-red-600 mt-2">{error}</div>
      )}

      {result && (
        <div className="mt-4 space-x-2">
          <button onClick={preview} className="bg-blue-600 text-white px-4 py-2 rounded">
            Preview
          </button>
          <button onClick={download} className="bg-green-600 text-white px-4 py-2 rounded">
            Download
          </button>
          <button onClick={reset} className="bg-gray-600 text-white px-4 py-2 rounded">
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

// ========================
// MOBILE-FRIENDLY APPROACH
// ========================

const handleMobileFriendly = () => {
  const result = generateDonationCertificate(donationData); // Synchronous
  
  if (result.success) {
    // On mobile, direct download might be better UX
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Direct download on mobile
      result.actions.download();
    } else {
      // Preview on desktop
      const tab = result.actions.openInNewTab();
      if (!tab) {
        // Fallback to download if popup blocked
        result.actions.download();
      }
    }
    
    // Auto cleanup
    setTimeout(() => result.actions.cleanup(), 30000);
  }
};

// ========================
// BATCH CERTIFICATE GENERATION
// ========================

const handleBatchGeneration = (donations: DonationData[]) => {
  const results: CertificateResult[] = [];
  
  for (const donation of donations) {
    const result = generateDonationCertificate(donation); // Synchronous
    if (result.success) {
      results.push(result);
    }
  }
  
  // Open all certificates in tabs (browser might limit this)
  results.forEach((result, index) => {
    setTimeout(() => {
      result.actions.openInNewTab();
    }, index * 500); // Stagger the openings
  });
  
  // Provide bulk download option
  const downloadAll = () => {
    results.forEach((result, index) => {
      setTimeout(() => {
        result.actions.download();
      }, index * 200); // Stagger downloads
    });
  };
  
  // Cleanup all
  const cleanupAll = () => {
    results.forEach(result => result.actions.cleanup());
  };
  
  return { results, downloadAll, cleanupAll };
};
*/
import React, { useState, useEffect } from "react";
import { Download, FileText, Loader2, Check, AlertCircle, Eye } from "lucide-react";
import { alexSignatureBase64 } from "@/lib/constants";
import { CertificateResult, DonationData, generateDonationCertificate } from "@/lib/utils/certificate-generator";


interface ReceiptDownloadButtonProps {
  transaction: {
    id: string;
    project_title?: string;
    amount: number;
    paid_at: string;
    payment_method?: string;
    currency: string;
  };
  donorName?: string;
  orgName?: string;
  className?: string;
}

const ReceiptDownloadButton: React.FC<ReceiptDownloadButtonProps> = ({
  transaction,
  donorName = "Anonymous Donor",
  orgName = "INTERVENTION FOR South East Education",
  className = "",
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certificateResult, setCertificateResult] = useState<CertificateResult | null>(null);
  const [showActions, setShowActions] = useState(false);

  // Cleanup certificate resources on unmount
  useEffect(() => {
    return () => {
      if (certificateResult) {
        certificateResult.actions.cleanup();
      }
    };
  }, [certificateResult]);

  const handleGenerate = async () => {
    if (isGenerating) return;

    try {
      setIsGenerating(true);
      setError(null);
      setShowActions(false);

      const logoRes = await fetch("/favicon.png", { cache: "force-cache" });
      if (!logoRes.ok) {
        throw new Error("Could not load organization logo");
      }
      const logoBlob = await logoRes.blob();
      const orgLogoDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") resolve(reader.result);
          else reject(new Error("Could not read organization logo"));
        };
        reader.onerror = () => reject(reader.error ?? new Error("Could not read organization logo"));
        reader.readAsDataURL(logoBlob);
      });

      // Prepare donation data (org logo matches site favicon: public/favicon.png)
      const donationData: DonationData = {
        donorName,
        amount: Number(transaction.amount),
        currency: transaction.currency,
        donationType: transaction.project_title ? "project" : "general",
        donationDate: new Date(transaction.paid_at),
        transactionId: transaction.id,
        projectTitle: transaction.project_title,
        orgName,
        orgLogo: orgLogoDataUrl,
        signatureImage: alexSignatureBase64,
        signatureName: "Alex Onyia",
        signatureTitle: "Executive Director",
        paymentMethod: transaction.payment_method,
        orgWebsite: "https://example.com"
      };

      const result = generateDonationCertificate(donationData);

      if (result.success) {
        setCertificateResult(result);
        setShowActions(true);
        setIsComplete(true);

        setTimeout(() => {
          if (showActions) {
            setIsComplete(false);
          }
        }, 3000);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Certificate generation failed:", error);
      setError(error instanceof Error ? error.message : "Generation failed");
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = () => {
    if (certificateResult) {
      const tab = certificateResult.actions.openInNewTab();
      if (tab) {
        // Preview opened successfully
        console.log("Certificate preview opened");
      } else {
        // Popup blocked or failed - fallback to download
        handleDirectDownload();
      }
    }
  };

  const handleDirectDownload = () => {
    if (certificateResult) {
      certificateResult.actions.download();
      
      // Show download success
      setIsComplete(true);
      setTimeout(() => {
        setIsComplete(false);
        setShowActions(false);
      }, 2000);
    }
  };

  const handleClose = () => {
    if (certificateResult) {
      certificateResult.actions.cleanup();
      setCertificateResult(null);
    }
    setShowActions(false);
    setIsComplete(false);
  };

  const getMainButtonContent = () => {
    const getIcon = () => {
      switch (true) {
        case !!error:
          return <AlertCircle className="w-4 h-4" />;
        case isComplete && !showActions:
          return <Check className="w-4 h-4" />;
        case isGenerating:
          return <Loader2 className="w-4 h-4 animate-spin" />;
        default:
          return <FileText className="w-4 h-4" />;
      }
    };

    const getText = () => {
      if (error) return "Error";
      if (isComplete && !showActions) return "Ready";
      if (isGenerating) return "Generating";
      return "Certificate";
    };

    return (
      <span className="flex items-center space-x-1">
        <span className="text-xs">{getText()}</span>
        {getIcon()}
      </span>
    );
  };

  const getMainButtonStyles = () => {
    if (error) {
      return "bg-red-50 text-red-600 border-red-200 hover:bg-red-100";
    }

    if (isComplete && !showActions) {
      return "bg-green-50 text-green-600 border-green-200 hover:bg-green-100";
    }

    if (isGenerating) {
      return "bg-blue-50 text-blue-600 border-blue-200 cursor-not-allowed";
    }

    return "bg-white text-theme-600 border-theme-200 hover:bg-theme-50 hover:text-theme-700 hover:border-theme-300";
  };

  const getTooltipText = () => {
    if (error) return `Error: ${error}`;
    if (isComplete && !showActions) return "Certificate ready";
    if (isGenerating) return "Generating certificate...";
    return "Generate certificate";
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className={`
          inline-flex items-center justify-center p-2
          border rounded-lg transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-theme-500 focus:ring-offset-1
          ${getMainButtonStyles()}
        `}
        title={getTooltipText()}
      >
        {getMainButtonContent()}
      </button>

      {/* Action Buttons (Preview/Download) */}
      {showActions && certificateResult && (
        <div className="absolute top-0 right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
          <div className="flex items-center space-x-2">
            {/* Preview Button */}
            <button
              onClick={handlePreview}
              className="flex items-center space-x-1 px-3 py-2 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
              title="Preview certificate in new tab"
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>

            {/* Download Button */}
            <button
              onClick={handleDirectDownload}
              className="flex items-center space-x-1 px-3 py-2 text-xs bg-green-50 text-green-600 border border-green-200 rounded hover:bg-green-100 transition-colors"
              title="Download certificate directly"
            >
              <Download className="w-3 h-3" />
              <span>Download</span>
            </button>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-6 h-6 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              title="Close"
            >
              ×
            </button>
          </div>

        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute top-full left-0 mt-1 z-10 p-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default ReceiptDownloadButton;

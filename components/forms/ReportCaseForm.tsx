"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, User, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Step1PersonalInfo from "./case-steps/Step1PersonalInfo";
import Step2CaseDetails from "./case-steps/Step2CaseDetails";
import Step3Confirmation from "./case-steps/Step3Confirmation";

interface UploadedFile {
  url: string;
  name: string;
  size: number;
  mimeType: string;
  preview?: string;
}

interface FormData {
  // Step 1
  full_name: string;
  phone: string;
  email: string;
  state_id: string;
  lga_id: string;
  town: string;
  reporting_for: "myself" | "someone_else";
  beneficiary_name: string;
  relationship: string;
  // Step 2
  help_type: string;
  description: string;
  files: UploadedFile[];
  // Step 3
  info_confirmed: boolean;
  contact_consent: boolean;
  updates_consent: boolean;
}

const INITIAL_FORM_DATA: FormData = {
  full_name: "",
  phone: "",
  email: "",
  state_id: "",
  lga_id: "",
  town: "",
  reporting_for: "myself",
  beneficiary_name: "",
  relationship: "",
  help_type: "",
  description: "",
  files: [],
  info_confirmed: false,
  contact_consent: false,
  updates_consent: false,
};

// Step Progress Indicator Component
const StepProgressIndicator = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { number: 1, label: "Personal Info", icon: User },
    { number: 2, label: "Case Details", icon: FileText },
    { number: 3, label: "Confirmation", icon: Check },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border">
          <div
            className="h-full bg-theme-600 transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const Icon = step.icon;

          return (
            <div key={step.number} className="flex flex-col items-center relative z-10 flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? "bg-theme-600 border-theme-600 text-white"
                    : isCurrent
                      ? "bg-white border-theme-600 text-theme-600 shadow-lg"
                      : "bg-white border-border text-stone-200"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={`text-xs sm:text-sm font-medium transition-colors ${
                    isCurrent ? "text-theme-700" : isCompleted ? "text-theme-600" : "text-stone-200"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function ReportCaseForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const [caseReferenceId, setCaseReferenceId] = useState("");

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Full name is required";
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      newErrors.phone = "Valid phone number is required (min 10 digits)";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.state_id) {
      newErrors.state_id = "Please select a state";
    }
    if (!formData.lga_id) {
      newErrors.lga_id = "Please select an LGA";
    }
    if (!formData.town.trim()) {
      newErrors.town = "Town is required";
    }

    // Validate conditional fields
    if (formData.reporting_for === "someone_else") {
      if (!formData.beneficiary_name.trim()) {
        newErrors.beneficiary_name = "Beneficiary name is required";
      }
      if (!formData.relationship.trim()) {
        newErrors.relationship = "Relationship is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.help_type) {
      newErrors.help_type = "Please select a type of help";
    }
    if (!formData.description.trim() || formData.description.length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.info_confirmed) {
      newErrors.info_confirmed = "You must confirm the information is truthful";
    }
    if (!formData.contact_consent) {
      newErrors.contact_consent = "You must consent to being contacted";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    let isValid = false;

    if (currentStep === 1) {
      isValid = validateStep1();
    } else if (currentStep === 2) {
      isValid = validateStep2();
    }

    if (isValid && currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const uploadFiles = async (): Promise<UploadedFile[]> => {
    if (!formData.files || formData.files.length === 0) {
      return [];
    }

    // Filter files that need to be uploaded (have preview but no url)
    const filesToUpload = formData.files.filter((f) => f.preview && !f.url);

    if (filesToUpload.length === 0) {
      return formData.files; // All files already uploaded
    }

    const formDataToUpload = new FormData();

    // Convert preview URLs back to File objects
    for (const file of filesToUpload) {
      if (file.preview) {
        const response = await fetch(file.preview);
        const blob = await response.blob();
        const fileObject = new File([blob], file.name, { type: file.mimeType });
        formDataToUpload.append("files", fileObject);
      }
    }

    const response = await fetch("/api/cases/upload", {
      method: "POST",
      body: formDataToUpload,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload files");
    }

    const result = await response.json();
    return result.files || [];
  };

  const handleSubmit = async () => {
    // Validate Step 3
    if (!validateStep3()) {
      return;
    }

    startTransition(async () => {
      try {
        // Upload files first
        let uploadedFiles: UploadedFile[] = [];
        if (formData.files && formData.files.length > 0) {
          toast.loading("Uploading images...");
          uploadedFiles = await uploadFiles();
          toast.dismiss();
        }

        // Prepare case data
        const caseData = {
          full_name: formData.full_name,
          phone: formData.phone,
          email: formData.email || "",
          state_id: formData.state_id,
          lga_id: formData.lga_id,
          town: formData.town,
          reporting_for: formData.reporting_for,
          beneficiary_name:
            formData.reporting_for === "someone_else"
              ? formData.beneficiary_name
              : undefined,
          relationship:
            formData.reporting_for === "someone_else"
              ? formData.relationship
              : undefined,
          help_type: formData.help_type,
          description: formData.description,
          info_confirmed: formData.info_confirmed,
          contact_consent: formData.contact_consent,
          updates_consent: formData.updates_consent,
          files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        };

        // Submit case
        const response = await fetch("/api/cases/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(caseData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to submit case");
        }

        const result = await response.json();

        // Show success
        setCaseReferenceId(result.caseReferenceId);
        setIsSuccess(true);
        toast.success("Case submitted successfully!");

        // Clean up preview URLs
        formData.files.forEach((file) => {
          if (file.preview) {
            URL.revokeObjectURL(file.preview);
          }
        });
      } catch (error: any) {
        console.error("Error submitting case:", error);
        toast.error(error.message || "Failed to submit case. Please try again.");
      }
    });
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(1);
    setErrors({});
    setIsSuccess(false);
    setCaseReferenceId("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoHome = () => {
    router.push("/");
  };

  // Success State
  if (isSuccess) {
    return (
      <Card className="w-full bg-white/90 backdrop-blur-sm border-white/50 shadow-2xl">
        <CardContent className="pt-12 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-theme-600/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-theme-600" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-p-dark">
              Thank You!
            </h2>
            <p className="text-stone-200 text-lg">
              Your case has been submitted successfully.
            </p>
          </div>

          <div className="p-6 bg-theme-600/5 border border-theme-600/20 rounded-xl">
            <p className="text-sm text-stone-200 mb-3">
              Your Case Reference ID:
            </p>
            <p className="text-3xl font-bold text-theme-700 font-mono tracking-wide">
              {caseReferenceId}
            </p>
            <p className="text-xs text-stone-200 mt-3">
              Please save this reference ID for tracking your case.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <p className="text-sm text-stone-200">
              Our team will review your case and contact you within 30 business
              days for verification, if we find your case valid.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleGoHome}
                variant="default"
                className="bg-theme-500 hover:bg-theme-600 text-white h-12 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Go to Homepage
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="hover:bg-white/50 h-12 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Submit Another Case
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Form Steps
  return (
    <Card className="w-full bg-white/90 backdrop-blur-sm border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-300">
      <CardHeader className="space-y-6">
        <StepProgressIndicator currentStep={currentStep} />
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-p-dark">
            {currentStep === 1 && "Personal Information"}
            {currentStep === 2 && "Case Details"}
            {currentStep === 3 && "Review & Confirm"}
          </h2>
          <p className="text-sm text-stone-200">
            {currentStep === 1 && "Tell us about yourself so we can reach you"}
            {currentStep === 2 && "Describe the help you need in detail"}
            {currentStep === 3 && "Review your information and submit"}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step Content */}
        {currentStep === 1 && (
          <Step1PersonalInfo
            formData={formData}
            onChange={handleFieldChange}
            errors={errors}
          />
        )}

        {currentStep === 2 && (
          <Step2CaseDetails
            formData={formData}
            onChange={handleFieldChange}
            errors={errors}
          />
        )}

        {currentStep === 3 && (
          <Step3Confirmation
            formData={formData}
            onChange={handleFieldChange}
            errors={errors}
          />
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || isPending}
            className="hover:bg-white/50 h-12 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isPending}
              className="bg-theme-500 hover:bg-theme-600 text-white h-12 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="bg-theme-500 hover:bg-theme-600 text-white min-w-32 h-12 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Case"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

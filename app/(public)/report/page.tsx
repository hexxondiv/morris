import { Metadata } from "next";
import ReportCaseForm from "@/components/forms/ReportCaseForm";

export const metadata: Metadata = {
  title: "Report a Case | SEEI",
  description:
    "Request educational assistance or report a case that needs support. Our team is here to help students and communities in Southeast Nigeria.",
};

export default function ReportCasePage() {
  return (
    <div className="min-h-screen bg-theme-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-10 space-y-6">
          <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-white/50 px-4 py-2 rounded-full shadow-lg">
            <div className="w-2 h-2 rounded-full bg-theme-600 animate-pulse"></div>
            <span className="text-sm font-medium text-theme-700">
              Help Request Portal
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-p-dark">
            Report a Case / Request Help
          </h1>
          <p className="text-base sm:text-lg text-stone-200 max-w-2xl mx-auto leading-relaxed">
            We're committed to supporting education in Southeast Nigeria. If you
            or someone you know needs assistance, please complete this form and
            our team will review your case.
          </p>
        </div>

        {/* Two Column Layout: Form + Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left: Form - takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <ReportCaseForm />
          </div>

          {/* Right: Info Cards - takes 1 column, sticky on large screens */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-8 space-y-6">
              <div className="p-6 bg-white/80 backdrop-blur-sm border border-white/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="text-lg font-semibold text-p-dark mb-3">
                  What to Expect
                </h3>
                <ul className="space-y-2 text-sm text-stone-200">
                  <li className="flex items-start">
                    <span className="text-theme-600 mr-2">•</span>
                    <span>
                      After submission, you'll receive a unique Case Reference
                      ID to track your request.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-theme-600 mr-2">•</span>
                    <span>
                      Our team will review your case within 30 days and reach out to you for verification, if we find your case valid.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-theme-600 mr-2">•</span>
                    <span>
                      All information provided is kept confidential and used
                      solely for processing your request.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

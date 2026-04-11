"use client";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Step3ConfirmationProps {
  formData: {
    info_confirmed: boolean;
    contact_consent: boolean;
    updates_consent: boolean;
  };
  onChange: (field: string, value: boolean) => void;
  errors: Record<string, string>;
}

export default function Step3Confirmation({
  formData,
  onChange,
  errors,
}: Step3ConfirmationProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-theme-800 dark:text-theme-100 mb-2">
          Confirmation
        </h3>
        <p className="text-sm text-muted-foreground">
          Please review and confirm the following statements before submitting.
        </p>
      </div>

      {/* Info Confirmed Checkbox */}
      <div className="space-y-3">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="info_confirmed"
            checked={formData.info_confirmed}
            onCheckedChange={(checked) =>
              onChange("info_confirmed", checked === true)
            }
            className={errors.info_confirmed ? "border-destructive" : ""}
          />
          <div className="space-y-1 leading-none">
            <Label
              htmlFor="info_confirmed"
              className="text-sm font-normal cursor-pointer"
            >
              I confirm that the information I have provided is true and
              accurate to the best of my knowledge.{" "}
              <span className="text-destructive">*</span>
            </Label>
          </div>
        </div>
        {errors.info_confirmed && (
          <p className="text-sm text-destructive ml-7">
            {errors.info_confirmed}
          </p>
        )}
      </div>

      {/* Contact Consent Checkbox */}
      <div className="space-y-3">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="contact_consent"
            checked={formData.contact_consent}
            onCheckedChange={(checked) =>
              onChange("contact_consent", checked === true)
            }
            className={errors.contact_consent ? "border-destructive" : ""}
          />
          <div className="space-y-1 leading-none">
            <Label
              htmlFor="contact_consent"
              className="text-sm font-normal cursor-pointer"
            >
              I consent to being contacted by the organization for verification
              and follow-up regarding this case.{" "}
              <span className="text-destructive">*</span>
            </Label>
          </div>
        </div>
        {errors.contact_consent && (
          <p className="text-sm text-destructive ml-7">
            {errors.contact_consent}
          </p>
        )}
      </div>

      {/* Updates Consent Checkbox (Optional) */}
      <div className="space-y-3">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="updates_consent"
            checked={formData.updates_consent}
            onCheckedChange={(checked) =>
              onChange("updates_consent", checked === true)
            }
          />
          <div className="space-y-1 leading-none">
            <Label
              htmlFor="updates_consent"
              className="text-sm font-normal cursor-pointer"
            >
              I would like to receive updates about the progress of my case
              (optional).
            </Label>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="mt-6 p-4 bg-theme-50 dark:bg-theme-900/30 border border-theme-200 dark:border-theme-800 rounded-md">
        <h4 className="text-sm font-semibold text-theme-800 dark:text-theme-100 mb-2">
          Privacy Notice
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your information will be handled confidentially and used solely for
          the purpose of processing your request. We respect your privacy and
          will not share your personal details with third parties without your
          consent, except as required by law or to provide the assistance you
          have requested.
        </p>
      </div>

      {/* Submission Note */}
      <div className="mt-4 p-4 bg-theme-100 dark:bg-theme-800/30 border border-theme-300 dark:border-theme-700 rounded-md">
        <p className="text-sm text-theme-700 dark:text-theme-300">
          <strong>What happens next?</strong>
          <br />
          After submitting your case, our team will review it and contact you
          within 30 business days for verification, if we find your case valid. You will receive a unique
          Case Reference ID that you can use to track your request.
        </p>
      </div>
    </div>
  );
}

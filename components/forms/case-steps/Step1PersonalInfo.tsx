"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Combobox } from "@/components/ui/combobox";
import { User, Users } from "lucide-react";

interface State {
  id: string;
  name: string;
}

interface LGA {
  id: string;
  name: string;
  state_id: string;
}

interface Step1PersonalInfoProps {
  formData: {
    full_name: string;
    phone: string;
    email: string;
    state_id: string;
    lga_id: string;
    town: string;
    reporting_for: "myself" | "someone_else";
    beneficiary_name: string;
    relationship: string;
  };
  onChange: (field: string, value: string) => void;
  errors: Record<string, string>;
}

export default function Step1PersonalInfo({
  formData,
  onChange,
  errors,
}: Step1PersonalInfoProps) {
  const [states, setStates] = useState<State[]>([]);
  const [lgas, setLgas] = useState<LGA[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingLgas, setLoadingLgas] = useState(false);

  // Fetch states on mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const response = await fetch("/api/states");
        const data = await response.json();
        if (data.states) {
          setStates(data.states);
        }
      } catch (error) {
        setStates([
          {
            id: "4",
            name: "Enugu"
          },
          { id: "5", name: "Abia" }
        ]);
        console.error("Error fetching states:", error);
      } finally {
        setLoadingStates(false);
      }
    };

    fetchStates();
  }, []);

  // Fetch LGAs when state changes
  useEffect(() => {
    const fetchLgas = async () => {
      if (!formData.state_id) {
        setLgas([]);
        return;
      }

      setLoadingLgas(true);
      try {
        const response = await fetch(`/api/states/${formData.state_id}/lgas`);
        const data = await response.json();
        if (data.lgas) {
          setLgas(data.lgas);
        }
      } catch (error) {
        setLgas([
          { id: "1", state_id: "4", name: "Enugu-North" },
          { id: "2", state_id: "4", name: "Enugu-South" },
          { id: "3", state_id: "4", name: "Igbo-Etiti" },
        ]);
        console.error("Error fetching LGAs:", error);
      } finally {
        setLoadingLgas(false);
      }
    };

    fetchLgas();
  }, [formData.state_id]);

  // Reset LGA when state changes
  const handleStateChange = (value: string) => {
    onChange("state_id", value);
    onChange("lga_id", ""); // Clear LGA selection
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-theme-800 dark:text-theme-100 mb-2">
          Personal Information
        </h3>
        <p className="text-sm text-muted-foreground">
          Please provide your contact details so we can reach you.
        </p>
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="full_name">
          Full Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="full_name"
          type="text"
          value={formData.full_name}
          onChange={(e) => onChange("full_name", e.target.value)}
          placeholder="Enter your full name"
          className={errors.full_name ? "border-destructive" : ""}
        />
        {errors.full_name && (
          <p className="text-sm text-destructive">{errors.full_name}</p>
        )}
      </div>

      {/* Phone Number + Email (Two Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="e.g., 08012345678"
            className={errors.phone ? "border-destructive" : ""}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="your.email@example.com"
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>
      </div>

      {/* State + LGA (Two Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="state">
            State <span className="text-destructive">*</span>
          </Label>
          <Combobox
            options={states.map((state) => ({
              value: state.id,
              label: state.name,
            }))}
            value={formData.state_id}
            onValueChange={handleStateChange}
            placeholder="Select your state"
            searchPlaceholder="Search states..."
            emptyText="No state found."
            disabled={loadingStates}
            className={errors.state_id ? "border-destructive" : ""}
          />
          {errors.state_id && (
            <p className="text-sm text-destructive">{errors.state_id}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lga">
            Local Government Area <span className="text-destructive">*</span>
          </Label>
          <Combobox
            options={lgas.map((lga) => ({
              value: lga.id,
              label: lga.name,
            }))}
            value={formData.lga_id}
            onValueChange={(value) => onChange("lga_id", value)}
            placeholder={
              !formData.state_id
                ? "Select state first"
                : loadingLgas
                  ? "Loading..."
                  : "Select your LGA"
            }
            searchPlaceholder="Search LGAs..."
            emptyText="No LGA found."
            disabled={!formData.state_id || loadingLgas}
            className={errors.lga_id ? "border-destructive" : ""}
          />
          {errors.lga_id && (
            <p className="text-sm text-destructive">{errors.lga_id}</p>
          )}
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="town">
          Address <span className="text-destructive">*</span>
        </Label>
        <Input
          id="town"
          type="text"
          value={formData.town}
          onChange={(e) => onChange("town", e.target.value)}
          placeholder="Enter your address"
          className={errors.town ? "border-destructive" : ""}
        />
        {errors.town && (
          <p className="text-sm text-destructive">{errors.town}</p>
        )}
      </div>

      {/* Reporting For */}
      <div className="space-y-3">
        <Label>
          I am reporting for <span className="text-destructive">*</span>
        </Label>
        <RadioGroup
          value={formData.reporting_for}
          onValueChange={(value) =>
            onChange("reporting_for", value as "myself" | "someone_else")
          }
          className="grid grid-cols-2 gap-4"
        >
          {/* Myself Option */}
          <div>
            <RadioGroupItem
              value="myself"
              id="myself"
              className="peer sr-only"
            />
            <label
              htmlFor="myself"
              className={`
                flex flex-col items-center justify-center rounded-xl border-2 p-4 cursor-pointer transition-all duration-200
                ${
                  formData.reporting_for === "myself"
                    ? "border-theme-500 bg-theme-50 text-theme-700 shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }
              `}
            >
              <User className="h-6 w-6 mb-2" />
              <span className="text-sm font-medium">Myself</span>
            </label>
          </div>

          {/* Someone Else Option */}
          <div>
            <RadioGroupItem
              value="someone_else"
              id="someone_else"
              className="peer sr-only"
            />
            <label
              htmlFor="someone_else"
              className={`
                flex flex-col items-center justify-center rounded-xl border-2 p-4 cursor-pointer transition-all duration-200
                ${
                  formData.reporting_for === "someone_else"
                    ? "border-theme-500 bg-theme-50 text-theme-700 shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }
              `}
            >
              <Users className="h-6 w-6 mb-2" />
              <span className="text-sm font-medium">Someone else</span>
            </label>
          </div>
        </RadioGroup>
      </div>

      {/* Conditional Fields for "Someone Else" */}
      {formData.reporting_for === "someone_else" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="beneficiary_name">
              Beneficiary Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="beneficiary_name"
              type="text"
              value={formData.beneficiary_name}
              onChange={(e) => onChange("beneficiary_name", e.target.value)}
              placeholder="Full name of the person you're reporting for"
              className={errors.beneficiary_name ? "border-destructive" : ""}
            />
            {errors.beneficiary_name && (
              <p className="text-sm text-destructive">
                {errors.beneficiary_name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship">
              Relationship to Beneficiary{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="relationship"
              type="text"
              value={formData.relationship}
              onChange={(e) => onChange("relationship", e.target.value)}
              placeholder="e.g., Parent, Guardian, Teacher, Friend"
              className={errors.relationship ? "border-destructive" : ""}
            />
            {errors.relationship && (
              <p className="text-sm text-destructive">{errors.relationship}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

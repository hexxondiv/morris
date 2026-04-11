"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { notify } from "./notify";

export default function ContributionEditForm() {
  const [amount, setAmount] = useState(5000);
  const [inputValue, setInputValue] = useState(amount);
  const [editing, setEditing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue >= 5) {
      setAmount(inputValue);
      setEditing(false);

      notify({
        title: "Contribution Updated",
        description: `Your contribution has been updated to ${formatCurrency(
          inputValue
        )}/mo.`,
        type: "success",
      });
    }
  };

  const handleCancel = () => {
    setInputValue(amount);
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      {!editing ? (
        <div className="space-y-4">
          <div className="text-4xl sm:text-5xl">
            <span className="font-medium">{formatCurrency(amount)}</span>
            <span className="text-base text-muted-foreground"> / mo</span>
          </div>
          <Button
            variant="secondary"
            className="button-secondary rounded-full"
            onClick={() => setEditing(true)}
          >
            Change it
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="text-4xl sm:text-5xl">
              <span className="font-medium">{formatCurrency(amount)}</span>
              <span className="text-base text-theme-500"> / mo</span>
            </div>
            <Label
              htmlFor="contributionAmount"
              className="text-base font-medium text-foreground"
            >
              Update amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">
                $
              </span>
              <Input
                id="contributionAmount"
                name="contributionAmount"
                type="number"
                min={5}
                value={inputValue}
                onChange={(e) => setInputValue(Number(e.target.value))}
                className="pl-8"
                required
              />
            </div>
          </div>

          <div className="flex justify-between">
            <Button type="submit" className="rounded-full">
              Update
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              className="rounded-full"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

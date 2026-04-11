"use client";

import { format } from "date-fns";
import { Control, Controller } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CalendarIcon } from "lucide-react";

interface DateTimePickerProps {
  control: Control<any>;
  name: string;
  label: string;
  description?: string;
  error?: string;
}

export function DateTimePicker({
  control,
  name,
  label,
  description,
  error,
}: DateTimePickerProps) {
  const handleTimeChange = (
    currentDate: Date | undefined,
    type: "hour" | "minute" | "ampm",
    value: string
  ) => {
    const newDate = currentDate ? new Date(currentDate) : new Date();
    if (type === "hour") {
      const hour = parseInt(value, 10);
      newDate.setHours(newDate.getHours() >= 12 ? hour + 12 : hour);
    } else if (type === "minute") {
      newDate.setMinutes(parseInt(value, 10));
    } else if (type === "ampm") {
      const hours = newDate.getHours();
      if (value === "AM" && hours >= 12) {
        newDate.setHours(hours - 12);
      } else if (value === "PM" && hours < 12) {
        newDate.setHours(hours + 12);
      }
    }
    return newDate;
  };

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex flex-col space-y-2 w-full">
          <label
            htmlFor={name}
            className="text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            {label}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full pl-3 text-left font-normal",
                  !field.value && "text-muted-foreground",
                  error && "border-coral"
                )}
              >
                {field.value ? (
                  format(new Date(field.value), "MM/dd/yyyy hh:mm aa")
                ) : (
                  <span>MM/DD/YYYY hh:mm aa</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <div className="sm:flex">
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      field.onChange(date.toISOString());
                    }
                  }}
                  initialFocus
                />
                <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
                  <ScrollArea className="w-64 sm:w-auto">
                    <div className="flex sm:flex-col p-2">
                      {Array.from({ length: 12 }, (_, i) => i + 1)
                        .reverse()
                        .map((hour) => (
                          <Button
                            key={hour}
                            size="icon"
                            variant={
                              field.value &&
                              new Date(field.value).getHours() % 12 ===
                                hour % 12
                                ? "default"
                                : "ghost"
                            }
                            className="sm:w-full shrink-0 aspect-square"
                            onClick={() => {
                              const newDate = handleTimeChange(
                                field.value ? new Date(field.value) : undefined,
                                "hour",
                                hour.toString()
                              );
                              field.onChange(newDate.toISOString());
                            }}
                          >
                            {hour}
                          </Button>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="sm:hidden" />
                  </ScrollArea>
                  <ScrollArea className="w-64 sm:w-auto">
                    <div className="flex sm:flex-col p-2">
                      {Array.from({ length: 12 }, (_, i) => i * 5).map(
                        (minute) => (
                          <Button
                            key={minute}
                            size="icon"
                            variant={
                              field.value &&
                              new Date(field.value).getMinutes() === minute
                                ? "default"
                                : "ghost"
                            }
                            className="sm:w-full shrink-0 aspect-square"
                            onClick={() => {
                              const newDate = handleTimeChange(
                                field.value ? new Date(field.value) : undefined,
                                "minute",
                                minute.toString()
                              );
                              field.onChange(newDate.toISOString());
                            }}
                          >
                            {minute.toString().padStart(2, "0")}
                          </Button>
                        )
                      )}
                    </div>
                    <ScrollBar orientation="horizontal" className="sm:hidden" />
                  </ScrollArea>
                  <ScrollArea>
                    <div className="flex sm:flex-col p-2">
                      {["AM", "PM"].map((ampm) => (
                        <Button
                          key={ampm}
                          size="icon"
                          variant={
                            field.value &&
                            ((ampm === "AM" &&
                              new Date(field.value).getHours() < 12) ||
                              (ampm === "PM" &&
                                new Date(field.value).getHours() >= 12))
                              ? "default"
                              : "ghost"
                          }
                          className="sm:w-full shrink-0 aspect-square"
                          onClick={() => {
                            const newDate = handleTimeChange(
                              field.value ? new Date(field.value) : undefined,
                              "ampm",
                              ampm
                            );
                            field.onChange(newDate.toISOString());
                          }}
                        >
                          {ampm}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
          {error && <p className="text-coral text-sm">{error}</p>}
        </div>
      )}
    />
  );
}

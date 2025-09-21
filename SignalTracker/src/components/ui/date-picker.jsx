"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePicker({ date, setDate, className }) {
  return (
    <Popover className="bg-white">
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          {/* Removed the hardcoded white background from the icon which caused issues in dark mode */}
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      {/* FIX: Added theme-aware background colors to the popover content.
        - `bg-white` ensures a solid white background in light mode.
        - `dark:bg-slate-900` provides a solid, matching background in dark mode.
        - Added a border for better visual definition in both themes.
      */}
      <PopoverContent className="w-auto p-0  bg-white dark:bg-slate-900 rounded-md shadow-lg">
        <Calendar 
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

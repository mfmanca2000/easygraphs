"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className="relative h-2 w-full grow overflow-hidden rounded"
      style={{
        background: 'var(--architect-blue)',
        border: '2px solid var(--pencil-lead)'
      }}
    >
      <SliderPrimitive.Range className="absolute h-full" style={{ background: 'var(--architect-blue)' }} />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className="block h-5 w-5 rounded-full shadow transition-all hover:scale-110 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
      style={{
        background: 'var(--architect-orange)',
        border: '3px solid white',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
      }}
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }

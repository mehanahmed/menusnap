'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AccountsSheet = DialogPrimitive.Root;
export const AccountsSheetTrigger = DialogPrimitive.Trigger;
export const AccountsSheetPortal = DialogPrimitive.Portal;
export const AccountsSheetClose = DialogPrimitive.Close;

export const AccountsSheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
AccountsSheetOverlay.displayName = 'AccountsSheetOverlay';

interface AccountsSheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  showDragHandle?: boolean;
}

export const AccountsSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  AccountsSheetContentProps
>(({ className, children, showDragHandle = true, ...props }, ref) => {
  // Lock body scroll while sheet is open on mobile
  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <AccountsSheetPortal>
      <AccountsSheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // Mobile: Bottom Sheet
          'fixed inset-x-0 bottom-0 z-50 w-full max-h-[90vh] rounded-t-3xl border-t border-border/80 bg-card p-4 sm:p-6 shadow-2xl flex flex-col',
          'transition-all duration-300 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          // Desktop (md+): Centered Dialog (original appearance preserved)
          'md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:rounded-2xl md:border md:border-border/80',
          'md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95',
          'md:data-[state=closed]:slide-out-to-top-[48%] md:data-[state=open]:slide-in-from-top-[48%]',
          className
        )}
        {...props}
      >
        {/* Touch drag handle for mobile gesture recognition */}
        {showDragHandle && (
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-3 shrink-0 md:hidden" />
        )}

        {children}

        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-xl p-1.5 opacity-70 hover:opacity-100 hover:bg-muted text-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-[#FF5A36] disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </AccountsSheetPortal>
  );
});
AccountsSheetContent.displayName = 'AccountsSheetContent';

export const AccountsSheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 text-left shrink-0 pb-2', className)}
    {...props}
  />
);
AccountsSheetHeader.displayName = 'AccountsSheetHeader';

export const AccountsSheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-base sm:text-lg font-bold text-foreground leading-none tracking-tight', className)}
    {...props}
  />
));
AccountsSheetTitle.displayName = 'AccountsSheetTitle';

export const AccountsSheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-xs text-muted-foreground', className)}
    {...props}
  />
));
AccountsSheetDescription.displayName = 'AccountsSheetDescription';

export const AccountsSheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0 pt-3 border-t border-border/40 mt-3',
      className
    )}
    {...props}
  />
);
AccountsSheetFooter.displayName = 'AccountsSheetFooter';

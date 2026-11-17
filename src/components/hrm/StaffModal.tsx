"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { saveStaffRosterAction } from '@/app/actions/hrm';
import { RESTAURANT_ROLES, PARLOUR_ROLES } from '@/lib/hrm-constants';
import { sanitizeBdPhone, formatBdPhone } from '@/lib/accounts/helpers';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingStaff: any | null;
  businessId: string | number;
  businessType: string;
  defaultShiftStart?: string;
  defaultShiftEnd?: string;
  onSuccess: () => void;
}

export function StaffModal({
  isOpen,
  onClose,
  editingStaff,
  businessId,
  businessType,
  defaultShiftStart = '09:00',
  defaultShiftEnd = '18:00',
  onSuccess,
}: StaffModalProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const rolesList = useMemo(() => {
    return businessType === 'parlour' ? PARLOUR_ROLES : RESTAURANT_ROLES;
  }, [businessType]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: '',
    pin_code: '123456',
    shift_start: defaultShiftStart,
    shift_end: defaultShiftEnd,
    salary_type: 'monthly',
    base_salary: '',
    joining_date: new Date().toLocaleDateString('en-CA'),
  });

  useEffect(() => {
    if (editingStaff) {
      setFormData({
        name: editingStaff.name || '',
        phone: sanitizeBdPhone(editingStaff.phone || ''),
        role: editingStaff.role || '',
        pin_code: (editingStaff.pin_code || '123456').replace(/\D/g, '').slice(0, 6),
        shift_start: editingStaff.shift_start ? editingStaff.shift_start.slice(0, 5) : defaultShiftStart,
        shift_end: editingStaff.shift_end ? editingStaff.shift_end.slice(0, 5) : defaultShiftEnd,
        salary_type: editingStaff.salary_type || 'monthly',
        base_salary: editingStaff.base_salary ? String(editingStaff.base_salary) : '',
        joining_date: editingStaff.joining_date || new Date().toLocaleDateString('en-CA'),
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        role: '',
        pin_code: '123456',
        shift_start: defaultShiftStart,
        shift_end: defaultShiftEnd,
        salary_type: 'monthly',
        base_salary: '',
        joining_date: new Date().toLocaleDateString('en-CA'),
      });
    }
  }, [editingStaff, isOpen, rolesList, defaultShiftStart, defaultShiftEnd]);

  const availableRoles = useMemo(() => {
    const list = [...(rolesList as readonly string[])];
    if (formData.role && formData.role !== 'none' && !list.includes(formData.role)) {
      list.unshift(formData.role);
    }
    return list;
  }, [rolesList, formData.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: 'Validation Error', description: 'Employee name is required.', variant: 'destructive' });
      return;
    }

    if (!formData.role || formData.role === 'none') {
      toast({
        title: 'Validation Error',
        description: 'Please select a role / designation.',
        variant: 'destructive',
      });
      return;
    }

    const trimmedPhone = formData.phone.trim();
    if (trimmedPhone && trimmedPhone.length !== 11) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid 11-digit mobile number (e.g. 017XXXXXXXX).',
        variant: 'destructive',
      });
      return;
    }

    if (formData.pin_code.length !== 6) {
      toast({
        title: 'Validation Error',
        description: 'PIN code must be exactly 6 digits.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await saveStaffRosterAction(businessId, {
        id: editingStaff?.id,
        name: formData.name.trim(),
        phone: trimmedPhone ? formatBdPhone(trimmedPhone) : undefined,
        role: formData.role,
        pin_code: formData.pin_code.trim() || '123456',
        shift_start: formData.shift_start.slice(0, 5) + ':00',
        shift_end: formData.shift_end.slice(0, 5) + ':00',
        salary_type: formData.salary_type,
        base_salary: Number(formData.base_salary || 0),
        joining_date: formData.joining_date,
        is_active: true,
      });

      if (res.success) {
        toast({
          title: editingStaff ? 'Staff Updated' : 'Staff Added',
          description: res.message || 'Staff profile saved successfully.',
        });
        onSuccess();
        onClose();
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to save staff.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Server error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white dark:bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-900 dark:text-foreground">
            {editingStaff ? 'Edit Staff Profile' : 'Add New Staff Member'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-muted-foreground">
            Set role, shift timing, and 6-digit PIN code for punch terminal verification.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Full Name *</Label>
            <Input
              type="text"
              placeholder="e.g. Tanvir Ahmed"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="mt-1 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Mobile Phone</Label>
                <span className={`text-[10px] font-mono font-bold ${formData.phone.length === 11 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {formData.phone.length}/11
                </span>
              </div>
              <div className="mt-1 flex rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden h-10 transition-all">
                <span className="inline-flex items-center px-3 bg-muted/60 text-foreground font-mono font-bold text-xs border-r border-input select-none">
                  +88
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="01XXXXXXXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: sanitizeBdPhone(e.target.value) })}
                  maxLength={11}
                  className="flex-1 bg-transparent px-3 text-xs outline-none font-mono text-foreground placeholder:text-muted-foreground/60 h-full"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Role / Designation *</Label>
              <Select
                value={formData.role || 'none'}
                onValueChange={(v) => setFormData({ ...formData, role: v === 'none' ? '' : v })}
              >
                <SelectTrigger className="mt-1 rounded-xl text-xs font-semibold text-slate-800 dark:text-foreground bg-white dark:bg-card border-slate-300 dark:border-border">
                  <SelectValue placeholder="Select a Role" />
                </SelectTrigger>
                <SelectContent className="z-[9999] bg-white dark:bg-card text-slate-800 dark:text-foreground border-slate-200 dark:border-border shadow-md">
                  <SelectItem value="none" className="text-xs font-medium text-slate-400 dark:text-muted-foreground italic focus:bg-slate-100 dark:focus:bg-muted cursor-pointer">
                    Select a Role
                  </SelectItem>
                  {availableRoles.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs font-medium text-slate-700 dark:text-foreground focus:bg-slate-100 dark:focus:bg-muted cursor-pointer">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-foreground">6-Digit PIN *</Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={formData.pin_code}
                onChange={(e) => setFormData({ ...formData, pin_code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                required
                className="mt-1 rounded-xl font-mono text-center font-bold"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Shift In</Label>
              <Input
                type="time"
                value={formData.shift_start}
                onChange={(e) => setFormData({ ...formData, shift_start: e.target.value })}
                required
                className="mt-1 rounded-xl text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Shift Out</Label>
              <Input
                type="time"
                value={formData.shift_end}
                onChange={(e) => setFormData({ ...formData, shift_end: e.target.value })}
                required
                className="mt-1 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Monthly Base Salary (৳)</Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 15000"
                value={formData.base_salary}
                onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                className="mt-1 rounded-xl font-bold"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Joining Date</Label>
              <Input
                type="date"
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                className="mt-1 rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              {submitting ? 'Saving...' : editingStaff ? 'Update Profile' : 'Add Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

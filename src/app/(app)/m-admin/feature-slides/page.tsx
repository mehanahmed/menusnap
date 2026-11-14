"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { checkClientPermission } from "@/lib/admin-permissions";
import { AdminLoginForm } from "@/components/auth/admin-login-form";
import {
  getAllFeatureSlidesAdminAction,
  createFeatureSlideAction,
  updateFeatureSlideAction,
  deleteFeatureSlideAction,
  FeatureSlide,
} from "@/app/actions/landing-slides";
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Check,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Loader2,
  X,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "@/components/ui/image-uploader";

export default function FeatureSlidesAdminPage() {
  const { adminUser, adminLoading } = useAdminAuth();
  const { toast } = useToast();

  const [slides, setSlides] = useState<FeatureSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<FeatureSlide | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeatureSlide | null>(null);

  // Form states
  const [formTag, setFormTag] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formBenefits, setFormBenefits] = useState<string[]>([]);
  const [benefitInput, setBenefitInput] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formCtaText, setFormCtaText] = useState("Start Building");
  const [formCtaUrl, setFormCtaUrl] = useState("#pricing");
  const [formSortOrder, setFormSortOrder] = useState(1);
  const [formIsActive, setFormIsActive] = useState(true);

  const canView = checkClientPermission(adminUser, "feature-slides", "view");
  const canEdit = checkClientPermission(adminUser, "feature-slides", "edit");
  const canDelete = checkClientPermission(adminUser, "feature-slides", "delete");

  // Load slides
  const loadSlides = async () => {
    setLoading(true);
    const res = await getAllFeatureSlidesAdminAction();
    if (res.success && res.data) {
      setSlides(res.data);
    } else {
      toast({
        title: "Error",
        description: res.error || "Failed to load feature slides",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (adminUser) {
      loadSlides();
    }
  }, [adminUser]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingSlide(null);
    setFormTag("");
    setFormTitle("");
    setFormDescription("");
    setFormBenefits([]);
    setBenefitInput("");
    setFormImageUrl("");
    setFormCtaText("Start Building");
    setFormCtaUrl("#pricing");
    setFormSortOrder(slides.length + 1);
    setFormIsActive(true);
    setIsDialogOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (slide: FeatureSlide) => {
    setEditingSlide(slide);
    setFormTag(slide.tag || "");
    setFormTitle(slide.title);
    setFormDescription(slide.description || "");
    setFormBenefits(slide.benefits || []);
    setBenefitInput("");
    setFormImageUrl(slide.image_url);
    setFormCtaText(slide.cta_text || "");
    setFormCtaUrl(slide.cta_url || "#pricing");
    setFormSortOrder(slide.sort_order);
    setFormIsActive(slide.is_active);
    setIsDialogOpen(true);
  };

  // Add bullet point
  const handleAddBenefit = () => {
    if (!benefitInput.trim()) return;
    setFormBenefits([...formBenefits, benefitInput.trim()]);
    setBenefitInput("");
  };

  // Remove bullet point
  const handleRemoveBenefit = (index: number) => {
    setFormBenefits(formBenefits.filter((_, idx) => idx !== index));
  };

  // Submit Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast({ title: "Validation Error", description: "Title is required", variant: "destructive" });
      return;
    }
    if (!formImageUrl.trim()) {
      toast({ title: "Validation Error", description: "Image is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editingSlide) {
        const res = await updateFeatureSlideAction(editingSlide.id, {
          tag: formTag,
          title: formTitle,
          description: formDescription,
          benefits: formBenefits,
          image_url: formImageUrl,
          cta_text: formCtaText,
          cta_url: formCtaUrl,
          sort_order: formSortOrder,
          is_active: formIsActive,
        });

        if (res.success) {
          toast({ title: "Slide Updated", description: "Feature slide updated successfully" });
          setIsDialogOpen(false);
          await loadSlides();
        } else {
          toast({ title: "Update Failed", description: res.error, variant: "destructive" });
        }
      } else {
        const res = await createFeatureSlideAction({
          tag: formTag,
          title: formTitle,
          description: formDescription,
          benefits: formBenefits,
          image_url: formImageUrl,
          cta_text: formCtaText,
          cta_url: formCtaUrl,
          sort_order: formSortOrder,
          is_active: formIsActive,
        });

        if (res.success) {
          toast({ title: "Slide Created", description: "New feature slide added successfully" });
          setIsDialogOpen(false);
          await loadSlides();
        } else {
          toast({ title: "Creation Failed", description: res.error, variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Toggle active state
  const handleToggleActive = async (slide: FeatureSlide) => {
    const updatedStatus = !slide.is_active;
    // optimistic update
    setSlides((prev) =>
      prev.map((s) => (s.id === slide.id ? { ...s, is_active: updatedStatus } : s))
    );

    const res = await updateFeatureSlideAction(slide.id, { is_active: updatedStatus });
    if (!res.success) {
      toast({ title: "Failed to update status", description: res.error, variant: "destructive" });
      await loadSlides();
    } else {
      toast({
        title: updatedStatus ? "Slide Activated" : "Slide Deactivated",
        description: `"${slide.title}" is now ${updatedStatus ? "visible" : "hidden"} on landing page.`,
      });
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const res = await deleteFeatureSlideAction(deleteTarget.id);
    if (res.success) {
      toast({ title: "Slide Deleted", description: "Feature slide was deleted." });
      setDeleteTarget(null);
      await loadSlides();
    } else {
      toast({ title: "Delete Failed", description: res.error, variant: "destructive" });
    }
  };

  if (adminLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return <AdminLoginForm />;
  }

  if (!canView) {
    return (
      <div className="p-8 text-center text-gray-500">
        You do not have permission to view this page.
      </div>
    );
  }

  const activeCount = slides.filter((s) => s.is_active).length;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-orange-50 text-[#FF5A36] rounded-xl border border-orange-100">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Landing Feature Slides
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Manage the side-by-side interactive carousel on the landing page ({activeCount} active of {slides.length} total)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/#features"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
          >
            <Eye className="w-4 h-4 text-gray-500" />
            <span>View Landing Page</span>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </Link>

          {canEdit && (
            <Button
              onClick={handleOpenCreate}
              className="bg-[#FF5A36] hover:bg-[#E04826] text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Slide</span>
            </Button>
          )}
        </div>
      </div>

      {/* Slides List */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : slides.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <SlidersHorizontal className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">No Feature Slides Yet</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-5">
            Add your first feature slide to showcase your platform modules on the landing page.
          </p>
          {canEdit && (
            <Button onClick={handleOpenCreate} className="bg-[#FF5A36] text-white text-xs">
              <Plus className="w-4 h-4 mr-1.5" />
              Create Slide
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              className={`bg-white rounded-2xl border transition-all p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between ${
                slide.is_active ? "border-gray-200/90" : "border-gray-200 bg-gray-50/60 opacity-80"
              }`}
            >
              {/* Left: Thumbnail & Order Badge */}
              <div className="flex items-center gap-4 shrink-0 w-full lg:w-auto">
                <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs shrink-0">
                  {slide.sort_order || idx + 1}
                </span>

                <div className="relative w-44 sm:w-56 aspect-[16/10] rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                  <Image
                    src={slide.image_url}
                    alt={slide.title}
                    fill
                    className="object-cover"
                    sizes="224px"
                  />
                  {!slide.is_active && (
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="bg-white/95 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                        Hidden
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Middle: Content Preview */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {slide.tag && (
                    <Badge variant="secondary" className="bg-orange-50 text-[#FF5A36] border border-orange-100 font-semibold text-[11px]">
                      {slide.tag}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium ${
                      slide.is_active
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : "text-gray-500 bg-gray-100 border-gray-200"
                    }`}
                  >
                    {slide.is_active ? "Live on Landing" : "Draft / Hidden"}
                  </Badge>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                  {slide.title}
                </h3>

                {slide.description && (
                  <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                    {slide.description}
                  </p>
                )}

                {/* Benefits Pills */}
                {slide.benefits && slide.benefits.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {slide.benefits.map((b, bIdx) => (
                      <span
                        key={bIdx}
                        className="inline-flex items-center gap-1 text-[11px] text-gray-700 bg-gray-100/90 px-2 py-0.5 rounded-md"
                      >
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="truncate max-w-[200px]">{b}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* CTA preview */}
                {slide.cta_text && (
                  <div className="pt-1 text-xs text-gray-500 flex items-center gap-1.5">
                    <span className="font-medium text-gray-700">Button:</span>
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 font-semibold text-[11px]">
                      {slide.cta_text}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-500 text-[11px] font-mono">{slide.cta_url || "#pricing"}</span>
                  </div>
                )}
              </div>

              {/* Right: Actions & Toggle */}
              <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">
                    {slide.is_active ? "Active" : "Inactive"}
                  </span>
                  <Switch
                    checked={slide.is_active}
                    onCheckedChange={() => handleToggleActive(slide)}
                    disabled={!canEdit}
                  />
                </div>

                <div className="flex items-center gap-1.5 ml-2">
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(slide)}
                      className="h-8 px-2.5 text-xs text-gray-700 hover:text-gray-900 border-gray-200"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                  )}

                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(slide)}
                      className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              {editingSlide ? "Edit Feature Slide" : "Add New Feature Slide"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Configure the side-by-side slide presentation for the landing page feature carousel.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {/* Tag / Badge */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-gray-700">Badge / Category Tag</label>
                <Input
                  value={formTag}
                  onChange={(e) => setFormTag(e.target.value)}
                  placeholder="e.g. Menu Intelligence & Research"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Sort Order</label>
                <Input
                  type="number"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(Number(e.target.value))}
                  min={1}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Main Headline <span className="text-red-500">*</span>
              </label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. হাজারো ফুড আইটেম ও লাইভ প্রাইস রিসার্চ এক ক্লিকে"
                required
                className="text-sm font-medium"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Description (2-3 sentences)</label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Explain the benefit of this feature..."
                rows={3}
                className="text-xs"
              />
            </div>

            {/* Key Benefits (Bullets) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">
                Key Benefits / Bullet Highlights
              </label>
              <div className="flex gap-2">
                <Input
                  value={benefitInput}
                  onChange={(e) => setBenefitInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddBenefit();
                    }
                  }}
                  placeholder="Add a bullet point (press Enter)"
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddBenefit}
                  className="text-xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </div>

              {formBenefits.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {formBenefits.map((b, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-800"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{b}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBenefit(idx)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Image Uploader */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-gray-700">
                Slide Image / Screenshot <span className="text-red-500">*</span>
              </label>
              <ImageUploader
                value={formImageUrl}
                onChange={(url) => setFormImageUrl(url)}
                subDir="features"
                label="Feature Screenshot"
              />
            </div>

            {/* CTA Button Text & URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">CTA Button Text</label>
                <Input
                  value={formCtaText}
                  onChange={(e) => setFormCtaText(e.target.value)}
                  placeholder="e.g. Start Building"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">CTA Target URL / Anchor</label>
                <Input
                  value={formCtaUrl}
                  onChange={(e) => setFormCtaUrl(e.target.value)}
                  placeholder="e.g. #pricing or /templates"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 mt-2">
              <div>
                <p className="text-xs font-semibold text-gray-900">Show on Landing Page</p>
                <p className="text-[11px] text-gray-500">Enable or disable this slide instantly</p>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={saving}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#FF5A36] hover:bg-[#E04826] text-white text-xs gap-1.5 font-semibold"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{editingSlide ? "Update Slide" : "Create Slide"}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-gray-900">
              Delete Feature Slide?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-500">
              Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;? This will remove it from the landing page carousel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


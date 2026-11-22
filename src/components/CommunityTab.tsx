"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Camera,
  Eye,
  Megaphone,
  MessageCircle,
  Pin,
  Plus,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { formatDateShort } from "@/lib/calculations";
import { compressImageToDataUrl } from "@/lib/image";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { ReceiptLightbox } from "@/components/ReceiptLightbox";
import type {
  AnnouncementCategory,
  MaintenanceTicket,
  TicketCategory,
  TicketStatus,
} from "@/lib/types";

const ANN_CATEGORIES: AnnouncementCategory[] = ["info", "ag", "travaux", "urgence"];
const TICKET_CATEGORIES: TicketCategory[] = [
  "plomberie",
  "electricite",
  "ascenseur",
  "nettoyage",
  "securite",
  "autre",
];

function getAnnouncementBadgeClass(cat: AnnouncementCategory): string {
  switch (cat) {
    case "urgence":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900/60";
    case "ag":
      return "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100";
    case "travaux":
      return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60";
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
  }
}

function getTicketStatusClass(status: TicketStatus): string {
  switch (status) {
    case "resolved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/60";
    case "in_progress":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60";
    default:
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-900/60";
  }
}

function TicketManageCard({
  ticket,
  onOpenLightbox,
}: {
  ticket: MaintenanceTicket;
  onOpenLightbox: (url: string, caption: string) => void;
}) {
  const { t, locale, updateTicketStatus, deleteTicket } = useApp();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [adminNote, setAdminNote] = useState(ticket.adminNote);
  const [busy, setBusy] = useState(false);

  const isDirty =
    status !== ticket.status || adminNote.trim() !== ticket.adminNote.trim();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) return;
    setBusy(true);
    await updateTicketStatus({ ticketId: ticket.id, status, adminNote });
    setBusy(false);
  };

  return (
    <div className="space-y-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {ticket.photoUrl ? (
            <button
              type="button"
              onClick={() => onOpenLightbox(ticket.photoUrl!, ticket.title)}
              className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700"
            >
              <Image
                src={ticket.photoUrl}
                alt={ticket.title}
                width={48}
                height={48}
                unoptimized
                className="h-full w-full object-cover"
              />
            </button>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              <Wrench className="h-4 w-4" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getTicketStatusClass(
                  ticket.status
                )}`}
              >
                {t.community.ticketStatuses[ticket.status]}
              </span>
              <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {t.community.ticketCategories[ticket.category]}
              </span>
              {ticket.unitLabel && (
                <span className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                  {ticket.unitLabel}
                </span>
              )}
            </div>
            <h3 className="mt-1.5 text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {ticket.title}
            </h3>
            {ticket.description && (
              <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                {ticket.description}
              </p>
            )}
            <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
              {ticket.reporterName || "Syndic"}
              {ticket.reporterEmail ? ` (${ticket.reporterEmail})` : ""} •{" "}
              <span className="tabular-nums">
                {formatDateShort(ticket.createdAt, locale)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {ticket.photoUrl && (
            <button
              type="button"
              onClick={() => onOpenLightbox(ticket.photoUrl!, ticket.title)}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <Eye className="h-3 w-3 text-zinc-400" />
              <span>{t.expenses.viewPhoto}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t.community.confirmDeleteTicket)) {
                deleteTicket(ticket.id);
              }
            }}
            className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-red-950/60 dark:hover:text-red-400"
            title={t.expenses.deleteExpense}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/70 p-2.5 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-12"
      >
        <select
          aria-label={t.payments.colStatus}
          value={status}
          onChange={(e) => setStatus(e.target.value as TicketStatus)}
          className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 sm:col-span-3"
        >
          <option value="open">{t.community.ticketStatuses.open}</option>
          <option value="in_progress">{t.community.ticketStatuses.in_progress}</option>
          <option value="resolved">{t.community.ticketStatuses.resolved}</option>
        </select>
        <input
          type="text"
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder={t.community.adminNotePlaceholder}
          className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 sm:col-span-7"
        />
        <button
          type="submit"
          disabled={busy || !isDirty}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 sm:col-span-2"
        >
          {t.community.saveStatusBtn}
        </button>
      </form>
    </div>
  );
}

export function CommunityTab() {
  const {
    t,
    locale,
    activeBuilding,
    buildingApartments,
    buildingAnnouncements,
    buildingTickets,
    createAnnouncement,
    toggleAnnouncementPin,
    deleteAnnouncement,
    createTicket,
  } = useApp();

  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annCategory, setAnnCategory] = useState<AnnouncementCategory>("info");
  const [annPinned, setAnnPinned] = useState(false);
  const [annBusy, setAnnBusy] = useState(false);

  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<"all" | TicketStatus>("all");
  const [tktTitle, setTktTitle] = useState("");
  const [tktDesc, setTktDesc] = useState("");
  const [tktCategory, setTktCategory] = useState<TicketCategory>("plomberie");
  const [tktUnit, setTktUnit] = useState("");
  const [tktPhoto, setTktPhoto] = useState<string | null>(null);
  const [tktBusy, setTktBusy] = useState(false);

  const [lightbox, setLightbox] = useState<{
    url: string;
    caption: string;
  } | null>(null);

  const ticketCounts = useMemo(() => {
    let open = 0;
    let inProgress = 0;
    let resolved = 0;
    for (const item of buildingTickets) {
      if (item.status === "open") open += 1;
      else if (item.status === "in_progress") inProgress += 1;
      else resolved += 1;
    }
    return {
      all: buildingTickets.length,
      open,
      in_progress: inProgress,
      resolved,
    };
  }, [buildingTickets]);

  const filteredTickets = useMemo(() => {
    if (ticketFilter === "all") return buildingTickets;
    return buildingTickets.filter((item) => item.status === ticketFilter);
  }, [buildingTickets, ticketFilter]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) return;
    setAnnBusy(true);
    const ok = await createAnnouncement({
      title: annTitle,
      body: annBody,
      category: annCategory,
      pinned: annPinned,
    });
    setAnnBusy(false);
    if (ok) {
      setAnnTitle("");
      setAnnBody("");
      setAnnCategory("info");
      setAnnPinned(false);
      setShowAnnForm(false);
    }
  };

  const handleTicketPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageToDataUrl(file);
    setTktPhoto(compressed);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tktTitle.trim()) return;
    setTktBusy(true);
    const ok = await createTicket({
      title: tktTitle,
      description: tktDesc,
      category: tktCategory,
      unitLabel: tktUnit,
      photoUrl: tktPhoto,
    });
    setTktBusy(false);
    if (ok) {
      setTktTitle("");
      setTktDesc("");
      setTktCategory("plomberie");
      setTktUnit("");
      setTktPhoto(null);
      setShowTicketForm(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
          {t.community.title}
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {t.community.subtitle}
        </p>
      </div>

      {/* Section 1: Announcements */}
      <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs dark:border-zinc-800 dark:bg-[#111113]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {t.community.announcementsHeading} ({buildingAnnouncements.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowAnnForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {showAnnForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            <span>{showAnnForm ? t.common.close : t.community.newAnnouncementBtn}</span>
          </button>
        </div>

        {showAnnForm && (
          <form
            onSubmit={handleCreateAnnouncement}
            className="border-b border-zinc-100 bg-zinc-50/70 p-5 space-y-3 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-8">
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {t.community.announcementTitleLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder={t.community.announcementTitlePlaceholder}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {t.community.announcementCategoryLabel}
                </label>
                <select
                  value={annCategory}
                  onChange={(e) => setAnnCategory(e.target.value as AnnouncementCategory)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {ANN_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t.community.categories[c]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {t.community.announcementBodyLabel} *
              </label>
              <textarea
                rows={3}
                required
                value={annBody}
                onChange={(e) => setAnnBody(e.target.value)}
                placeholder={t.community.announcementBodyPlaceholder}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={annPinned}
                  onChange={(e) => setAnnPinned(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
                />
                <span>{t.community.pinLabel}</span>
              </label>
              <button
                type="submit"
                disabled={annBusy}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {t.community.publishBtn}
              </button>
            </div>
          </form>
        )}

        {buildingAnnouncements.length === 0 ? (
          <p className="p-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
            {t.community.noAnnouncements}
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {buildingAnnouncements.map((ann) => {
              const waText = `[${activeBuilding.name}] ${ann.title}\n\n${ann.body}`;
              return (
                <div
                  key={ann.id}
                  className="flex flex-wrap items-start justify-between gap-4 p-5"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {ann.pinned && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          <Pin className="h-2.5 w-2.5" />
                          <span>{t.community.pinnedBadge}</span>
                        </span>
                      )}
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getAnnouncementBadgeClass(
                          ann.category
                        )}`}
                      >
                        {t.community.categories[ann.category]}
                      </span>
                      <span className="tabular-nums text-[11px] text-zinc-400 dark:text-zinc-500">
                        {formatDateShort(ann.createdAt, locale)}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                      {ann.title}
                    </h3>
                    <p className="whitespace-pre-line text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {ann.body}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={buildWhatsAppUrl(null, waText)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <MessageCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{t.community.shareWaBtn}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => toggleAnnouncementPin(ann.id)}
                      className={`rounded-md border px-2 py-1 text-[11px] font-medium ${
                        ann.pinned
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      }`}
                      title={t.community.pinLabel}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(t.community.confirmDeleteAnnouncement)) {
                          deleteAnnouncement(ann.id);
                        }
                      }}
                      className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-red-950/60 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Maintenance Tickets */}
      <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs dark:border-zinc-800 dark:bg-[#111113]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {t.community.ticketsHeading} ({buildingTickets.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-zinc-200/90 bg-zinc-100/80 p-0.5 text-xs dark:border-zinc-800 dark:bg-zinc-900">
              {(["all", "open", "in_progress", "resolved"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTicketFilter(f)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    ticketFilter === f
                      ? "bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                  }`}
                >
                  {f === "all" && `${t.community.filterAll} (${ticketCounts.all})`}
                  {f === "open" && `${t.community.filterOpen} (${ticketCounts.open})`}
                  {f === "in_progress" &&
                    `${t.community.filterInProgress} (${ticketCounts.in_progress})`}
                  {f === "resolved" &&
                    `${t.community.filterResolved} (${ticketCounts.resolved})`}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowTicketForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {showTicketForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              <span>{showTicketForm ? t.common.close : t.community.newTicketBtn}</span>
            </button>
          </div>
        </div>

        {showTicketForm && (
          <form
            onSubmit={handleCreateTicket}
            className="border-b border-zinc-100 bg-zinc-50/70 p-5 space-y-3 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {t.community.ticketTitleLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={tktTitle}
                  onChange={(e) => setTktTitle(e.target.value)}
                  placeholder={t.portal.issueTitlePlaceholder}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {t.community.ticketCategoryLabel}
                </label>
                <select
                  value={tktCategory}
                  onChange={(e) => setTktCategory(e.target.value as TicketCategory)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {TICKET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t.community.ticketCategories[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {t.community.ticketUnitLabel}
                </label>
                <select
                  value={tktUnit}
                  onChange={(e) => setTktUnit(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">{t.settings.inviteNoUnitOption}</option>
                  {buildingApartments.map((apt) => (
                    <option key={apt.id} value={apt.unitLabel}>
                      {apt.unitLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {t.community.ticketDescLabel}
              </label>
              <textarea
                rows={2}
                value={tktDesc}
                onChange={(e) => setTktDesc(e.target.value)}
                placeholder={t.portal.issueDescPlaceholder}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                  <Camera className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{t.community.ticketPhotoLabel}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleTicketPhoto}
                  />
                </label>
                {tktPhoto && (
                  <button
                    type="button"
                    onClick={() => setTktPhoto(null)}
                    className="text-xs font-medium text-red-600 underline dark:text-red-400"
                  >
                    {t.expenses.removePhoto}
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={tktBusy}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {t.community.ticketSubmitBtn}
              </button>
            </div>
          </form>
        )}

        {filteredTickets.length === 0 ? (
          <p className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
            {t.community.noTickets}
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredTickets.map((ticket) => (
              <TicketManageCard
                key={`${ticket.id}-${ticket.updatedAt}`}
                ticket={ticket}
                onOpenLightbox={(url, caption) => setLightbox({ url, caption })}
              />
            ))}
          </div>
        )}
      </div>

      <ReceiptLightbox
        imageUrl={lightbox?.url ?? null}
        caption={lightbox?.caption}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}

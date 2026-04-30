"use client";

import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Camera, ChevronDown, ChevronLeft, ChevronRight, Copy, Grid2X2, List, Pencil, Plus, RefreshCw, Search, SlidersHorizontal, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { money, numberValue } from "@/lib/format";
import type { Kind } from "@/lib/repository";

type AnyItem = Record<string, any>;
type MetaItem = { id: number; name: string; sortOrder?: number };
type CreateMetaHandler = {
  (name: string): Promise<MetaItem | null>;
};
type Filters = {
  tagIds: number[];
  source: string;
  purpose: string;
  materialType: string;
  patternType: string;
  difficulty: string;
  from: string;
  to: string;
  used: string;
  hasStockLeft: boolean;
  color: string;
  categoryId: string;
  unitId: string;
  patternId: string;
  clothId: string;
  materialId: string;
  category: string;
  condition: string;
};
type LightboxState = { photos: string[]; index: number };
type StagedPhoto = { id: string; file: File; isCover: boolean };
type Props = {
  kind: Kind;
  items: AnyItem[];
  summary: Record<string, any>;
  tags: MetaItem[];
  categories?: MetaItem[];
  units?: MetaItem[];
  clothOptions?: AnyItem[];
  patternOptions?: AnyItem[];
  materialOptions?: AnyItem[];
  sourceOptions?: string[];
  materialTypeOptions?: string[];
  toolCategoryOptions?: string[];
};
type FieldsProps = {
  kind: Kind;
  item: AnyItem;
  tags: MetaItem[];
  categories: MetaItem[];
  units: MetaItem[];
  clothOptions: AnyItem[];
  patternOptions: AnyItem[];
  materialOptions: AnyItem[];
  sourceOptions: string[];
  materialTypeOptions: string[];
  toolCategoryOptions: string[];
  onAddTag: (name: string) => void;
  onAddCategory: CreateMetaHandler;
  onAddUnit: CreateMetaHandler;
};
type MetaSelectProps = {
  name: string;
  label: string;
  options: MetaItem[];
  value?: number;
  onCreate?: CreateMetaHandler;
};
type PhotoUploadedHandler = {
  (): void | Promise<void>;
};
type DetailProps = {
  item: AnyItem;
  kind: Kind;
  onEdit: () => void;
  onDuplicate?: () => void;
  onDelete: () => void;
  onClose: () => void;
  onOpenPhoto: (photos: string[], index: number) => void;
  onUploaded: PhotoUploadedHandler;
};
type PhotoStripProps = {
  item: AnyItem;
  kind: Kind;
  readOnly?: boolean;
  onUploaded?: PhotoUploadedHandler;
  onOpenPhoto?: (photos: string[], index: number) => void;
  onError?: (message: string) => void;
};

function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

const entityByKind = {
  cloths: "cloth",
  patterns: "pattern",
  materials: "material",
  projects: "project",
  tools: "tool"
} as const;
const clothPurposeOptions = ["garment", "craft"];
const patternTypeOptions = ["paper", "digital"];
const patternDifficultyOptions = ["easy", "medium", "hard"];
const patternForOptions = [
  "headwear",
  "scarves",
  "tops",
  "shirts",
  "blouses",
  "tunics",
  "vests",
  "sweaters",
  "cardigans",
  "jackets",
  "coats",
  "dresses",
  "jumpsuits",
  "skirts",
  "pants",
  "shorts",
  "leggings",
  "overalls",
  "lingerie",
  "sleepwear",
  "swimwear",
  "activewear",
  "costumes",
  "aprons",
  "bags"
];
const toolConditionOptions = ["good", "maintenance", "broken", "retired"];
const toolCategoryDefaults = ["剪裁工具", "测量工具", "缝纫机配件", "手缝工具", "熨烫工具", "标记工具", "收纳工具", "维修保养", "其他"];
const clothMaterialTypeDefaults = [
  "棉",
  "亚麻",
  "羊毛",
  "丝绸",
  "粘胶",
  "聚酯纤维",
  "尼龙",
  "牛仔布",
  "帆布",
  "针织",
  "法兰绒",
  "皮革",
  "混纺",
  "其他"
];
const commonColors = [
  "red",
  "burgundy",
  "coral",
  "peach",
  "orange",
  "gold",
  "yellow",
  "lime",
  "mint",
  "green",
  "olive",
  "sage",
  "teal",
  "turquoise",
  "aqua",
  "skyBlue",
  "blue",
  "royalBlue",
  "navy",
  "denim",
  "lavender",
  "lilac",
  "purple",
  "violet",
  "mauve",
  "pink",
  "rose",
  "magenta",
  "white",
  "ivory",
  "cream",
  "beige",
  "tan",
  "camel",
  "brown",
  "chocolate",
  "gray",
  "silver",
  "black"
];
const colorSwatches: Record<string, string> = {
  red: "#ef4444",
  burgundy: "#7f1d1d",
  coral: "#fb7185",
  peach: "#fdba74",
  orange: "#f97316",
  gold: "#d97706",
  yellow: "#eab308",
  lime: "#84cc16",
  mint: "#86efac",
  green: "#22c55e",
  olive: "#6b7f2a",
  sage: "#9caf88",
  teal: "#14b8a6",
  turquoise: "#2dd4bf",
  aqua: "#67e8f9",
  skyBlue: "#7dd3fc",
  blue: "#3b82f6",
  royalBlue: "#1d4ed8",
  navy: "#1e3a8a",
  denim: "#3b638c",
  lavender: "#c4b5fd",
  lilac: "#d8b4fe",
  purple: "#a855f7",
  violet: "#7c3aed",
  mauve: "#c08497",
  pink: "#ec4899",
  rose: "#f43f5e",
  magenta: "#d946ef",
  white: "#ffffff",
  ivory: "#fffff0",
  cream: "#fff7d6",
  beige: "#d6c4a8",
  tan: "#c49a6c",
  camel: "#b7791f",
  brown: "#92400e",
  chocolate: "#5c2e16",
  gray: "#6b7280",
  silver: "#c0c0c0",
  black: "#111827"
};

export function InventoryClient(props: Props) {
  const t = useTranslations();
  const [items, setItems] = useState(props.items);
  const [summary, setSummary] = useState(props.summary);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("created");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState<Filters>(() => emptyFilters());
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<AnyItem | null>(null);
  const [selected, setSelected] = useState<AnyItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AnyItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [stagedPhotoFiles, setStagedPhotoFiles] = useState<StagedPhoto[]>([]);
  const [tagList, setTagList] = useState(props.tags);
  const [categoryList, setCategoryList] = useState(props.categories ?? []);
  const [unitList, setUnitList] = useState(props.units ?? []);
  const [sourceOptions, setSourceOptions] = useState(props.sourceOptions ?? []);
  const [materialTypeOptions, setMaterialTypeOptions] = useState(props.materialTypeOptions ?? []);
  const [toolCategoryOptions, setToolCategoryOptions] = useState(props.toolCategoryOptions ?? []);
  const submitLockRef = useRef(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshSeqRef = useRef(0);
  const title = t(`${props.kind}.title`);
  const colorOptions = useMemo(
    () => collectColors([props.items, items, props.clothOptions ?? [], props.materialOptions ?? []]),
    [items, props.items, props.clothOptions, props.materialOptions]
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (lightbox) setLightbox(null);
      else if (filterOpen) setFilterOpen(false);
      else if (editing) {
        setStagedPhotoFiles([]);
        setEditing(null);
      }
      else if (selected) setSelected(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editing, selected, lightbox, filterOpen]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const hasModal = Boolean(editing || selected || filterOpen || lightbox || confirmDelete);
    if (!hasModal) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [editing, selected, filterOpen, lightbox, confirmDelete]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 3200);
  }

  async function refresh(nextQuery = query, nextSort = sort, nextFilters = filters, nextDir = dir) {
    const requestId = ++refreshSeqRef.current;
    const params = buildListParams(nextQuery, nextSort, nextFilters, nextDir);
    const [listResponse, summaryResponse] = await Promise.all([
      fetch(`/api/${props.kind}?${params.toString()}`),
      fetch(`/api/${props.kind}/summary?${params.toString()}`)
    ]);
    const nextItems = (await listResponse.json()).items;
    const nextSummary = await summaryResponse.json();
    if (requestId !== refreshSeqRef.current) return;
    setItems(nextItems);
    setSummary(nextSummary);
  }

  function debounceRefresh(nextQuery: string, nextSort = sort, nextFilters = filters, nextDir = dir) {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      void refresh(nextQuery, nextSort, nextFilters, nextDir);
    }, 250);
  }

  async function refreshOpenItem(itemId: number) {
    const response = await fetch(`/api/${props.kind}/${itemId}`);
    if (response.ok) {
      const { item } = (await response.json()) as { item: AnyItem };
      setEditing((current) => (current?.id === itemId ? item : current));
      setSelected((current) => (current?.id === itemId ? item : current));
    }
    await refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const body: Record<string, any> = formToBody(props.kind, form);
    const path = editing?.id ? `/api/${props.kind}/${editing.id}` : `/api/${props.kind}`;
    try {
      const response = await fetch(path, {
        method: editing?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        notify(t("common.error"));
        return;
      }
      const { item } = (await response.json()) as { item: AnyItem };
      rememberSource(body.source);
      rememberMaterialType(body.materialType);
      rememberToolCategory(body.category);
      await uploadStagedPhotos(stagedPhotoFiles, props.kind, item.id);
      setStagedPhotoFiles([]);
      setEditing(null);
      setSelected((current) => (current?.id === item.id ? item : current));
      await refresh();
    } catch (error) {
      notify(`${t("common.uploadFailed")}: ${error instanceof Error ? error.message : t("common.error")}`);
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }

  function openCreate() {
    setStagedPhotoFiles([]);
    setEditing(defaultItem(props.kind));
  }

  function openEdit(item: AnyItem) {
    setStagedPhotoFiles([]);
    setEditing(item);
  }

  function closeEditor() {
    setStagedPhotoFiles([]);
    setEditing(null);
  }

  async function remove(item: AnyItem) {
    const response = await fetch(`/api/${props.kind}/${item.id}`, { method: "DELETE" });
    if (!response.ok) {
      notify(t("common.error"));
      return;
    }
    setConfirmDelete(null);
    setSelected(null);
    await refresh();
  }

  async function duplicate(item: AnyItem) {
    const response = await fetch(`/api/${props.kind}/${item.id}/duplicate`, { method: "POST" });
    if (!response.ok) {
      notify(t("common.error"));
      return;
    }
    const { item: nextItem } = (await response.json()) as { item: AnyItem };
    setSelected(nextItem);
    await refresh();
  }

  async function addTag(name: string) {
    if (!name.trim()) return;
    const response = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color: null })
    });
    if (response.ok) {
      const { item } = await response.json();
      setTagList((current) => [...current, item]);
    }
  }

  async function createMeta(kind: "categories" | "units", name: string) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const response = await fetch(`/api/meta/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed })
    });
    if (!response.ok) {
      notify(t("common.error"));
      return null;
    }
    const { item } = (await response.json()) as { item: MetaItem };
    if (kind === "categories") setCategoryList((current) => [...current, item]);
    else setUnitList((current) => [...current, item]);
    return item;
  }

  function applyFilters(nextFilters: Filters) {
    setFilters(nextFilters);
    void refresh(query, sort, nextFilters, dir);
  }

  function openLightbox(photos: string[], index: number) {
    if (!photos.length) return;
    setLightbox({ photos, index });
  }

  function appendStagedPhotos(files: FileList | null) {
    const nextPhotos = filesToStaged(files);
    if (!nextPhotos.length) return;
    setStagedPhotoFiles((current) => {
      const merged = [...current, ...nextPhotos];
      return merged.some((photo) => photo.isCover) ? merged : merged.map((photo, index) => ({ ...photo, isCover: index === 0 }));
    });
  }

  function rememberSource(value: unknown) {
    const source = String(value ?? "").trim();
    if (!source || props.kind === "projects") return;
    setSourceOptions((current) => (current.includes(source) ? current : [...current, source].sort()));
  }

  function rememberMaterialType(value: unknown) {
    const materialType = String(value ?? "").trim();
    if (!materialType || props.kind !== "cloths") return;
    setMaterialTypeOptions((current) => (current.includes(materialType) ? current : [...current, materialType].sort()));
  }

  function rememberToolCategory(value: unknown) {
    const category = String(value ?? "").trim();
    if (!category || props.kind !== "tools") return;
    setToolCategoryOptions((current) => (current.includes(category) ? current : [...current, category].sort()));
  }

  const cards = useMemo(
    () =>
      items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          kind={props.kind}
          view={view}
          onClick={() => setSelected(item)}
        />
      )),
    [items, props.kind, view]
  );

  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Button className="hidden md:inline-flex" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          {t(`${props.kind}.add`)}
        </Button>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label={t("common.summary")}>
        {summaryCards(props.kind, summary, t).map((card) => (
          <Card key={card.label} className="p-3">
            <div className="text-xs text-muted-foreground">{card.label}</div>
            <div className="mt-1 text-lg font-semibold">{card.value}</div>
          </Card>
        ))}
      </section>

      <div className="grid gap-2 md:flex md:flex-wrap md:items-center">
        <label className="relative min-w-0 md:min-w-48 md:flex-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            className="pl-9"
            placeholder={t("common.search")}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              debounceRefresh(event.target.value, sort, filters, dir);
            }}
          />
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1 md:overflow-visible md:pb-0">
          <label className="flex h-11 shrink-0 items-center overflow-hidden rounded-md border border-input bg-white shadow-sm">
            <span className="border-r border-border px-3 text-sm font-medium text-muted-foreground">{t("common.sortBy")}</span>
            <Select
              aria-label={t("common.sort")}
              value={sort}
              onChange={(event) => {
                const nextSort = event.target.value;
                setSort(nextSort);
                void refresh(query, nextSort, filters, dir);
              }}
              className="w-44 border-0 shadow-none"
            >
              <option value="created">{t("common.sortCreated")}</option>
              <option value="name">{t("common.sortName")}</option>
              <option value="price">{t("common.sortPrice")}</option>
              <option value="unitPrice">{t("common.sortUnitPrice")}</option>
              {props.kind === "cloths" ? <option value="remainingMetres">{t("common.sortMetersLeft")}</option> : null}
              {props.kind === "tools" ? <option value="quantity">{t("common.sortQuantity")}</option> : null}
            </Select>
          </label>
          <Select
            aria-label={t("common.sortDirection")}
            value={dir}
            onChange={(event) => {
              const nextDir = event.target.value === "asc" ? "asc" : "desc";
              setDir(nextDir);
              void refresh(query, sort, filters, nextDir);
            }}
            className="w-32 shrink-0"
          >
            <option value="desc">{t("common.desc")}</option>
            <option value="asc">{t("common.asc")}</option>
          </Select>
          <Button className="shrink-0" variant="secondary" size="icon" aria-label={t("common.refresh")} onClick={() => void refresh()}>
            <RefreshCw className="h-4 w-4" aria-hidden />
          </Button>
          <Button className="shrink-0" variant={hasFilters(filters) ? "primary" : "secondary"} onClick={() => setFilterOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            {t("common.filter")}
          </Button>
          <Button className="shrink-0" variant={view === "grid" ? "primary" : "secondary"} size="icon" aria-label={t("common.grid")} onClick={() => setView("grid")}>
            <Grid2X2 className="h-4 w-4" aria-hidden />
          </Button>
          <Button className="shrink-0" variant={view === "list" ? "primary" : "secondary"} size="icon" aria-label={t("common.list")} onClick={() => setView("list")}>
            <List className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {items.length ? (
        <section className={view === "grid" ? "grid grid-cols-2 gap-3 md:grid-cols-4" : "space-y-2"}>{cards}</section>
      ) : (
        <Card className="p-8 text-center">
          <div className="text-4xl" aria-hidden>
            🧵
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{t("common.empty")}</p>
          <Button className="mt-4" onClick={openCreate}>
            {t(`${props.kind}.add`)}
          </Button>
        </Card>
      )}

      {editing ? (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-end overflow-x-hidden bg-black/40 p-0 md:block md:overflow-y-auto md:p-3">
            <Card className="max-h-[92dvh] w-full max-w-full overflow-x-hidden overflow-y-auto overscroll-contain rounded-b-none rounded-t-2xl p-4 shadow-xl md:mx-auto md:max-w-2xl md:rounded-b-md md:rounded-t-md">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/35 md:hidden" />
              <form key={`${props.kind}-${editing.id ?? "new"}`} className="min-w-0 space-y-4" onSubmit={submit}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">{editing.id ? t("common.edit") : t("common.create")}</h2>
                  <Button type="button" variant="ghost" size="icon" aria-label={t("common.cancel")} onClick={closeEditor}>
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
                <section className="space-y-2">
                  <h3 className="text-sm font-medium">{t("common.photos")}</h3>
                  {editing.id ? (
                    <PhotoStrip item={editing} kind={props.kind} onUploaded={() => refreshOpenItem(editing.id)} onOpenPhoto={openLightbox} onError={notify} />
                  ) : (
                    <StagedPhotoStrip photos={stagedPhotoFiles} setPhotos={setStagedPhotoFiles} onAdd={appendStagedPhotos} />
                  )}
                </section>
                <Fields
                  kind={props.kind}
                  item={editing}
                  tags={tagList}
                  categories={categoryList}
                  units={unitList}
                  clothOptions={props.clothOptions ?? []}
                  patternOptions={props.patternOptions ?? []}
                  materialOptions={props.materialOptions ?? []}
                  sourceOptions={sourceOptions}
                  materialTypeOptions={materialTypeOptions}
                  toolCategoryOptions={toolCategoryOptions}
                  onAddTag={addTag}
                  onAddCategory={(name) => createMeta("categories", name)}
                  onAddUnit={(name) => createMeta("units", name)}
                />
                <div className="sticky bottom-0 flex justify-end gap-2 bg-card py-3">
                  <Button type="button" variant="secondary" onClick={closeEditor}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? t("common.saving") : t("common.save")}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </ModalPortal>
      ) : null}

      {selected && !editing ? (
        <ModalPortal>
          <Detail
            item={selected}
            kind={props.kind}
            onEdit={() => openEdit(selected)}
            onDuplicate={props.kind === "projects" ? undefined : () => duplicate(selected)}
            onDelete={() => setConfirmDelete(selected)}
            onClose={() => setSelected(null)}
            onOpenPhoto={openLightbox}
            onUploaded={() => refreshOpenItem(selected.id)}
          />
        </ModalPortal>
      ) : null}

      {filterOpen ? (
        <ModalPortal>
          <FilterDrawer
            kind={props.kind}
            filters={filters}
            tags={tagList}
            categories={categoryList}
            units={unitList}
            clothOptions={props.clothOptions ?? []}
            patternOptions={props.patternOptions ?? []}
            materialOptions={props.materialOptions ?? []}
            colorOptions={colorOptions}
            sourceOptions={sourceOptions}
            materialTypeOptions={materialTypeOptions}
            toolCategoryOptions={toolCategoryOptions}
            onApply={applyFilters}
            onClose={() => setFilterOpen(false)}
          />
        </ModalPortal>
      ) : null}

      {lightbox ? (
        <ModalPortal>
          <PhotoLightbox state={lightbox} setState={setLightbox} onClose={() => setLightbox(null)} />
        </ModalPortal>
      ) : null}

      {confirmDelete ? (
        <ConfirmSheet
          message={t("common.confirmDelete")}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            void remove(confirmDelete);
          }}
        />
      ) : null}

      {toast ? <Toast message={toast} /> : null}

      <Button
        className="fixed bottom-[calc(90px+env(safe-area-inset-bottom))] right-4 h-14 w-14 rounded-full md:bottom-6"
        size="icon"
        aria-label={t(`${props.kind}.add`)}
        onClick={openCreate}
      >
        <Plus className="h-6 w-6" aria-hidden />
      </Button>
    </main>
  );
}

function ItemCard({
  item,
  kind,
  view,
  onClick
}: {
  item: AnyItem;
  kind: Kind;
  view: "grid" | "list";
  onClick: () => void;
}) {
  const t = useTranslations();
  const photoItems = item.photos ?? [];
  const photos = photoItems.map((photo: AnyItem) => photo.id);
  const coverIndex = Math.max(0, photoItems.findIndex((photo: AnyItem) => photo.isCover));
  const photo = photos[coverIndex];
  const stat = primaryStat(kind, item, t);
  const unitPrice = unitPriceStat(kind, item, t);
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => event.key === "Enter" && onClick()}
      className={view === "grid" ? "overflow-hidden" : "flex items-center gap-3 p-2"}
    >
      {photo ? (
        <button
          type="button"
          className={view === "grid" ? "relative aspect-square bg-muted" : "relative h-16 w-16 shrink-0 rounded-md bg-muted"}
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
        >
          <img src={`/api/photos/${photo}/thumb`} alt="" className="h-full w-full object-cover" />
        </button>
      ) : (
        <div className={view === "grid" ? "relative aspect-square bg-muted" : "relative h-16 w-16 shrink-0 rounded-md bg-muted"} />
      )}
      <div className={view === "grid" ? "p-3" : "min-w-0"}>
        <h2 className="truncate text-sm font-semibold">{item.name}</h2>
        <p className="mt-1 truncate text-xs text-muted-foreground">{stat}</p>
        {unitPrice ? <p className="mt-1 truncate text-xs text-muted-foreground">{unitPrice}</p> : null}
        <ColorSwatches colors={item.colors ?? []} className="mt-2" />
      </div>
    </Card>
  );
}

function Fields(props: FieldsProps) {
  const t = useTranslations();
  const [newTag, setNewTag] = useState("");
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Field name="name" label={t("common.name")} defaultValue={props.item.name} required />
        {props.kind === "cloths" ? <Field name="quantity" label={t("cloths.quantity")} type="number" inputMode="numeric" defaultValue={props.item.quantity ?? 1} required /> : null}
        {props.kind === "cloths" ? <Field name="lengthTotal" label={t("cloths.lengthTotal")} type="number" inputMode="decimal" step="0.01" defaultValue={props.item.lengthTotal} required /> : null}
        {props.kind === "cloths" ? <UnitSelect name="lengthUnit" label={t("cloths.lengthUnit")} values={["m", "cm", "yd"]} value={props.item.lengthUnit ?? "m"} /> : null}
        {props.kind === "cloths" ? <Field name="width" label={t("cloths.width")} type="number" inputMode="decimal" step="0.01" defaultValue={props.item.width} /> : null}
        {props.kind === "cloths" ? <UnitSelect name="widthUnit" label={t("cloths.widthUnit")} values={["cm", "m", "in"]} value={props.item.widthUnit ?? "cm"} /> : null}
        {props.kind === "cloths" ? <UnitSelect name="purpose" label={t("cloths.purpose")} values={clothPurposeOptions} value={props.item.purpose ?? clothPurposeOptions[0]} labels={(value) => t(`clothPurpose.${value}`)} /> : null}
        {props.kind === "cloths" ? (
          <TextChoiceField
            name="materialType"
            label={t("cloths.materialType")}
            value={props.item.materialType ?? "其他"}
            options={[...new Set([...clothMaterialTypeDefaults, ...props.materialTypeOptions])]}
            required
          />
        ) : null}
        {props.kind === "cloths" || props.kind === "materials" ? <ColorField value={props.item.colors ?? []} /> : null}
        {props.kind === "patterns" ? <UnitSelect name="patternType" label={t("patterns.patternType")} values={patternTypeOptions} value={props.item.patternType ?? patternTypeOptions[0]} labels={(value) => t(`patternType.${value}`)} /> : null}
        {props.kind === "patterns" ? <UnitSelect name="difficulty" label={t("patterns.difficulty")} values={patternDifficultyOptions} value={props.item.difficulty ?? "medium"} labels={(value) => t(`patternDifficulty.${value}`)} /> : null}
        {props.kind === "patterns" ? (
          <TextChoiceField
            name="patternFor"
            label={t("patterns.patternFor")}
            value={props.item.patternFor ?? ""}
            options={patternForOptions}
            labels={(value) => patternForLabel(value, t)}
          />
        ) : null}
        {props.kind === "patterns" ? <Field name="size" label={t("patterns.size")} defaultValue={props.item.size} /> : null}
        {props.kind === "patterns" ? <Field name="pieces" label={t("patterns.pieces")} type="number" inputMode="numeric" defaultValue={props.item.pieces} /> : null}
        {props.kind === "materials" ? <MetaSelect name="categoryId" label={t("materials.category")} options={props.categories} value={props.item.categoryId} onCreate={props.onAddCategory} /> : null}
        {props.kind === "materials" ? <MetaSelect name="unitId" label={t("materials.unit")} options={props.units} value={props.item.unitId} onCreate={props.onAddUnit} /> : null}
        {props.kind === "materials" ? <Field name="quantityTotal" label={t("materials.quantityTotal")} type="number" inputMode="decimal" step="0.01" defaultValue={props.item.quantityTotal} required /> : null}
        {props.kind === "tools" ? (
          <TextChoiceField
            name="category"
            label={t("tools.category")}
            value={props.item.category ?? "其他"}
            options={[...new Set([...toolCategoryDefaults, ...props.toolCategoryOptions])]}
            required
          />
        ) : null}
        {props.kind === "tools" ? <Field name="quantity" label={t("tools.quantity")} type="number" inputMode="numeric" defaultValue={props.item.quantity ?? 1} required /> : null}
        {props.kind === "tools" ? <Field name="brand" label={t("tools.brand")} defaultValue={props.item.brand} /> : null}
        {props.kind === "tools" ? <Field name="model" label={t("tools.model")} defaultValue={props.item.model} /> : null}
        {props.kind === "tools" ? <UnitSelect name="condition" label={t("tools.condition")} values={toolConditionOptions} value={props.item.condition ?? "good"} labels={(value) => t(`toolCondition.${value}`)} /> : null}
        {props.kind === "projects" ? <Field name="quantity" label={t("projects.quantity")} type="number" inputMode="numeric" defaultValue={props.item.quantity ?? 1} required /> : null}
        <Field name="priceCents" label={props.kind === "projects" ? t("projects.extraCost") : t("common.price")} type="number" inputMode="decimal" step="0.01" defaultValue={dollarsFromCents(props.item.priceCents)} />
        {props.kind === "projects" ? <Field name="valueCents" label={t("projects.value")} type="number" inputMode="decimal" step="0.01" defaultValue={dollarsFromCents(props.item.valueCents)} /> : null}
        {props.kind !== "projects" ? <TextChoiceField name="source" label={t("common.source")} value={props.item.source ?? ""} options={props.sourceOptions} /> : null}
        {props.kind !== "projects" ? <Field name="purchasedAt" label={t("common.date")} type="date" defaultValue={props.item.purchasedAt} /> : null}
      </div>
      {props.kind === "projects" ? <ProjectLinks {...props} /> : null}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("common.tags")}</legend>
        <div className="flex flex-wrap gap-2">
          {props.tags.map((tag) => (
            <label key={tag.id} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-sm">
              <input name="tagIds" type="checkbox" value={tag.id} defaultChecked={props.item.tags?.some((item: AnyItem) => item.id === tag.id)} />
              <span>{tag.name}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder={t("common.tags")} />
          <Button type="button" variant="secondary" onClick={() => { void props.onAddTag(newTag); setNewTag(""); }}>
            {t("common.add")}
          </Button>
        </div>
      </fieldset>
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("common.remarks")}</span>
        <Textarea name="remarks" defaultValue={props.item.remarks ?? ""} />
      </label>
    </>
  );
}

function ProjectLinks(props: { item: AnyItem; clothOptions: AnyItem[]; patternOptions: AnyItem[]; materialOptions: AnyItem[] }) {
  const t = useTranslations();
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <RepeatSelect title={t("projects.patterns")} name="patternIds" options={props.patternOptions} selected={props.item.patternIds ?? []} />
      <LinkSelect title={t("projects.cloths")} idName="clothId" amountName="lengthUsed" options={props.clothOptions} links={props.item.cloths ?? []} amountLabel={t("projects.lengthUsed")} />
      <LinkSelect title={t("projects.materials")} idName="materialId" amountName="quantityUsed" options={props.materialOptions} links={props.item.materials ?? []} amountLabel={t("projects.quantityUsed")} />
    </div>
  );
}

function RepeatSelect({ title, name, options, selected }: { title: string; name: string; options: AnyItem[]; selected: number[] }) {
  const [rowCount, setRowCount] = useState(Math.max(1, selected.length));

  useEffect(() => {
    setRowCount(Math.max(1, selected.length));
  }, [selected.length]);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{title}</legend>
      {Array.from({ length: rowCount }, (_, row) => (
        <Select key={row} name={name} defaultValue={selected[row] ?? ""}>
          <option value="" />
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Select>
      ))}
      <Button type="button" variant="secondary" size="icon" aria-label={title} onClick={() => setRowCount((current) => current + 1)}>
        <Plus className="h-4 w-4" aria-hidden />
      </Button>
    </fieldset>
  );
}

function LinkSelect(props: { title: string; idName: string; amountName: string; options: AnyItem[]; links: AnyItem[]; amountLabel: string }) {
  const [rowCount, setRowCount] = useState(Math.max(1, props.links.length));

  useEffect(() => {
    setRowCount(Math.max(1, props.links.length));
  }, [props.links]);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{props.title}</legend>
      {Array.from({ length: rowCount }, (_, row) => (
        <div key={row} className="grid gap-2 md:grid-cols-2">
          <Select name={props.idName} defaultValue={props.links[row]?.[props.idName] ?? ""}>
            <option value="" />
            {props.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
          <Input name={props.amountName} type="number" inputMode="decimal" step="0.01" defaultValue={props.links[row]?.[props.amountName] ?? ""} placeholder={props.amountLabel} />
        </div>
      ))}
      <Button type="button" variant="secondary" size="icon" aria-label={props.title} onClick={() => setRowCount((current) => current + 1)}>
        <Plus className="h-4 w-4" aria-hidden />
      </Button>
    </fieldset>
  );
}

function Field(props: { name: string; label: string; defaultValue?: any; type?: string; step?: string; required?: boolean; inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"] }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{props.label}</span>
      <Input name={props.name} type={props.type} inputMode={props.inputMode} step={props.step} defaultValue={props.defaultValue ?? ""} required={props.required} />
    </label>
  );
}

function UnitSelect({ name, label, values, value, labels }: { name: string; label: string; values: string[]; value: string; labels?: (value: string) => string }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <Select name={name} defaultValue={value}>
        {values.map((item) => (
          <option key={item} value={item}>
            {labels ? labels(item) : item}
          </option>
        ))}
      </Select>
    </label>
  );
}

function TextChoiceField({
  name,
  label,
  value,
  options,
  labels,
  required = false
}: {
  name: string;
  label: string;
  value: string;
  options: string[];
  labels?: (value: string) => string;
  required?: boolean;
}) {
  const t = useTranslations();
  const knownOptions = [...new Set(options.filter(Boolean))];
  const optionKey = knownOptions.join("\u0000");
  const [mode, setMode] = useState(value && !knownOptions.includes(value) ? "__custom" : value ? value : "");
  const [custom, setCustom] = useState(value && !knownOptions.includes(value) ? value : "");
  const selectedValue = mode === "__custom" ? custom : mode;

  useEffect(() => {
    setMode(value && !knownOptions.includes(value) ? "__custom" : value ? value : "");
    setCustom(value && !knownOptions.includes(value) ? value : "");
  }, [value, optionKey]);

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium" htmlFor={`${name}-choice`}>{label}</label>
      <input type="hidden" name={name} value={selectedValue} />
      <Select id={`${name}-choice`} value={mode} required={required && !custom} onChange={(event) => setMode(event.target.value)}>
        <option value="">{required ? t("common.select") : ""}</option>
        {knownOptions.map((item) => (
          <option key={item} value={item}>
            {labels ? labels(item) : item}
          </option>
        ))}
        <option value="__custom">{t("common.custom")}</option>
      </Select>
      {mode === "__custom" ? (
        <Input value={custom} required={required} onChange={(event) => setCustom(event.target.value)} placeholder={label} maxLength={80} />
      ) : null}
    </div>
  );
}

function MetaSelect({ name, label, options, value, onCreate }: MetaSelectProps) {
  const t = useTranslations();
  const [selected, setSelected] = useState(value ? String(value) : "");
  const [newName, setNewName] = useState("");

  useEffect(() => {
    setSelected(value ? String(value) : "");
  }, [value]);

  async function createOption() {
    if (!onCreate || !newName.trim()) return;
    const item = await onCreate(newName);
    if (!item) return;
    setSelected(String(item.id));
    setNewName("");
  }

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium" htmlFor={name}>{label}</label>
      <Select id={name} name={name} value={selected} onChange={(event) => setSelected(event.target.value)}>
        <option value="" />
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>
      {onCreate ? (
        <div className="flex gap-2">
          <Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={label} />
          <Button type="button" variant="secondary" className="min-w-14 whitespace-nowrap px-3" onClick={createOption}>
            {t("common.add")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ColorField({ value }: { value: string[] }) {
  const t = useTranslations();
  const [colors, setColors] = useState(() => sanitizeColors(value));
  const [presetColor, setPresetColor] = useState("");
  const [customColor, setCustomColor] = useState("");

  useEffect(() => {
    setColors(sanitizeColors(value));
  }, [value]);

  const toggleColor = (color: string) => {
    setColors((current) =>
      current.includes(color) ? current.filter((item) => item !== color) : current.length < 5 ? [...current, color] : current
    );
  };

  const addCustomColor = () => {
    const color = normalizeColorName(customColor);
    if (!color) return;
    setColors((current) => (current.includes(color) || current.length >= 5 ? current : [...current, color]));
    setCustomColor("");
  };

  const addPresetColor = () => {
    const color = normalizeColorName(presetColor);
    if (!color) return;
    setColors((current) => (current.includes(color) || current.length >= 5 ? current : [...current, color]));
    setPresetColor("");
  };

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{t("common.colors")}</legend>
      {colors.map((color) => (
        <input key={color} type="hidden" name="colors" value={color} />
      ))}
      <div className="flex gap-2">
        <ColorSelect value={presetColor} options={commonColors} placeholder={t("common.selectColor")} onChange={setPresetColor} />
        <Button type="button" variant="secondary" className="min-w-14 whitespace-nowrap px-3" disabled={!presetColor || colors.length >= 5} onClick={addPresetColor}>
          {t("common.add")}
        </Button>
      </div>
      <div className="flex gap-2">
        <Input value={customColor} onChange={(event) => setCustomColor(event.target.value)} placeholder={t("common.customColor")} maxLength={30} />
        <Button type="button" variant="secondary" className="min-w-14 whitespace-nowrap px-3" disabled={!customColor.trim() || colors.length >= 5} onClick={addCustomColor}>
          {t("common.add")}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-muted px-2 text-sm"
            onClick={() => toggleColor(color)}
          >
            <ColorDot color={color} />
            {colorLabel(color, t)}
            <X className="h-3 w-3" aria-hidden />
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function FilterDrawer({
  kind,
  filters,
  tags,
  categories,
  units,
  clothOptions,
  patternOptions,
  materialOptions,
  colorOptions,
  sourceOptions,
  materialTypeOptions,
  toolCategoryOptions,
  onApply,
  onClose
}: {
  kind: Kind;
  filters: Filters;
  tags: MetaItem[];
  categories: MetaItem[];
  units: MetaItem[];
  clothOptions: AnyItem[];
  patternOptions: AnyItem[];
  materialOptions: AnyItem[];
  colorOptions: string[];
  sourceOptions: string[];
  materialTypeOptions: string[];
  toolCategoryOptions: string[];
  onApply: (filters: Filters) => void;
  onClose: () => void;
}) {
  const t = useTranslations();
  const [draft, setDraft] = useState(filters);
  const sourceListId = useId();

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onApply(next);
  }

  const toggleTag = (tagId: number) => {
    const next = {
      ...draft,
      tagIds: draft.tagIds.includes(tagId) ? draft.tagIds.filter((id) => id !== tagId) : [...draft.tagIds, tagId]
    };
    onApply(next);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/40 p-0 md:block md:p-3" role="dialog" aria-modal="true" onClick={onClose}>
      <Card className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-b-none rounded-t-2xl p-4 shadow-xl md:ml-auto md:h-full md:max-w-md md:rounded-b-md md:rounded-t-md" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/35 md:hidden" />
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("common.filters")}</h2>
          <Button type="button" variant="ghost" size="icon" aria-label={t("common.cancel")} onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="mt-4 flex-1 space-y-4 overflow-y-auto overscroll-contain">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("common.tags")}</legend>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <label key={tag.id} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-sm">
                  <input type="checkbox" checked={draft.tagIds.includes(tag.id)} onChange={() => toggleTag(tag.id)} />
                  <span>{tag.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {kind !== "projects" ? (
            <div className="grid gap-3">
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t("common.source")}</span>
                <Input
                  list={sourceOptions.length ? sourceListId : undefined}
                  value={draft.source}
                  placeholder={t("common.all")}
                  onChange={(event) => update("source", event.target.value)}
                />
                {sourceOptions.length ? (
                  <datalist id={sourceListId}>
                    {sourceOptions.map((source) => (
                      <option key={source} value={source} />
                    ))}
                  </datalist>
                ) : null}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-sm font-medium">{t("common.from")}</span>
                  <Input type="date" value={draft.from} onChange={(event) => update("from", event.target.value)} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">{t("common.to")}</span>
                  <Input type="date" value={draft.to} onChange={(event) => update("to", event.target.value)} />
                </label>
              </div>
            </div>
          ) : null}

          {kind === "cloths" ? (
            <div className="grid gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.hasStockLeft} onChange={(event) => update("hasStockLeft", event.target.checked)} />
                <span>{t("cloths.hasStockLeft")}</span>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t("cloths.purpose")}</span>
                <Select value={draft.purpose} onChange={(event) => update("purpose", event.target.value)}>
                  <option value="">{t("common.all")}</option>
                  {clothPurposeOptions.map((purpose) => (
                    <option key={purpose} value={purpose}>
                      {t(`clothPurpose.${purpose}`)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t("cloths.materialType")}</span>
                <Select value={draft.materialType} onChange={(event) => update("materialType", event.target.value)}>
                  <option value="">{t("common.all")}</option>
                  {[...new Set([...clothMaterialTypeDefaults, ...materialTypeOptions])].map((materialType) => (
                    <option key={materialType} value={materialType}>
                      {materialType}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          ) : null}

          {kind === "patterns" ? (
            <div className="grid gap-3">
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t("patterns.patternType")}</span>
                <Select value={draft.patternType} onChange={(event) => update("patternType", event.target.value)}>
                  <option value="">{t("common.all")}</option>
                  {patternTypeOptions.map((patternType) => (
                    <option key={patternType} value={patternType}>
                      {t(`patternType.${patternType}`)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t("patterns.difficulty")}</span>
                <Select value={draft.difficulty} onChange={(event) => update("difficulty", event.target.value)}>
                  <option value="">{t("common.all")}</option>
                  {patternDifficultyOptions.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {t(`patternDifficulty.${difficulty}`)}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          ) : null}

          {kind === "tools" ? (
            <div className="grid gap-3">
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t("tools.category")}</span>
                <Select value={draft.category} onChange={(event) => update("category", event.target.value)}>
                  <option value="">{t("common.all")}</option>
                  {[...new Set([...toolCategoryDefaults, ...toolCategoryOptions])].map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t("tools.condition")}</span>
                <Select value={draft.condition} onChange={(event) => update("condition", event.target.value)}>
                  <option value="">{t("common.all")}</option>
                  {toolConditionOptions.map((condition) => (
                    <option key={condition} value={condition}>
                      {t(`toolCondition.${condition}`)}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          ) : null}

          {kind === "cloths" || kind === "materials" || kind === "projects" ? (
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t("common.colors")}</span>
              <ColorSelect
                value={draft.color}
                options={[...new Set([...commonColors, ...colorOptions])]}
                placeholder={t("common.all")}
                onChange={(color) => update("color", color)}
                includeEmpty
              />
            </label>
          ) : null}

          {kind !== "projects" && kind !== "tools" ? (
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t("common.used")}</span>
              <Select value={draft.used} onChange={(event) => update("used", event.target.value)}>
                <option value="">{t("common.all")}</option>
                <option value="true">{t("common.used")}</option>
                <option value="false">{t("common.unused")}</option>
              </Select>
            </label>
          ) : null}

          {kind === "materials" ? (
            <div className="grid gap-3">
              <OptionFilter label={t("materials.category")} value={draft.categoryId} options={categories} onChange={(value) => update("categoryId", value)} />
              <OptionFilter label={t("materials.unit")} value={draft.unitId} options={units} onChange={(value) => update("unitId", value)} />
            </div>
          ) : null}

          {kind === "projects" ? (
            <div className="grid gap-3">
              <OptionFilter label={t("projects.patterns")} value={draft.patternId} options={patternOptions} onChange={(value) => update("patternId", value)} />
              <OptionFilter label={t("projects.cloths")} value={draft.clothId} options={clothOptions} onChange={(value) => update("clothId", value)} />
              <OptionFilter label={t("projects.materials")} value={draft.materialId} options={materialOptions} onChange={(value) => update("materialId", value)} />
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const next = emptyFilters();
              setDraft(next);
              onApply(next);
            }}
          >
            {t("common.reset")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function OptionFilter({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: AnyItem[];
  onChange: (value: string) => void;
}) {
  const t = useTranslations();
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{t("common.all")}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </Select>
    </label>
  );
}

function ColorSelect({
  value,
  options,
  placeholder,
  includeEmpty,
  onChange
}: {
  value: string;
  options: string[];
  placeholder: string;
  includeEmpty?: boolean;
  onChange: (value: string) => void;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();
  const selectedLabel = value ? colorLabel(value, t) : placeholder;

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  function choose(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative min-w-0 flex-1" onKeyDown={(event) => event.key === "Escape" && setOpen(false)}>
      <button
        type="button"
        className="flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-white px-3 text-left text-base shadow-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          {value ? <ColorDot color={value} /> : null}
          <span className="truncate">{selectedLabel}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {open ? (
        <div id={listId} role="listbox" className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-white p-1 shadow-xl">
          {includeEmpty ? (
            <button type="button" role="option" aria-selected={!value} className="flex h-10 w-full items-center rounded px-2 text-left text-base hover:bg-muted" onClick={() => choose("")}>
              {placeholder}
            </button>
          ) : null}
          {options.map((color) => (
            <button
              key={color}
              type="button"
              role="option"
              aria-selected={value === color}
              className="flex h-10 w-full items-center gap-2 rounded px-2 text-left text-base hover:bg-muted aria-selected:bg-muted"
              onClick={() => choose(color)}
            >
              <ColorDot color={color} />
              <span className="truncate">{colorLabel(color, t)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ColorSwatches({ colors, className = "" }: { colors: string[]; className?: string }) {
  const safeColors = sanitizeColors(colors);
  if (!safeColors.length) return null;
  const t = useTranslations();
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {safeColors.map((color) => (
        <span key={color} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs">
          <ColorDot color={color} />
          {colorLabel(color, t)}
        </span>
      ))}
    </div>
  );
}

function ColorDot({ color }: { color: string }) {
  const backgroundColor = colorSwatches[color] ?? "transparent";
  return (
    <span
      className="h-4 w-4 rounded-full border border-border"
      style={{
        backgroundColor,
        backgroundImage: backgroundColor === "transparent" ? "linear-gradient(135deg, #ef4444 0 33%, #eab308 33% 66%, #3b82f6 66% 100%)" : undefined
      }}
    />
  );
}

function ConfirmSheet({ message, onCancel, onConfirm }: { message: string; onCancel: () => void; onConfirm: () => void }) {
  const t = useTranslations();
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 md:items-center md:justify-center md:p-3" role="dialog" aria-modal="true" onClick={onCancel}>
      <Card className="w-full rounded-b-none rounded-t-2xl p-4 shadow-xl md:max-w-sm md:rounded-b-md md:rounded-t-md" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/35 md:hidden" />
        <p className="text-base font-medium">{message}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm}>
            {t("common.delete")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed inset-x-3 bottom-[calc(92px+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-md bg-foreground px-4 py-3 text-sm text-background shadow-xl md:bottom-6">
      {message}
    </div>
  );
}

function Detail({
  item,
  kind,
  onEdit,
  onDuplicate,
  onDelete,
  onClose,
  onOpenPhoto,
  onUploaded
}: DetailProps) {
  const t = useTranslations();
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/40 p-0 md:items-center md:justify-center md:p-3" role="dialog" aria-modal="true" onClick={onClose}>
      <Card className="max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-b-none rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl md:max-h-[88dvh] md:max-w-2xl md:rounded-b-md md:rounded-t-md md:pb-4" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/35 md:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{item.name}</h2>
            <p className="text-sm text-muted-foreground">{primaryStat(kind, item, t)}</p>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="secondary" aria-label={t("common.edit")} onClick={onEdit}>
              <Pencil className="h-4 w-4" aria-hidden />
            </Button>
            {onDuplicate ? (
              <Button size="icon" variant="secondary" aria-label={t("common.duplicate")} onClick={onDuplicate}>
                <Copy className="h-4 w-4" aria-hidden />
              </Button>
            ) : null}
            <Button size="icon" variant="danger" aria-label={t("common.delete")} onClick={onDelete}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
            <Button size="icon" variant="ghost" aria-label={t("common.cancel")} onClick={onClose}>
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
        <ColorSwatches colors={item.colors ?? []} className="mt-3" />
        <PhotoStrip item={item} kind={kind} readOnly onUploaded={onUploaded} onOpenPhoto={onOpenPhoto} />
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {detailRows(kind, item, t).map((row) => (
            <div key={row.label} className="rounded-md bg-muted p-2">
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="break-words">{row.value}</dd>
            </div>
          ))}
        </dl>
        {kind === "projects" && item.cost ? <p className="mt-3 text-xs text-muted-foreground">{t("projects.costCaveat")}</p> : null}
      </Card>
    </div>
  );
}

function PhotoStrip({
  item,
  kind,
  readOnly = false,
  onUploaded,
  onOpenPhoto,
  onError
}: PhotoStripProps) {
  const t = useTranslations();
  const photos = item.photos ?? [];
  const photoIds = photos.map((photo: AnyItem) => photo.id);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    try {
      await uploadStagedPhotos(filesToStaged(files), kind, item.id);
      if (onUploaded) await onUploaded();
      else window.location.reload();
    } catch (error) {
      onError?.(`${t("common.uploadFailed")}: ${error instanceof Error ? error.message : t("common.error")}`);
    }
  }

  async function updatePhoto(photoId: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/photos/${photoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      onError?.(t("common.error"));
      return;
    }
    if (onUploaded) await onUploaded();
  }

  async function deletePhoto(photoId: string) {
    const response = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
    if (!response.ok) {
      onError?.(t("common.error"));
      return;
    }
    if (onUploaded) await onUploaded();
  }

  async function movePhoto(index: number, direction: -1 | 1) {
    const current = photos[index];
    const other = photos[index + direction];
    if (!current || !other) return;
    await Promise.all([
      fetch(`/api/photos/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: other.sortOrder ?? index + direction })
      }),
      fetch(`/api/photos/${other.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: current.sortOrder ?? index })
      })
    ]);
    if (onUploaded) await onUploaded();
  }

  return (
    <div className="mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-contain">
      {photos.map((photo: AnyItem, index: number) => (
        <div key={photo.id} className="group relative h-28 w-28 shrink-0 snap-start overflow-hidden rounded-md bg-muted">
          <button type="button" className="h-full w-full" onClick={() => onOpenPhoto?.(photoIds, index)}>
            <img src={`/api/photos/${photo.id}/thumb`} alt="" className="h-full w-full object-cover" />
          </button>
          {!readOnly ? (
            <>
              <div className="absolute inset-x-1 top-1 flex justify-between gap-1">
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded bg-black/55 text-white disabled:opacity-40"
                  aria-label={t("common.moveLeft")}
                  disabled={index === 0}
                  onClick={() => movePhoto(index, -1)}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded bg-black/55 text-white disabled:opacity-40"
                  aria-label={t("common.moveRight")}
                  disabled={index === photos.length - 1}
                  onClick={() => movePhoto(index, 1)}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                <button
                  type="button"
                  className={`inline-flex h-9 w-9 items-center justify-center rounded text-white ${photo.isCover ? "bg-primary" : "bg-black/55"}`}
                  aria-label={t("common.setCover")}
                  onClick={() => updatePhoto(photo.id, { isCover: true })}
                >
                  <Star className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded bg-black/55 text-white"
                  aria-label={t("common.delete")}
                  onClick={() => deletePhoto(photo.id)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </>
          ) : null}
        </div>
      ))}
      {!readOnly ? <PhotoPicker onChange={(files) => upload(files)} /> : null}
    </div>
  );
}

function PhotoLightbox({
  state,
  setState,
  onClose
}: {
  state: LightboxState;
  setState: (state: LightboxState) => void;
  onClose: () => void;
}) {
  const t = useTranslations();
  const photoId = state.photos[state.index];
  const canPage = state.photos.length > 1;
  const touchStartRef = useRef<number | null>(null);
  const go = (direction: -1 | 1) => {
    const nextIndex = (state.index + direction + state.photos.length) % state.photos.length;
    setState({ ...state, index: nextIndex });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      onTouchStart={(event) => {
        touchStartRef.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (!canPage || touchStartRef.current === null) return;
        const delta = event.changedTouches[0].clientX - touchStartRef.current;
        touchStartRef.current = null;
        if (Math.abs(delta) < 40) return;
        go(delta > 0 ? -1 : 1);
      }}
    >
      <button
        type="button"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-white/10 text-white"
        aria-label={t("common.cancel")}
        onClick={onClose}
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
      {canPage ? (
        <button
          type="button"
          className="absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md bg-white/10 text-white"
          aria-label={t("common.previous")}
          onClick={(event) => {
            event.stopPropagation();
            go(-1);
          }}
        >
          <ChevronLeft className="h-6 w-6" aria-hidden />
        </button>
      ) : null}
      <img
        src={`/api/photos/${photoId}/display`}
        alt=""
        className="max-h-[90dvh] max-w-[92vw] rounded-md object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      />
      {canPage ? (
        <button
          type="button"
          className="absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md bg-white/10 text-white"
          aria-label={t("common.next")}
          onClick={(event) => {
            event.stopPropagation();
            go(1);
          }}
        >
          <ChevronRight className="h-6 w-6" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function PhotoPicker({ name, onChange }: { name?: string; onChange?: (files: FileList | null) => void }) {
  const t = useTranslations();
  const inputClass = "sr-only";
  const labelClass = "flex h-28 w-28 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted text-xs font-medium text-muted-foreground";
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event.target.files);
    event.target.value = "";
  };

  return (
    <>
      <label className={labelClass}>
        <Camera className="h-5 w-5" aria-hidden />
        <span>{t("common.camera")}</span>
        <input className={inputClass} name={name} type="file" accept="image/*" capture="environment" onChange={handleChange} aria-label={t("common.camera")} />
      </label>
      <label className={labelClass}>
        <Plus className="h-5 w-5" aria-hidden />
        <span>{t("common.album")}</span>
        <input className={inputClass} name={name} type="file" accept="image/*" multiple onChange={handleChange} aria-label={t("common.album")} />
      </label>
    </>
  );
}

function StagedPhotoStrip({
  photos,
  setPhotos,
  onAdd
}: {
  photos: StagedPhoto[];
  setPhotos: (updater: (current: StagedPhoto[]) => StagedPhoto[]) => void;
  onAdd: (files: FileList | null) => void;
}) {
  const t = useTranslations();

  function updatePhoto(photoId: string, update: Partial<StagedPhoto>) {
    setPhotos((current) =>
      current.map((photo) =>
        photo.id === photoId
          ? { ...photo, ...update }
          : update.isCover
            ? { ...photo, isCover: false }
            : photo
      )
    );
  }

  function deletePhoto(photoId: string) {
    setPhotos((current) => {
      const next = current.filter((photo) => photo.id !== photoId);
      return next.some((photo) => photo.isCover) ? next : next.map((photo, index) => ({ ...photo, isCover: index === 0 }));
    });
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setPhotos((current) => {
      const next = [...current];
      const target = index + direction;
      if (!next[index] || !next[target]) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-contain">
      {photos.map((photo, index) => (
        <StagedPhotoPreview
          key={photo.id}
          photo={photo}
          canMoveLeft={index > 0}
          canMoveRight={index < photos.length - 1}
          onSetCover={() => updatePhoto(photo.id, { isCover: true })}
          onDelete={() => deletePhoto(photo.id)}
          onMoveLeft={() => movePhoto(index, -1)}
          onMoveRight={() => movePhoto(index, 1)}
        />
      ))}
      <PhotoPicker onChange={onAdd} />
      <span className="sr-only">{t("common.photos")}</span>
    </div>
  );
}

function StagedPhotoPreview({
  photo,
  canMoveLeft,
  canMoveRight,
  onSetCover,
  onDelete,
  onMoveLeft,
  onMoveRight
}: {
  photo: StagedPhoto;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onSetCover: () => void;
  onDelete: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}) {
  const t = useTranslations();
  const [url, setUrl] = useState("");

  useEffect(() => {
    const nextUrl = URL.createObjectURL(photo.file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [photo.file]);

  return (
    <div className="group relative h-28 w-28 shrink-0 snap-start overflow-hidden rounded-md bg-muted">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
      <div className="absolute inset-x-1 top-1 flex justify-between gap-1">
        <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded bg-black/55 text-white disabled:opacity-40" aria-label={t("common.moveLeft")} disabled={!canMoveLeft} onClick={onMoveLeft}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded bg-black/55 text-white disabled:opacity-40" aria-label={t("common.moveRight")} disabled={!canMoveRight} onClick={onMoveRight}>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
        <button type="button" className={`inline-flex h-9 w-9 items-center justify-center rounded text-white ${photo.isCover ? "bg-primary" : "bg-black/55"}`} aria-label={t("common.setCover")} onClick={onSetCover}>
          <Star className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded bg-black/55 text-white" aria-label={t("common.delete")} onClick={onDelete}>
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function emptyFilters(): Filters {
  return {
    tagIds: [],
    source: "",
    purpose: "",
    materialType: "",
    patternType: "",
    difficulty: "",
    from: "",
    to: "",
    used: "",
    hasStockLeft: false,
    color: "",
    categoryId: "",
    unitId: "",
    patternId: "",
    clothId: "",
    materialId: "",
    category: "",
    condition: ""
  };
}

function hasFilters(filters: Filters) {
  return (
    filters.tagIds.length > 0 ||
    Boolean(filters.source || filters.purpose || filters.materialType || filters.patternType || filters.difficulty || filters.category || filters.condition || filters.from || filters.to || filters.used || filters.hasStockLeft || filters.color) ||
    Boolean(filters.categoryId || filters.unitId || filters.patternId || filters.clothId || filters.materialId)
  );
}

function buildListParams(query: string, sort: string, filters: Filters, dir: "asc" | "desc") {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("sort", sort);
  params.set("dir", dir);
  if (filters.tagIds.length) params.set("tags", filters.tagIds.join(","));
  if (filters.source) params.set("source", filters.source);
  if (filters.purpose) params.set("purpose", filters.purpose);
  if (filters.materialType) params.set("materialType", filters.materialType);
  if (filters.patternType) params.set("patternType", filters.patternType);
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.used) params.set("used", filters.used);
  if (filters.hasStockLeft) params.set("hasStockLeft", "true");
  if (filters.color) params.set("color", filters.color);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.unitId) params.set("unitId", filters.unitId);
  if (filters.patternId) params.set("patternId", filters.patternId);
  if (filters.clothId) params.set("clothId", filters.clothId);
  if (filters.materialId) params.set("materialId", filters.materialId);
  if (filters.category) params.set("category", filters.category);
  if (filters.condition) params.set("condition", filters.condition);
  return params;
}

function sanitizeColors(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map(normalizeColorName)
        .filter((item): item is string => Boolean(item))
    )
  ].slice(0, 5);
}

function normalizeColorName(value: unknown) {
  const color = String(value ?? "").trim().toLowerCase();
  return color && color.length <= 30 ? color : "";
}

function colorLabel(color: string, t: ReturnType<typeof useTranslations>) {
  return commonColors.includes(color) ? t(`colors.${color}`) : color;
}

function patternForLabel(value: string, t: ReturnType<typeof useTranslations>) {
  return patternForOptions.includes(value) ? t(`patternFor.${value}`) : value;
}

function collectColors(groups: AnyItem[][]) {
  return [
    ...new Set(
      groups.flatMap((items) =>
        items.flatMap((item) => sanitizeColors(item.colors))
      )
    )
  ].sort();
}

function summaryCards(kind: Kind, summary: Record<string, any>, t: ReturnType<typeof useTranslations>) {
  if (kind === "cloths") {
    return [
      { label: t("cloths.total"), value: summary.count ?? 0 },
      { label: t("cloths.cost"), value: money(summary.totalCost) },
      { label: t("cloths.usedLength"), value: `${numberValue(summary.lengthUsedMetres)} m` },
      { label: t("cloths.remainingLength"), value: `${numberValue(summary.lengthRemainingMetres)} m` }
    ];
  }
  if (kind === "projects") {
    return [
      { label: t("projects.total"), value: summary.count ?? 0 },
      { label: t("projects.cost"), value: money(summary.totalCost) },
      { label: t("projects.value"), value: money(summary.totalValue) },
      { label: t("projects.produced"), value: summary.totalProduced ?? 0 }
    ];
  }
  if (kind === "tools") {
    return [
      { label: t("tools.total"), value: summary.count ?? 0 },
      { label: t("tools.totalQuantity"), value: summary.totalQuantity ?? 0 },
      { label: t("tools.cost"), value: money(summary.totalCost) },
      { label: t("tools.needsAttention"), value: summary.needsAttention ?? 0 }
    ];
  }
  const prefix = kind === "patterns" ? "patterns" : "materials";
  return [
    { label: t(`${prefix}.total`), value: summary.count ?? 0 },
    { label: t(`${prefix}.cost`), value: money(summary.totalCost) },
    { label: t(`${prefix}.usedCount`), value: summary.used ?? 0 },
    { label: t(`${prefix}.unusedCount`), value: summary.unused ?? 0 }
  ];
}

function primaryStat(kind: Kind, item: AnyItem, t: ReturnType<typeof useTranslations>) {
  if (kind === "cloths") {
    return `${t("common.total")} ${numberValue(item.lengthTotal)} ${item.lengthUnit} / ${t("common.remaining")} ${numberValue(item.lengthRemaining)} ${item.lengthUnit}`;
  }
  if (kind === "patterns") {
    const patternFor = item.patternFor ? patternForLabel(item.patternFor, t) : "";
    return [patternFor, item.size].filter(Boolean).join(" · ") || t("common.details");
  }
  if (kind === "materials") {
    const unit = item.unitName ? ` ${item.unitName}` : "";
    return `${t("common.total")} ${numberValue(item.quantityTotal)}${unit} / ${t("common.remaining")} ${numberValue(item.quantityRemaining)}${unit}`;
  }
  if (kind === "tools") return `${item.category ?? t("common.details")} · ${t("tools.quantity")} ${item.quantity ?? 1}`;
  return `${money(item.cost?.totalCost ?? item.priceCents)} / ${money(item.valueCents)}`;
}

function unitPriceStat(kind: Kind, item: AnyItem, t: ReturnType<typeof useTranslations>) {
  if (kind === "cloths" && item.priceCents && item.lengthTotal > 0) {
    return `${t("common.unitPrice")} ${money(Math.round(item.priceCents / item.lengthTotal))}/${item.lengthUnit}`;
  }
  if (kind === "materials" && item.priceCents && item.quantityTotal > 0) {
    return `${t("common.unitPrice")} ${money(Math.round(item.priceCents / item.quantityTotal))}/${item.unitName ?? t("common.unit")}`;
  }
  if (kind === "patterns" && item.priceCents) {
    const divisor = item.pieces && item.pieces > 0 ? item.pieces : 1;
    return `${t("common.unitPrice")} ${money(Math.round(item.priceCents / divisor))}/${t("common.piece")}`;
  }
  if (kind === "projects" && item.valueCents && item.quantity > 0) {
    return `${t("common.unitPrice")} ${money(Math.round(item.valueCents / item.quantity))}/${t("common.piece")}`;
  }
  if (kind === "tools" && item.priceCents && item.quantity > 0) {
    return `${t("common.unitPrice")} ${money(Math.round(item.priceCents / item.quantity))}/${t("common.piece")}`;
  }
  return "";
}

function detailRows(kind: Kind, item: AnyItem, t: ReturnType<typeof useTranslations>) {
  const rows: Array<{ label: string; value: string }> = [];
  const add = (label: string, value?: unknown, formatter?: (value: any) => string) => {
    if (value === null || value === undefined || value === "") return;
    rows.push({ label, value: formatter ? formatter(value) : String(value) });
  };

  if (kind === "cloths") {
    add(t("cloths.quantity"), item.quantity);
    add(t("cloths.purpose"), item.purpose, (value) => t(`clothPurpose.${value}`));
    add(t("cloths.materialType"), item.materialType);
    add(t("cloths.lengthTotal"), item.lengthTotal, (value) => `${numberValue(value)} ${item.lengthUnit}`);
    add(t("cloths.lengthRemaining"), item.lengthRemaining, (value) => `${numberValue(value)} ${item.lengthUnit}`);
    add(t("cloths.width"), item.width, (value) => `${numberValue(value)} ${item.widthUnit ?? ""}`.trim());
    add(t("common.source"), item.source);
    add(t("common.price"), item.priceCents, money);
    add(t("common.date"), item.purchasedAt);
  } else if (kind === "patterns") {
    add(t("patterns.patternType"), item.patternType, (value) => t(`patternType.${value}`));
    add(t("patterns.difficulty"), item.difficulty, (value) => t(`patternDifficulty.${value}`));
    add(t("patterns.patternFor"), item.patternFor, (value) => patternForLabel(value, t));
    add(t("patterns.size"), item.size);
    add(t("patterns.pieces"), item.pieces);
    add(t("common.source"), item.source);
    add(t("common.price"), item.priceCents, money);
    add(t("common.date"), item.purchasedAt);
  } else if (kind === "materials") {
    add(t("materials.category"), item.categoryName);
    add(t("materials.unit"), item.unitName);
    add(t("materials.quantityTotal"), item.quantityTotal, numberValue);
    add(t("materials.quantityRemaining"), item.quantityRemaining, numberValue);
    add(t("common.source"), item.source);
    add(t("common.price"), item.priceCents, money);
    add(t("common.date"), item.purchasedAt);
  } else if (kind === "tools") {
    add(t("tools.category"), item.category);
    add(t("tools.quantity"), item.quantity);
    add(t("tools.brand"), item.brand);
    add(t("tools.model"), item.model);
    add(t("tools.condition"), item.condition, (value) => t(`toolCondition.${value}`));
    add(t("common.source"), item.source);
    add(t("common.price"), item.priceCents, money);
    add(t("common.date"), item.purchasedAt);
  } else {
    add(t("projects.quantity"), item.quantity);
    add(t("projects.extraCost"), item.priceCents, money);
    add(t("projects.value"), item.valueCents, money);
    add(t("projects.cost"), item.cost?.totalCost, money);
  }

  add(t("common.remarks"), item.remarks);
  return rows;
}

function defaultItem(kind: Kind) {
  if (kind === "cloths") return { quantity: 1, lengthUnit: "m", widthUnit: "cm", purpose: "garment", materialType: "其他" };
  if (kind === "materials") return {};
  if (kind === "projects") return { quantity: 1 };
  if (kind === "tools") return { quantity: 1, category: "其他", condition: "good" };
  return { patternType: "paper", difficulty: "medium" };
}

function formToBody(kind: Kind, form: FormData) {
  const base: Record<string, any> = {
    name: form.get("name"),
    priceCents: centsFromDollars(form.get("priceCents")),
    remarks: stringOrNull(form.get("remarks")),
    tagIds: form.getAll("tagIds").map(Number)
  };
  if (kind !== "projects") {
    base.source = stringOrNull(form.get("source"));
    base.purchasedAt = stringOrNull(form.get("purchasedAt"));
  }
  if (kind === "cloths") {
    return {
      ...base,
      quantity: Number(form.get("quantity") || 1),
      lengthTotal: Number(form.get("lengthTotal")),
      lengthUnit: form.get("lengthUnit"),
      width: numberOrNull(form.get("width")),
      widthUnit: stringOrNull(form.get("widthUnit")),
      purpose: form.get("purpose"),
      materialType: stringOrNull(form.get("materialType")) ?? "其他",
      colors: sanitizeColors(form.getAll("colors"))
    };
  }
  if (kind === "patterns") {
    return {
      ...base,
      patternType: form.get("patternType"),
      difficulty: form.get("difficulty") || "medium",
      patternFor: stringOrNull(form.get("patternFor")),
      size: stringOrNull(form.get("size")),
      pieces: numberOrNull(form.get("pieces"))
    };
  }
  if (kind === "materials") {
    return {
      ...base,
      categoryId: numberOrNull(form.get("categoryId")),
      unitId: numberOrNull(form.get("unitId")),
      quantityTotal: Number(form.get("quantityTotal")),
      colors: sanitizeColors(form.getAll("colors"))
    };
  }
  if (kind === "tools") {
    return {
      ...base,
      category: stringOrNull(form.get("category")) ?? "其他",
      quantity: Number(form.get("quantity") || 1),
      brand: stringOrNull(form.get("brand")),
      model: stringOrNull(form.get("model")),
      condition: form.get("condition") || "good"
    };
  }
  const clothIds = form.getAll("clothId");
  const clothAmounts = form.getAll("lengthUsed");
  const materialIds = form.getAll("materialId");
  const materialAmounts = form.getAll("quantityUsed");
  return {
    ...base,
    quantity: Number(form.get("quantity") || 1),
    valueCents: centsFromDollars(form.get("valueCents")),
    patternIds: form.getAll("patternIds").map(Number).filter(Boolean),
    cloths: clothIds
      .map((id, index) => ({ clothId: Number(id), lengthUsed: Number(clothAmounts[index]) }))
      .filter((link) => link.clothId && link.lengthUsed),
    materials: materialIds
      .map((id, index) => ({ materialId: Number(id), quantityUsed: Number(materialAmounts[index]) }))
      .filter((link) => link.materialId && link.quantityUsed)
  };
}

function stringOrNull(value: FormDataEntryValue | null) {
  const text = value?.toString().trim() ?? "";
  return text ? text : null;
}

function numberOrNull(value: FormDataEntryValue | null) {
  const text = value?.toString().trim() ?? "";
  return text ? Number(text) : null;
}

function dollarsFromCents(cents?: number | null) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

function centsFromDollars(value: FormDataEntryValue | null) {
  const text = value?.toString().trim() ?? "";
  return text ? Math.round(Number(text) * 100) : null;
}

function filesToStaged(files: FileList | null) {
  return Array.from(files ?? [])
    .filter((file) => file.size > 0)
    .map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${file.size}-${index}-${crypto.randomUUID()}`,
      file,
      isCover: false
    }));
}

async function uploadStagedPhotos(values: StagedPhoto[], kind: Kind, entityId: number) {
  for (const value of values) {
    if (value.file.size === 0) continue;
    const form = new FormData();
    form.set("file", value.file);
    form.set("entityType", entityByKind[kind]);
    form.set("entityId", String(entityId));
    if (value.isCover) form.set("setCover", "true");
    const response = await fetch("/api/photos", { method: "POST", body: form });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? `${response.status}`);
    }
  }
}

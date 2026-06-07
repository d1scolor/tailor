"use client";

import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Camera, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Grid2X2, List, Pencil, Plus, Search, SlidersHorizontal, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { money, numberValue } from "@/lib/format";
import type { Kind } from "@/lib/repository";
import { fabricUnits, type UnitSystem } from "@/lib/units";

type AnyItem = Record<string, any>;
type MetaItem = { id: number; name: string; sortOrder?: number };
type PickerKind = Extract<Kind, "fabrics" | "patterns" | "materials">;
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
  fabricId: string;
  materialId: string;
  category: string;
  condition: string;
  usageStatus: string;
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
  fabricOptions?: AnyItem[];
  patternOptions?: AnyItem[];
  materialOptions?: AnyItem[];
  sourceOptions?: string[];
  fabricSourceOptions?: string[];
  patternSourceOptions?: string[];
  materialSourceOptions?: string[];
  materialTypeOptions?: string[];
  patternTypeOptions?: string[];
  toolCategoryOptions?: string[];
  unitSystem?: UnitSystem;
};
type FieldsProps = {
  kind: Kind;
  item: AnyItem;
  tags: MetaItem[];
  categories: MetaItem[];
  units: MetaItem[];
  fabricOptions: AnyItem[];
  patternOptions: AnyItem[];
  materialOptions: AnyItem[];
  sourceOptions: string[];
  fabricSourceOptions: string[];
  patternSourceOptions: string[];
  materialSourceOptions: string[];
  materialTypeOptions: string[];
  patternTypeOptions: string[];
  toolCategoryOptions: string[];
  unitSystem: UnitSystem;
  onAddTag: (name: string) => void;
  onAddCategory: CreateMetaHandler;
  onAddUnit: CreateMetaHandler;
  onOpenPhoto: (photos: string[], index: number) => void;
};
type BrowserResources = {
  tags: MetaItem[];
  categories: MetaItem[];
  units: MetaItem[];
  fabricOptions: AnyItem[];
  patternOptions: AnyItem[];
  materialOptions: AnyItem[];
  colorOptions: string[];
  sourceOptions: string[];
  materialTypeOptions: string[];
  patternTypeOptions: string[];
  toolCategoryOptions: string[];
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
  fabricOptions: AnyItem[];
  patternOptions: AnyItem[];
  materialOptions: AnyItem[];
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
  fabrics: "fabric",
  patterns: "pattern",
  materials: "material",
  projects: "project",
  tools: "tool"
} as const;
const fabricPurposeOptions = ["garment", "craft"];
const patternTypeDefaults = ["paper", "digital"];
const patternDifficultyOptions = ["easy", "medium", "hard"];
const materialUsageStatusOptions = ["available", "used"];
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
const toolCategoryDefaults = ["cutting", "measuring", "sewingMachineAccessories", "handSewing", "pressing", "marking", "storage", "maintenance", "other"];
const fabricMaterialTypeDefaults = [
  "cotton",
  "linen",
  "wool",
  "silk",
  "viscose",
  "polyester",
  "nylon",
  "denim",
  "canvas",
  "knit",
  "flannel",
  "leather",
  "blend",
  "other"
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
  const unitSystem = props.unitSystem ?? "metric";
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
  const [patternTypeOptions, setPatternTypeOptions] = useState(props.patternTypeOptions ?? []);
  const [toolCategoryOptions, setToolCategoryOptions] = useState(props.toolCategoryOptions ?? []);
  const submitLockRef = useRef(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshSeqRef = useRef(0);
  const title = t(`${props.kind}.title`);
  const colorOptions = useMemo(
    () => collectColors([props.items, items, props.fabricOptions ?? [], props.materialOptions ?? []]),
    [items, props.items, props.fabricOptions, props.materialOptions]
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (confirmDelete) setConfirmDelete(null);
      else if (lightbox) setLightbox(null);
      else if (filterOpen) setFilterOpen(false);
      else if (editing) {
        setStagedPhotoFiles([]);
        setEditing(null);
      }
      else if (selected) setSelected(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editing, selected, lightbox, filterOpen, confirmDelete]);

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
        notify(await errorMessage(response, t));
        return;
      }
      const { item } = (await response.json()) as { item: AnyItem };
      rememberSource(body.source);
      rememberMaterialType(body.materialType);
      rememberPatternType(body.patternType);
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
    setEditing(defaultItem(props.kind, unitSystem));
  }

  function openEdit(item: AnyItem) {
    setStagedPhotoFiles([]);
    setEditing(item);
  }

  async function openSelected(item: AnyItem) {
    if (props.kind !== "projects") {
      setSelected(item);
      return;
    }
    const response = await fetch(`/api/${props.kind}/${item.id}`);
    if (!response.ok) {
      notify(await errorMessage(response, t));
      return;
    }
    const { item: fullItem } = (await response.json()) as { item: AnyItem };
    setSelected(fullItem);
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
    if (!materialType || props.kind !== "fabrics") return;
    setMaterialTypeOptions((current) => (current.includes(materialType) ? current : [...current, materialType].sort()));
  }

  function rememberPatternType(value: unknown) {
    const patternType = String(value ?? "").trim();
    if (!patternType || props.kind !== "patterns") return;
    setPatternTypeOptions((current) => (current.includes(patternType) ? current : [...current, patternType].sort()));
  }

  function rememberToolCategory(value: unknown) {
    const category = String(value ?? "").trim();
    if (!category || props.kind !== "tools") return;
    setToolCategoryOptions((current) => (current.includes(category) ? current : [...current, category].sort()));
  }

  const browserResources = {
    tags: tagList,
    categories: categoryList,
    units: unitList,
    fabricOptions: props.fabricOptions ?? [],
    patternOptions: props.patternOptions ?? [],
    materialOptions: props.materialOptions ?? [],
    colorOptions,
    sourceOptions,
    materialTypeOptions,
    patternTypeOptions,
    toolCategoryOptions
  };

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

      <InventoryBrowserView
        kind={props.kind}
        items={items}
        query={query}
        sort={sort}
        dir={dir}
        view={view}
        filters={filters}
        filterOpen={filterOpen}
        resources={browserResources}
        onQueryChange={(nextQuery) => {
          setQuery(nextQuery);
          debounceRefresh(nextQuery, sort, filters, dir);
        }}
        onSortChange={(nextSort) => {
          setSort(nextSort);
          void refresh(query, nextSort, filters, dir);
        }}
        onDirChange={(nextDir) => {
          setDir(nextDir);
          void refresh(query, sort, filters, nextDir);
        }}
        onFilterOpen={() => setFilterOpen(true)}
        onFilterClose={() => setFilterOpen(false)}
        onApplyFilters={applyFilters}
        onViewChange={setView}
        onItemClick={(item) => void openSelected(item)}
      />

      {editing ? (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-end overflow-x-hidden bg-black/40 p-0 md:block md:overflow-y-auto md:p-3">
            <Card className="flex max-h-[92dvh] w-full max-w-full flex-col overflow-hidden rounded-b-none rounded-t-2xl p-0 shadow-xl md:mx-auto md:max-w-2xl md:rounded-b-md md:rounded-t-md">
              <form key={`${props.kind}-${editing.id ?? "new"}`} className="flex min-h-0 min-w-0 w-full flex-col overflow-x-hidden" onSubmit={submit}>
                <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain p-4">
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/35 md:hidden" />
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
                    fabricOptions={props.fabricOptions ?? []}
                    patternOptions={props.patternOptions ?? []}
                    materialOptions={props.materialOptions ?? []}
                    sourceOptions={sourceOptions}
                    fabricSourceOptions={props.fabricSourceOptions ?? []}
                    patternSourceOptions={props.patternSourceOptions ?? []}
                    materialSourceOptions={props.materialSourceOptions ?? []}
                    materialTypeOptions={materialTypeOptions}
                    patternTypeOptions={patternTypeOptions}
                    toolCategoryOptions={toolCategoryOptions}
                    unitSystem={unitSystem}
                    onAddTag={addTag}
                    onAddCategory={(name) => createMeta("categories", name)}
                    onAddUnit={(name) => createMeta("units", name)}
                    onOpenPhoto={openLightbox}
                  />
                </div>
                <div className="flex min-w-0 shrink-0 justify-end gap-2 border-t border-border bg-card px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
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
            fabricOptions={props.fabricOptions ?? []}
            patternOptions={props.patternOptions ?? []}
            materialOptions={props.materialOptions ?? []}
            onEdit={() => openEdit(selected)}
            onDuplicate={props.kind === "projects" ? undefined : () => duplicate(selected)}
            onDelete={() => setConfirmDelete(selected)}
            onClose={() => setSelected(null)}
            onOpenPhoto={openLightbox}
            onUploaded={() => refreshOpenItem(selected.id)}
          />
        </ModalPortal>
      ) : null}

      {lightbox ? (
        <ModalPortal>
          <PhotoLightbox state={lightbox} setState={setLightbox} onClose={() => setLightbox(null)} />
        </ModalPortal>
      ) : null}

      {confirmDelete ? (
        <ModalPortal>
          <ConfirmSheet
            message={t("common.confirmDelete")}
            onCancel={() => setConfirmDelete(null)}
            onConfirm={() => {
              void remove(confirmDelete);
            }}
          />
        </ModalPortal>
      ) : null}

      {toast ? <Toast message={toast} /> : null}

      <Button
        className="fixed bottom-[calc(90px+env(safe-area-inset-bottom))] right-4 h-14 w-14 rounded-full md:hidden"
        size="icon"
        aria-label={t(`${props.kind}.add`)}
        onClick={openCreate}
      >
        <Plus className="h-6 w-6" aria-hidden />
      </Button>
    </main>
  );
}

function InventoryBrowserView({
  kind,
  items,
  query,
  sort,
  dir,
  view,
  filters,
  filterOpen,
  filterPortal = true,
  resources,
  selectedIds = [],
  onQueryChange,
  onSortChange,
  onDirChange,
  onFilterOpen,
  onFilterClose,
  onApplyFilters,
  onViewChange,
  onItemClick
}: {
  kind: Kind;
  items: AnyItem[];
  query: string;
  sort: string;
  dir: "asc" | "desc";
  view: "grid" | "list";
  filters: Filters;
  filterOpen: boolean;
  filterPortal?: boolean;
  resources: BrowserResources;
  selectedIds?: number[];
  onQueryChange: (query: string) => void;
  onSortChange: (sort: string) => void;
  onDirChange: (dir: "asc" | "desc") => void;
  onFilterOpen: () => void;
  onFilterClose: () => void;
  onApplyFilters: (filters: Filters) => void;
  onViewChange: (view: "grid" | "list") => void;
  onItemClick: (item: AnyItem) => void;
}) {
  const t = useTranslations();
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filterDrawer = filterOpen ? (
    <FilterDrawer
      kind={kind}
      filters={filters}
      tags={resources.tags}
      categories={resources.categories}
      units={resources.units}
      fabricOptions={resources.fabricOptions}
      patternOptions={resources.patternOptions}
      materialOptions={resources.materialOptions}
      colorOptions={resources.colorOptions}
      sourceOptions={resources.sourceOptions}
      materialTypeOptions={resources.materialTypeOptions}
      patternTypeOptions={resources.patternTypeOptions}
      toolCategoryOptions={resources.toolCategoryOptions}
      onApply={onApplyFilters}
      onClose={onFilterClose}
    />
  ) : null;
  return (
    <>
      <div className="grid gap-2 md:flex md:flex-wrap md:items-center">
        <label className="relative min-w-0 md:min-w-48 md:flex-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input className="pl-9" placeholder={t("common.search")} value={query} onChange={(event) => onQueryChange(event.target.value)} />
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1 md:overflow-visible md:pb-0">
          <label className="flex h-11 shrink-0 items-center overflow-hidden rounded-md border border-input bg-white shadow-sm">
            <span className="border-r border-border px-3 text-sm font-medium text-muted-foreground">{t("common.sortBy")}</span>
            <Select aria-label={t("common.sort")} value={sort} onChange={(event) => onSortChange(event.target.value)} className="w-44 border-0 shadow-none">
              <option value="created">{t("common.sortCreated")}</option>
              <option value="name">{t("common.sortName")}</option>
              <option value="price">{t("common.sortPrice")}</option>
              {kind === "fabrics" ? (
                <>
                  <option value="unitPriceLength">{t("common.sortUnitPriceLength")}</option>
                  <option value="unitPriceSize">{t("common.sortUnitPriceSize")}</option>
                </>
              ) : (
                <option value="unitPrice">{t("common.sortUnitPrice")}</option>
              )}
              {kind === "fabrics" ? <option value="remainingMetres">{t("common.sortMetersLeft")}</option> : null}
              {kind === "tools" ? <option value="quantity">{t("common.sortQuantity")}</option> : null}
            </Select>
          </label>
          <Select aria-label={t("common.sortDirection")} value={dir} onChange={(event) => onDirChange(event.target.value === "asc" ? "asc" : "desc")} className="w-32 shrink-0">
            <option value="desc">{t("common.desc")}</option>
            <option value="asc">{t("common.asc")}</option>
          </Select>
          <Button className="shrink-0" variant={hasFilters(filters) ? "primary" : "secondary"} onClick={onFilterOpen}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            {t("common.filter")}
          </Button>
          <Button className="shrink-0" variant={view === "grid" ? "primary" : "secondary"} size="icon" aria-label={t("common.grid")} onClick={() => onViewChange("grid")}>
            <Grid2X2 className="h-4 w-4" aria-hidden />
          </Button>
          <Button className="shrink-0" variant={view === "list" ? "primary" : "secondary"} size="icon" aria-label={t("common.list")} onClick={() => onViewChange("list")}>
            <List className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {items.length ? (
        <section className={view === "grid" ? "grid grid-cols-2 gap-3 md:grid-cols-4" : "space-y-2"}>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} kind={kind} view={view} selected={selectedSet.has(item.id)} onClick={() => onItemClick(item)} />
          ))}
        </section>
      ) : (
        <Card className="p-8 text-center">
          <div className="text-4xl" aria-hidden>
            🧵
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{t("common.empty")}</p>
        </Card>
      )}

      {filterPortal ? (filterDrawer ? <ModalPortal>{filterDrawer}</ModalPortal> : null) : filterDrawer}
    </>
  );
}

function ItemCard({
  item,
  kind,
  view,
  selected = false,
  onPhotoClick,
  onClick
}: {
  item: AnyItem;
  kind: Kind;
  view: "grid" | "list";
  selected?: boolean;
  onPhotoClick?: (photos: string[], index: number) => void;
  onClick?: () => void;
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
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter") onClick?.();
      }}
      className={`${view === "grid" ? "relative overflow-hidden" : "relative flex items-center gap-3 p-2"} ${selected ? "ring-2 ring-primary" : ""}`}
    >
      {selected ? (
        <span className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
          <Check className="h-4 w-4" aria-hidden />
        </span>
      ) : null}
      {photo ? (
        <button
          type="button"
          className={view === "grid" ? "relative block aspect-square w-full overflow-hidden bg-muted p-0" : "relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted p-0"}
          tabIndex={onClick || onPhotoClick ? 0 : -1}
          onClick={(event) => {
            event.stopPropagation();
            if (onPhotoClick) onPhotoClick(photos, coverIndex);
            else onClick?.();
          }}
        >
          <img src={`/api/photos/${photo}/thumb`} alt="" className="block h-full w-full object-cover" />
        </button>
      ) : (
        <div className={view === "grid" ? "relative aspect-square bg-muted" : "relative h-16 w-16 shrink-0 rounded-md bg-muted"} />
      )}
      <div className={view === "grid" ? "min-w-0 p-3" : "min-w-0"}>
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
  const units = fabricUnits(props.unitSystem);
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Field name="name" label={t("common.name")} defaultValue={props.item.name} required />
        {props.kind === "fabrics" ? <Field name="quantity" label={t("fabrics.quantity")} type="number" inputMode="numeric" defaultValue={props.item.quantity ?? 1} required /> : null}
        {props.kind === "fabrics" ? <Field name="lengthTotal" label={`${t("fabrics.lengthTotal")} (${units.lengthUnit})`} type="number" inputMode="decimal" step="0.01" defaultValue={props.item.lengthTotal} required /> : null}
        {props.kind === "fabrics" ? <input type="hidden" name="lengthUnit" value={units.lengthUnit} /> : null}
        {props.kind === "fabrics" ? <Field name="width" label={`${t("fabrics.width")} (${units.widthUnit})`} type="number" inputMode="decimal" step="0.01" defaultValue={props.item.width} /> : null}
        {props.kind === "fabrics" ? <input type="hidden" name="widthUnit" value={units.widthUnit} /> : null}
        {props.kind === "fabrics" ? <UnitSelect name="purpose" label={t("fabrics.purpose")} values={fabricPurposeOptions} value={props.item.purpose ?? fabricPurposeOptions[0]} labels={(value) => t(`fabricPurpose.${value}`)} /> : null}
        {props.kind === "fabrics" ? (
          <TextChoiceField
            name="materialType"
            label={t("fabrics.materialType")}
            value={props.item.materialType ?? "other"}
            options={[...new Set([...fabricMaterialTypeDefaults, ...props.materialTypeOptions])]}
            labels={(value) => fabricMaterialTypeLabel(value, t)}
            required
          />
        ) : null}
        {props.kind === "fabrics" || props.kind === "materials" ? <ColorField value={props.item.colors ?? []} /> : null}
        {props.kind === "patterns" ? (
          <TextChoiceField
            name="patternType"
            label={t("patterns.patternType")}
            value={props.item.patternType ?? patternTypeDefaults[0]}
            options={[...new Set([...patternTypeDefaults, ...props.patternTypeOptions])]}
            labels={(value) => patternTypeLabel(value, t)}
            required
          />
        ) : null}
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
        {props.kind === "materials" ? <UnitSelect name="usageStatus" label={t("materials.usageStatus")} values={materialUsageStatusOptions} value={props.item.usageStatus ?? "available"} labels={(value) => t(`materialUsageStatus.${value}`)} /> : null}
        {props.kind === "tools" ? (
          <TextChoiceField
            name="category"
            label={t("tools.category")}
            value={props.item.category ?? "other"}
            options={[...new Set([...toolCategoryDefaults, ...props.toolCategoryOptions])]}
            labels={(value) => toolCategoryLabel(value, t)}
            required
          />
        ) : null}
        {props.kind === "tools" ? <Field name="quantity" label={t("tools.quantity")} type="number" inputMode="numeric" defaultValue={props.item.quantity ?? 1} required /> : null}
        {props.kind === "tools" ? <Field name="brand" label={t("tools.brand")} defaultValue={props.item.brand} /> : null}
        {props.kind === "tools" ? <Field name="model" label={t("tools.model")} defaultValue={props.item.model} /> : null}
        {props.kind === "tools" ? <UnitSelect name="condition" label={t("tools.condition")} values={toolConditionOptions} value={props.item.condition ?? "good"} labels={(value) => t(`toolCondition.${value}`)} /> : null}
        {props.kind === "projects" ? <Field name="quantity" label={t("projects.quantity")} type="number" inputMode="numeric" defaultValue={props.item.quantity ?? 1} required /> : null}
        {props.kind !== "projects" ? <Field name="priceCents" label={t("common.price")} type="number" inputMode="decimal" step="0.01" defaultValue={dollarsFromCents(props.item.priceCents)} /> : null}
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
        <div className="flex min-w-0 gap-2">
          <Input className="min-w-0" value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder={t("common.tags")} />
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

function ProjectLinks(props: {
  item: AnyItem;
  tags: MetaItem[];
  categories: MetaItem[];
  units: MetaItem[];
  fabricOptions: AnyItem[];
  patternOptions: AnyItem[];
  materialOptions: AnyItem[];
  fabricSourceOptions: string[];
  patternSourceOptions: string[];
  materialSourceOptions: string[];
  materialTypeOptions: string[];
  patternTypeOptions: string[];
  onOpenPhoto: (photos: string[], index: number) => void;
  unitSystem: UnitSystem;
}) {
  const t = useTranslations();
  const units = fabricUnits(props.unitSystem);
  const [pickerKind, setPickerKind] = useState<PickerKind | null>(null);
  const [patternIds, setPatternIds] = useState<number[]>(() => props.item.patternIds ?? []);
  const [materialIds, setMaterialIds] = useState<number[]>(() => (props.item.materials ?? []).map((link: AnyItem) => link.materialId));
  const [fabricLinks, setFabricLinks] = useState<Array<{ fabricId: number; lengthUsed: number | string }>>(() => props.item.fabrics ?? []);
  const itemKey = props.item.id ?? "new";

  useEffect(() => {
    setPatternIds(props.item.patternIds ?? []);
    setMaterialIds((props.item.materials ?? []).map((link: AnyItem) => link.materialId));
    setFabricLinks(props.item.fabrics ?? []);
  }, [itemKey]);

  const patternItems = selectedOptionItems(props.patternOptions, patternIds);
  const materialItems = selectedOptionItems(props.materialOptions, materialIds);
  const fabricItems = selectedOptionItems(props.fabricOptions, fabricLinks.map((link) => link.fabricId));
  const pickerResources = (kind: PickerKind): BrowserResources => ({
    tags: props.tags,
    categories: props.categories,
    units: props.units,
    fabricOptions: props.fabricOptions,
    patternOptions: props.patternOptions,
    materialOptions: props.materialOptions,
    colorOptions: collectColors([props.fabricOptions, props.materialOptions]),
    sourceOptions: kind === "fabrics" ? props.fabricSourceOptions : kind === "patterns" ? props.patternSourceOptions : props.materialSourceOptions,
    materialTypeOptions: props.materialTypeOptions,
    patternTypeOptions: props.patternTypeOptions,
    toolCategoryOptions: []
  });

  function toggleId(id: number, setIds: (updater: (current: number[]) => number[]) => void) {
    setIds((current) => (current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id]));
  }

  function toggleFabric(item: AnyItem) {
    setFabricLinks((current) =>
      current.some((link) => link.fabricId === item.id)
        ? current.filter((link) => link.fabricId !== item.id)
        : [...current, { fabricId: item.id, lengthUsed: "" }]
    );
  }

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{t("projects.patterns")}</h3>
          <Button type="button" variant="secondary" size="icon" className="h-8 w-8" aria-label={`${t("common.add")} ${t("projects.patterns")}`} onClick={() => setPickerKind("patterns")}>
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        {patternIds.map((id) => <input key={id} type="hidden" name="patternIds" value={id} />)}
        <SelectedLinkList kind="patterns" items={patternItems} onRemove={(id) => setPatternIds((current) => current.filter((currentId) => currentId !== id))} onOpenPhoto={props.onOpenPhoto} />
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{t("projects.fabrics")}</h3>
          <Button type="button" variant="secondary" size="icon" className="h-8 w-8" aria-label={`${t("common.add")} ${t("projects.fabrics")}`} onClick={() => setPickerKind("fabrics")}>
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        {fabricLinks.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {fabricLinks.map((link) => {
              const item = fabricItems.find((option) => option.id === link.fabricId) ?? { id: link.fabricId, name: String(link.fabricId) };
              return (
                <div key={link.fabricId} className="min-w-0 space-y-2 overflow-hidden rounded-md border border-border p-2">
                  <input type="hidden" name="fabricId" value={link.fabricId} />
                  <SelectedItemCard item={item} kind="fabrics" onRemove={() => setFabricLinks((current) => current.filter((currentLink) => currentLink.fabricId !== link.fabricId))} onOpenPhoto={props.onOpenPhoto} />
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">{`${t("projects.lengthUsed")} (${units.lengthUnit})`}</span>
                    <Input
                      name="lengthUsed"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0.01"
                      required
                      value={link.lengthUsed}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setFabricLinks((current) => current.map((currentLink) => currentLink.fabricId === link.fabricId ? { ...currentLink, lengthUsed: nextValue } : currentLink));
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{t("projects.materials")}</h3>
          <Button type="button" variant="secondary" size="icon" className="h-8 w-8" aria-label={`${t("common.add")} ${t("projects.materials")}`} onClick={() => setPickerKind("materials")}>
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        {materialIds.map((id) => <input key={id} type="hidden" name="materialIds" value={id} />)}
        <SelectedLinkList kind="materials" items={materialItems} onRemove={(id) => setMaterialIds((current) => current.filter((currentId) => currentId !== id))} onOpenPhoto={props.onOpenPhoto} />
      </section>

      {pickerKind ? (
        <ModalPortal>
          <ResourcePicker
            kind={pickerKind}
            title={pickerKind === "fabrics" ? t("projects.fabrics") : pickerKind === "patterns" ? t("projects.patterns") : t("projects.materials")}
            initialItems={pickerKind === "fabrics" ? props.fabricOptions : pickerKind === "patterns" ? props.patternOptions : props.materialOptions}
            selectedIds={pickerKind === "fabrics" ? fabricLinks.map((link) => link.fabricId) : pickerKind === "patterns" ? patternIds : materialIds}
            resources={pickerResources(pickerKind)}
            onItemClick={(item) => {
              if (pickerKind === "fabrics") toggleFabric(item);
              else if (pickerKind === "patterns") toggleId(item.id, setPatternIds);
              else toggleId(item.id, setMaterialIds);
            }}
            onClose={() => setPickerKind(null)}
          />
        </ModalPortal>
      ) : null}
    </div>
  );
}

function SelectedLinkList({
  kind,
  items,
  onRemove,
  onOpenPhoto
}: {
  kind: PickerKind;
  items: AnyItem[];
  onRemove: (id: number) => void;
  onOpenPhoto: (photos: string[], index: number) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {items.map((item) => (
        <SelectedItemCard key={item.id} item={item} kind={kind} onRemove={() => onRemove(item.id)} onOpenPhoto={onOpenPhoto} />
      ))}
    </div>
  );
}

function SelectedItemCard({
  item,
  kind,
  onRemove,
  onOpenPhoto
}: {
  item: AnyItem;
  kind: PickerKind;
  onRemove: () => void;
  onOpenPhoto: (photos: string[], index: number) => void;
}) {
  const t = useTranslations();
  return (
    <div className="relative min-w-0 overflow-hidden">
      <ItemCard item={item} kind={kind} view="list" onPhotoClick={onOpenPhoto} />
      <Button type="button" variant="secondary" size="icon" className="absolute right-2 top-2 z-20 h-8 w-8" aria-label={t("common.delete")} onClick={onRemove}>
        <X className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}

function ResourcePicker({
  kind,
  title,
  initialItems,
  selectedIds,
  resources,
  onItemClick,
  onClose
}: {
  kind: PickerKind;
  title: string;
  initialItems: AnyItem[];
  selectedIds: number[];
  resources: BrowserResources;
  onItemClick: (item: AnyItem) => void;
  onClose: () => void;
}) {
  const t = useTranslations();
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState<Filters>(() => emptyFilters());
  const [filterOpen, setFilterOpen] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshSeqRef = useRef(0);
  const browserResources = {
    ...resources,
    colorOptions: collectColors([resources.colorOptions.map((color) => ({ colors: [color] })), initialItems, items])
  };

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousOverflow;
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (filterOpen) setFilterOpen(false);
      else onClose();
    }
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [filterOpen, onClose]);

  async function refresh(nextQuery = query, nextSort = sort, nextFilters = filters, nextDir = dir) {
    const requestId = ++refreshSeqRef.current;
    const params = buildListParams(nextQuery, nextSort, nextFilters, nextDir);
    const response = await fetch(`/api/${kind}?${params.toString()}`);
    if (!response.ok) return;
    const nextItems = (await response.json()).items;
    if (requestId !== refreshSeqRef.current) return;
    setItems(nextItems);
  }

  function debounceRefresh(nextQuery: string, nextSort = sort, nextFilters = filters, nextDir = dir) {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      void refresh(nextQuery, nextSort, nextFilters, nextDir);
    }, 250);
  }

  function applyFilters(nextFilters: Filters) {
    setFilters(nextFilters);
    void refresh(query, sort, nextFilters, dir);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end overflow-x-hidden bg-black/40 p-0 md:block md:overflow-y-auto md:p-3" role="dialog" aria-modal="true" data-project-picker="true" onClick={onClose}>
      <Card className="flex max-h-[94dvh] w-full max-w-full flex-col overflow-hidden rounded-b-none rounded-t-2xl p-4 shadow-xl md:mx-auto md:h-[calc(100dvh-1.5rem)] md:max-w-5xl md:rounded-b-md md:rounded-t-md" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/35 md:hidden" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button type="button" variant="ghost" size="icon" aria-label={t("common.cancel")} onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain pr-0 md:pr-1">
          <InventoryBrowserView
            kind={kind}
            items={items}
            query={query}
            sort={sort}
            dir={dir}
            view={view}
            filters={filters}
            filterOpen={filterOpen}
            filterPortal={false}
            resources={browserResources}
            selectedIds={selectedIds}
            onQueryChange={(nextQuery) => {
              setQuery(nextQuery);
              debounceRefresh(nextQuery, sort, filters, dir);
            }}
            onSortChange={(nextSort) => {
              setSort(nextSort);
              void refresh(query, nextSort, filters, dir);
            }}
            onDirChange={(nextDir) => {
              setDir(nextDir);
              void refresh(query, sort, filters, nextDir);
            }}
            onFilterOpen={() => setFilterOpen(true)}
            onFilterClose={() => setFilterOpen(false)}
            onApplyFilters={applyFilters}
            onViewChange={setView}
            onItemClick={onItemClick}
          />
        </div>
        <div className="mt-3 flex justify-end border-t border-border pt-3">
          <Button type="button" onClick={onClose}>
            {t("common.apply")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function selectedOptionItems(options: AnyItem[], selectedIds: number[]) {
  const optionMap = new Map(options.map((option) => [option.id, option]));
  return selectedIds.map((id) => optionMap.get(id) ?? { id, name: String(id) });
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
        <div className="flex min-w-0 gap-2">
          <Input className="min-w-0" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={label} />
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
      <div className="flex min-w-0 gap-2">
        <ColorSelect value={presetColor} options={commonColors} placeholder={t("common.selectColor")} onChange={setPresetColor} />
        <Button type="button" variant="secondary" className="min-w-14 whitespace-nowrap px-3" disabled={!presetColor || colors.length >= 5} onClick={addPresetColor}>
          {t("common.add")}
        </Button>
      </div>
      <div className="flex min-w-0 gap-2">
        <Input className="min-w-0" value={customColor} onChange={(event) => setCustomColor(event.target.value)} placeholder={t("common.customColor")} maxLength={30} />
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
  fabricOptions,
  patternOptions,
  materialOptions,
  colorOptions,
  sourceOptions,
  materialTypeOptions,
  patternTypeOptions,
  toolCategoryOptions,
  onApply,
  onClose
}: {
  kind: Kind;
  filters: Filters;
  tags: MetaItem[];
  categories: MetaItem[];
  units: MetaItem[];
  fabricOptions: AnyItem[];
  patternOptions: AnyItem[];
  materialOptions: AnyItem[];
  colorOptions: string[];
  sourceOptions: string[];
  materialTypeOptions: string[];
  patternTypeOptions: string[];
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
    <div className="fixed inset-0 z-[60] flex items-end overflow-x-hidden bg-black/40 p-0 md:block md:p-3" role="dialog" aria-modal="true" onClick={onClose}>
      <Card className="flex max-h-[92dvh] w-full max-w-full flex-col overflow-hidden rounded-b-none rounded-t-2xl p-4 shadow-xl md:ml-auto md:h-full md:max-w-md md:rounded-b-md md:rounded-t-md" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/35 md:hidden" />
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("common.filters")}</h2>
          <Button type="button" variant="ghost" size="icon" aria-label={t("common.cancel")} onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="mt-4 min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain">
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
              <div className="grid gap-2 sm:grid-cols-2">
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

          {kind === "fabrics" ? (
            <div className="grid gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.hasStockLeft} onChange={(event) => update("hasStockLeft", event.target.checked)} />
                <span>{t("fabrics.hasStockLeft")}</span>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t("fabrics.purpose")}</span>
                <Select value={draft.purpose} onChange={(event) => update("purpose", event.target.value)}>
                  <option value="">{t("common.all")}</option>
                  {fabricPurposeOptions.map((purpose) => (
                    <option key={purpose} value={purpose}>
                      {t(`fabricPurpose.${purpose}`)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t("fabrics.materialType")}</span>
                <Select value={draft.materialType} onChange={(event) => update("materialType", event.target.value)}>
                  <option value="">{t("common.all")}</option>
                  {[...new Set([...fabricMaterialTypeDefaults, ...materialTypeOptions])].map((materialType) => (
                    <option key={materialType} value={materialType}>
                      {fabricMaterialTypeLabel(materialType, t)}
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
                  {[...new Set([...patternTypeDefaults, ...patternTypeOptions])].map((patternType) => (
                    <option key={patternType} value={patternType}>
                      {patternTypeLabel(patternType, t)}
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
                      {toolCategoryLabel(category, t)}
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

          {kind === "fabrics" || kind === "materials" || kind === "projects" ? (
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

          {kind !== "projects" && kind !== "tools" && kind !== "materials" ? (
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
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t("materials.usageStatus")}</span>
                <Select value={draft.usageStatus} onChange={(event) => update("usageStatus", event.target.value)}>
                  <option value="">{t("common.all")}</option>
                  {materialUsageStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {t(`materialUsageStatus.${status}`)}
                    </option>
                  ))}
                </Select>
              </label>
              <OptionFilter label={t("materials.category")} value={draft.categoryId} options={categories} onChange={(value) => update("categoryId", value)} />
              <OptionFilter label={t("materials.unit")} value={draft.unitId} options={units} onChange={(value) => update("unitId", value)} />
            </div>
          ) : null}

          {kind === "projects" ? (
            <div className="grid gap-3">
              <OptionFilter label={t("projects.patterns")} value={draft.patternId} options={patternOptions} onChange={(value) => update("patternId", value)} />
              <OptionFilter label={t("projects.fabrics")} value={draft.fabricId} options={fabricOptions} onChange={(value) => update("fabricId", value)} />
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
    <div className="fixed inset-0 z-[80] flex items-end overflow-x-hidden bg-black/40 p-0 md:items-center md:justify-center md:p-3" role="dialog" aria-modal="true" onClick={onCancel}>
      <Card className="w-full max-w-full rounded-b-none rounded-t-2xl p-4 shadow-xl md:max-w-sm md:rounded-b-md md:rounded-t-md" onClick={(event) => event.stopPropagation()}>
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
  fabricOptions,
  patternOptions,
  materialOptions,
  onEdit,
  onDuplicate,
  onDelete,
  onClose,
  onOpenPhoto,
  onUploaded
}: DetailProps) {
  const t = useTranslations();
  return (
    <div className="fixed inset-0 z-[60] flex items-end overflow-x-hidden bg-black/40 p-0 md:items-center md:justify-center md:p-3" role="dialog" aria-modal="true" onClick={onClose}>
      <Card className="max-h-[92dvh] w-full max-w-full overflow-y-auto overflow-x-hidden overscroll-contain rounded-b-none rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl md:max-h-[88dvh] md:max-w-2xl md:rounded-b-md md:rounded-t-md md:pb-4" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/35 md:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-lg font-semibold">{item.name}</h2>
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
        {kind === "projects" ? (
          <ProjectLinkedDetails
            item={item}
            fabricOptions={fabricOptions}
            patternOptions={patternOptions}
            materialOptions={materialOptions}
            onOpenPhoto={onOpenPhoto}
          />
        ) : null}
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {detailRows(kind, item, t).map((row) => (
            <div key={row.label} className="min-w-0 rounded-md bg-muted p-2">
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="break-words">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}

function ProjectLinkedDetails({
  item,
  fabricOptions,
  patternOptions,
  materialOptions,
  onOpenPhoto
}: {
  item: AnyItem;
  fabricOptions: AnyItem[];
  patternOptions: AnyItem[];
  materialOptions: AnyItem[];
  onOpenPhoto: (photos: string[], index: number) => void;
}) {
  const t = useTranslations();
  const patterns = selectedOptionItems(patternOptions, item.patternIds ?? []);
  const fabricLinks = (item.fabrics ?? []) as Array<{ fabricId: number; lengthUsed: number }>;
  const fabrics = selectedOptionItems(fabricOptions, fabricLinks.map((link) => link.fabricId));
  const materials = selectedOptionItems(materialOptions, (item.materials ?? []).map((link: AnyItem) => link.materialId));
  if (!patterns.length && !fabrics.length && !materials.length) return null;
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <LinkedDetailSection title={t("projects.patterns")} kind="patterns" items={patterns} onOpenPhoto={onOpenPhoto} />
      <LinkedDetailSection
        title={t("projects.fabrics")}
        kind="fabrics"
        items={fabrics}
        details={(linkedItem) => {
          const link = fabricLinks.find((itemLink) => itemLink.fabricId === linkedItem.id);
          return link ? `${t("projects.lengthUsed")} ${numberValue(link.lengthUsed)} ${linkedItem.lengthUnit ?? "m"}` : "";
        }}
        onOpenPhoto={onOpenPhoto}
      />
      <LinkedDetailSection title={t("projects.materials")} kind="materials" items={materials} onOpenPhoto={onOpenPhoto} />
    </div>
  );
}

function LinkedDetailSection({
  title,
  kind,
  items,
  details,
  onOpenPhoto
}: {
  title: string;
  kind: PickerKind;
  items: AnyItem[];
  details?: (item: AnyItem) => string;
  onOpenPhoto: (photos: string[], index: number) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="space-y-1">
            <ItemCard item={item} kind={kind} view="list" onPhotoClick={onOpenPhoto} />
            {details ? <p className="text-xs text-muted-foreground">{details(item)}</p> : null}
          </div>
        ))}
      </div>
    </section>
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
    fabricId: "",
    materialId: "",
    category: "",
    condition: "",
    usageStatus: ""
  };
}

function hasFilters(filters: Filters) {
  return (
    filters.tagIds.length > 0 ||
    Boolean(filters.source || filters.purpose || filters.materialType || filters.patternType || filters.difficulty || filters.category || filters.condition || filters.usageStatus || filters.from || filters.to || filters.used || filters.hasStockLeft || filters.color) ||
    Boolean(filters.categoryId || filters.unitId || filters.patternId || filters.fabricId || filters.materialId)
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
  if (filters.fabricId) params.set("fabricId", filters.fabricId);
  if (filters.materialId) params.set("materialId", filters.materialId);
  if (filters.category) params.set("category", filters.category);
  if (filters.condition) params.set("condition", filters.condition);
  if (filters.usageStatus) params.set("used", filters.usageStatus === "used" ? "true" : "false");
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

function patternTypeLabel(value: string, t: ReturnType<typeof useTranslations>) {
  return patternTypeDefaults.includes(value) ? t(`patternType.${value}`) : value;
}

function fabricMaterialTypeLabel(value: string, t: ReturnType<typeof useTranslations>) {
  return fabricMaterialTypeDefaults.includes(value) ? t(`fabricMaterialType.${value}`) : value;
}

function toolCategoryLabel(value: string, t: ReturnType<typeof useTranslations>) {
  return toolCategoryDefaults.includes(value) ? t(`toolCategory.${value}`) : value;
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
  if (kind === "fabrics") {
    return [
      { label: t("fabrics.total"), value: summary.count ?? 0 },
      { label: t("fabrics.cost"), value: money(summary.totalCost) },
      { label: t("fabrics.usedLength"), value: `${numberValue(summary.lengthUsed)} ${summary.lengthUnit ?? "m"}` },
      { label: t("fabrics.remainingLength"), value: `${numberValue(summary.lengthRemaining)} ${summary.lengthUnit ?? "m"}` }
    ];
  }
  if (kind === "projects") {
    return [
      { label: t("projects.total"), value: summary.count ?? 0 },
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
  if (kind === "fabrics") {
    return `${t("common.total")} ${numberValue(item.lengthTotal)} ${item.lengthUnit} / ${t("common.remaining")} ${numberValue(item.lengthRemaining)} ${item.lengthUnit}`;
  }
  if (kind === "patterns") {
    const patternFor = item.patternFor ? patternForLabel(item.patternFor, t) : "";
    return [patternFor, item.size].filter(Boolean).join(" · ") || t("common.details");
  }
  if (kind === "materials") {
    const unit = item.unitName ? ` ${item.unitName}` : "";
    return `${t(`materialUsageStatus.${item.usageStatus ?? "available"}`)} · ${t("common.total")} ${numberValue(item.quantityTotal)}${unit}`;
  }
  if (kind === "tools") return `${item.category ? toolCategoryLabel(item.category, t) : t("common.details")} · ${t("tools.quantity")} ${item.quantity ?? 1}`;
  return [t("projects.produced"), numberValue(item.quantity), item.valueCents ? money(item.valueCents) : ""].filter(Boolean).join(" · ");
}

function unitPriceStat(kind: Kind, item: AnyItem, t: ReturnType<typeof useTranslations>) {
  if (kind === "fabrics" && item.priceCents && item.lengthTotal > 0) {
    const value = fabricUnitPriceLengthValue(item);
    if (value) return `${t("common.unitPrice")} ${value}`;
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

function fabricUnitPriceLengthValue(item: AnyItem) {
  const units = item.lengthUnit === "yd" ? fabricUnits("us") : fabricUnits("metric");
  const length = Number(item.lengthTotal) * Number(item.quantity ?? 1);
  return length > 0 ? `${money(Math.round(item.priceCents / length))}/${units.lengthUnit}` : "";
}

function detailRows(kind: Kind, item: AnyItem, t: ReturnType<typeof useTranslations>) {
  const rows: Array<{ label: string; value: string }> = [];
  const add = (label: string, value?: unknown, formatter?: (value: any) => string) => {
    if (value === null || value === undefined || value === "") return;
    rows.push({ label, value: formatter ? formatter(value) : String(value) });
  };

  if (kind === "fabrics") {
    add(t("fabrics.quantity"), item.quantity);
    add(t("fabrics.purpose"), item.purpose, (value) => t(`fabricPurpose.${value}`));
    add(t("fabrics.materialType"), item.materialType, (value) => fabricMaterialTypeLabel(value, t));
    add(t("fabrics.lengthTotal"), item.lengthTotal, (value) => `${numberValue(value)} ${item.lengthUnit}`);
    add(t("fabrics.lengthRemaining"), item.lengthRemaining, (value) => `${numberValue(value)} ${item.lengthUnit}`);
    add(t("fabrics.width"), item.width, (value) => `${numberValue(value)} ${item.widthUnit ?? ""}`.trim());
    add(t("common.source"), item.source);
    add(t("common.price"), item.priceCents, money);
    add(t("common.unitPrice"), fabricUnitPriceLengthValue(item));
    add(t("common.date"), item.purchasedAt);
  } else if (kind === "patterns") {
    add(t("patterns.patternType"), item.patternType, (value) => patternTypeLabel(value, t));
    add(t("patterns.difficulty"), item.difficulty, (value) => t(`patternDifficulty.${value}`));
    add(t("patterns.patternFor"), item.patternFor, (value) => patternForLabel(value, t));
    add(t("patterns.size"), item.size);
    add(t("patterns.pieces"), item.pieces);
    add(t("common.source"), item.source);
    add(t("common.price"), item.priceCents, money);
    add(t("common.date"), item.purchasedAt);
  } else if (kind === "materials") {
    add(t("materials.usageStatus"), item.usageStatus ?? "available", (value) => t(`materialUsageStatus.${value}`));
    add(t("materials.category"), item.categoryName);
    add(t("materials.unit"), item.unitName);
    add(t("materials.quantityTotal"), item.quantityTotal, numberValue);
    add(t("materials.quantityRemaining"), item.quantityRemaining, numberValue);
    add(t("common.source"), item.source);
    add(t("common.price"), item.priceCents, money);
    add(t("common.date"), item.purchasedAt);
  } else if (kind === "tools") {
    add(t("tools.category"), item.category, (value) => toolCategoryLabel(value, t));
    add(t("tools.quantity"), item.quantity);
    add(t("tools.brand"), item.brand);
    add(t("tools.model"), item.model);
    add(t("tools.condition"), item.condition, (value) => t(`toolCondition.${value}`));
    add(t("common.source"), item.source);
    add(t("common.price"), item.priceCents, money);
    add(t("common.date"), item.purchasedAt);
  } else {
    add(t("projects.quantity"), item.quantity);
    add(t("projects.value"), item.valueCents, money);
    add(t("projects.fabricCost"), item.cost?.fabricCost, money);
  }

  add(t("common.remarks"), item.remarks);
  return rows;
}

function defaultItem(kind: Kind, unitSystem: UnitSystem) {
  const units = fabricUnits(unitSystem);
  if (kind === "fabrics") return { quantity: 1, lengthUnit: units.lengthUnit, widthUnit: units.widthUnit, purpose: "garment", materialType: "other" };
  if (kind === "materials") return { usageStatus: "available" };
  if (kind === "projects") return { quantity: 1 };
  if (kind === "tools") return { quantity: 1, category: "other", condition: "good" };
  return { patternType: "paper", difficulty: "medium" };
}

function formToBody(kind: Kind, form: FormData) {
  const base: Record<string, any> = {
    name: form.get("name"),
    remarks: stringOrNull(form.get("remarks")),
    tagIds: form.getAll("tagIds").map(Number)
  };
  if (kind !== "projects") {
    base.priceCents = centsFromDollars(form.get("priceCents"));
    base.source = stringOrNull(form.get("source"));
    base.purchasedAt = stringOrNull(form.get("purchasedAt"));
  }
  if (kind === "fabrics") {
    return {
      ...base,
      quantity: Number(form.get("quantity") || 1),
      lengthTotal: Number(form.get("lengthTotal")),
      lengthUnit: form.get("lengthUnit"),
      width: numberOrNull(form.get("width")),
      widthUnit: stringOrNull(form.get("widthUnit")),
      purpose: form.get("purpose"),
      materialType: stringOrNull(form.get("materialType")) ?? "other",
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
      usageStatus: form.get("usageStatus") || "available",
      colors: sanitizeColors(form.getAll("colors"))
    };
  }
  if (kind === "tools") {
    return {
      ...base,
      category: stringOrNull(form.get("category")) ?? "other",
      quantity: Number(form.get("quantity") || 1),
      brand: stringOrNull(form.get("brand")),
      model: stringOrNull(form.get("model")),
      condition: form.get("condition") || "good"
    };
  }
  const fabricIds = form.getAll("fabricId");
  const fabricAmounts = form.getAll("lengthUsed");
  const materialIds = form.getAll("materialIds");
  return {
    ...base,
    quantity: Number(form.get("quantity") || 1),
    valueCents: centsFromDollars(form.get("valueCents")),
    patternIds: [...new Set(form.getAll("patternIds").map(Number).filter(Boolean))],
    fabrics: fabricIds
      .map((id, index) => ({ fabricId: Number(id), lengthUsed: Number(fabricAmounts[index]) }))
      .filter((link) => link.fabricId && link.lengthUsed),
    materials: [...new Set(materialIds.map(Number).filter(Boolean))].map((materialId) => ({ materialId }))
  };
}

async function errorMessage(response: Response, t: ReturnType<typeof useTranslations>) {
  try {
    const body = await response.json();
    if (typeof body?.message === "string" && body.message.trim()) return body.message;
  } catch {
    return t("common.error");
  }
  return t("common.error");
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
